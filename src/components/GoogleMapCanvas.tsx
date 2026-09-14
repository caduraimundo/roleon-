'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const OURO_PRETO_CENTER = { lat: -20.3856, lng: -43.5035 }

interface GoogleMapCanvasProps {
  retryKey: number
  onMapReady: (map: google.maps.Map) => void
  onLoadError: () => void
  onUserLocationUpdate: (pos: { lat: number; lng: number }) => void
  onSearchCenterRestore: (pos: { lat: number; lng: number }) => void
}

export default function GoogleMapCanvas({ retryKey, onMapReady, onLoadError, onUserLocationUpdate, onSearchCenterRestore }: GoogleMapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const locationSavedRef = useRef(false)
  const mapCenteredRef = useRef(false)

  // Inicializa o mapa + marcador de localização do usuário
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let cleanupGeo: (() => void) | null = null
    let attempts = 0

    const initMap = () => {
      if (cancelled || !mapRef.current) return
      if (!window.google?.maps?.Map) {
        attempts++
        if (attempts >= 100) {
          onLoadError()
          return
        }
        retryTimer = setTimeout(initMap, 100)
        return
      }

      const createMap = (initialCenter: { lat: number; lng: number }, knownPos?: { lat: number; lng: number }) => {
        if (mapInstanceRef.current) return
        const mapDiv = mapRef.current
        if (!mapDiv || !(mapDiv instanceof HTMLElement)) return
        const map = new google.maps.Map(mapDiv, {
          center: initialCenter, zoom: 15,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
          disableDefaultUI: true, gestureHandling: 'greedy', clickableIcons: false,
        })
        mapInstanceRef.current = map
        google.maps.event.addListenerOnce(map, 'tilesloaded', () => onMapReady(map))

        if (!navigator.geolocation) return

        const dot = document.createElement('div')
        dot.style.cssText = 'position:absolute;pointer-events:none;'
        dot.innerHTML = '<div style="width:14px;height:14px;border-radius:50%;background:#0EA5A0;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28);transform:translate(-50%,-50%);"></div>'

        let userPos: google.maps.LatLng | null = null
        class UserDot extends google.maps.OverlayView {
          onAdd()    { this.getPanes()!.floatPane.appendChild(dot) }
          draw()     { const projection = this.getProjection(); if (!projection || !userPos) return; try { const p = projection.fromLatLngToDivPixel(userPos); if (p) { dot.style.left=`${p.x}px`; dot.style.top=`${p.y}px` } } catch (e) { console.warn('UserDot draw error:', e) } }
          onRemove() { try { dot.parentNode?.removeChild(dot) } catch (e) { /* nó já removido */ } }
        }
        const dotOverlay = new UserDot()

        const placeDot = (lat: number, lng: number) => {
          userPos = new google.maps.LatLng(lat, lng)
          if (!dotOverlay.getMap()) dotOverlay.setMap(map)
          dotOverlay.draw()
        }

        if (knownPos) placeDot(knownPos.lat, knownPos.lng)

        // Busca ativa: garante que o pontinho apareça rápido mesmo sem knownPos,
        // sem atrasar a criação do mapa em si.
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            onUserLocationUpdate({ lat: coords.latitude, lng: coords.longitude })
            placeDot(coords.latitude, coords.longitude)
          },
          () => {},
          { enableHighAccuracy: true, timeout: 2000 }
        )

        const watchId = navigator.geolocation.watchPosition(
          ({ coords }) => {
            try {
              onUserLocationUpdate({ lat: coords.latitude, lng: coords.longitude })
              // Correção de última instância: se por algum motivo o mapa ainda não foi
              // centralizado na posição real do usuário (ex: caiu no fallback de Ouro
              // Preto e nenhuma resposta de geolocalização chegou a tempo antes),
              // corrige aqui com panTo suave assim que uma posição real aparecer.
              // Isso é intencional - garante que o mapa eventualmente sempre para no
              // lugar certo, mesmo em conexões ruins ou demora grande do usuário para
              // decidir a permissão. Não é o bug antigo do pulo abrupto (esse já foi
              // corrigido separadamente).
              if (!mapCenteredRef.current && mapInstanceRef.current) {
                mapInstanceRef.current.panTo(new google.maps.LatLng(coords.latitude, coords.longitude))
                mapCenteredRef.current = true
              }
              if (!locationSavedRef.current) {
                locationSavedRef.current = true
                supabase.auth.getSession().then(({ data: { session } }) => {
                  fetch('/api/profile/update-location', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
                    },
                    body: JSON.stringify({ lat: coords.latitude, lng: coords.longitude }),
                  }).catch(() => {})
                })
              }
              placeDot(coords.latitude, coords.longitude)
            } catch (e) {
              console.warn('Geolocation error:', e)
            }
          },
          () => {},
          { enableHighAccuracy: true },
        )

        cleanupGeo = () => {
          navigator.geolocation.clearWatch(watchId)
          dotOverlay.setMap(null)
        }
      }

      const savedMap = (() => {
        try {
          const s = sessionStorage.getItem('map-restore')
          if (s) { sessionStorage.removeItem('map-restore'); return JSON.parse(s) }
          const ls = localStorage.getItem('map-position')
          if (ls) {
            const parsed = JSON.parse(ls)
            const age = Date.now() - (parsed.savedAt ?? 0)
            if (age < 15 * 60 * 1000) return parsed
            localStorage.removeItem('map-position')
          }
        } catch {}
        return null
      })()
      if (savedMap) {
        mapCenteredRef.current = true
        if (savedMap.searchCenterLat != null && savedMap.searchCenterLng != null) {
          onSearchCenterRestore({ lat: savedMap.searchCenterLat, lng: savedMap.searchCenterLng })
        }
        createMap({ lat: savedMap.lat, lng: savedMap.lng })
        setTimeout(() => { mapInstanceRef.current?.setZoom(savedMap.zoom) }, 100)
        return
      }

      if (navigator.geolocation) {
        const startGeolocation = (timeoutMs: number) => {
          const timeout = setTimeout(() => createMap(OURO_PRETO_CENTER), timeoutMs)
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
              clearTimeout(timeout)
              onUserLocationUpdate({ lat: coords.latitude, lng: coords.longitude })
              const latLng = { lat: coords.latitude, lng: coords.longitude }
              // Se o mapa já foi criado (ex: caiu no fallback de Ouro Preto por timeout
              // e essa resposta chegou depois), não recriar do zero - só corrigir a
              // posição do mapa existente com panTo suave. Recriar duplicaria o
              // watchPosition e o overlay do pontinho de localização.
              if (mapInstanceRef.current) {
                mapCenteredRef.current = true
                mapInstanceRef.current.panTo(new google.maps.LatLng(coords.latitude, coords.longitude))
              } else {
                mapCenteredRef.current = true
                createMap(latLng, latLng)
              }
            },
            () => {
              clearTimeout(timeout)
              createMap(OURO_PRETO_CENTER)
            },
            { enableHighAccuracy: false, timeout: timeoutMs }
          )
        }

        if (navigator.permissions?.query) {
          navigator.permissions.query({ name: 'geolocation' as PermissionName })
            .then((status) => {
              if (cancelled) return
              startGeolocation(status.state === 'granted' ? 3000 : 8000)
            })
            .catch(() => {
              if (cancelled) return
              startGeolocation(8000)
            })
        } else {
          startGeolocation(8000)
        }
      } else {
        createMap(OURO_PRETO_CENTER)
      }
    }
    initMap()
    return () => {
      cancelled = true
      if (retryTimer !== null) clearTimeout(retryTimer)
      if (cleanupGeo) cleanupGeo()
    }
  }, [retryKey])

  return <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
}
