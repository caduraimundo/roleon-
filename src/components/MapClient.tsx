'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import BottomNav, { TabId } from './BottomNav'
import { PinSheet, MapHint, RoleonEvent } from './EventBottomSheet'
import AuthSheet from './AuthSheet'
import { supabase } from '../lib/supabase'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const PRIMARY = '#0EA5A0'
const TEXT    = '#1A1A1A'
const DIM     = '#6E6E73'

const OURO_PRETO_CENTER = { lng: -43.5036, lat: -20.3856 }

export default function MapClient() {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const mapCenteredRef = useRef(false)

  const [events, setEvents] = useState<RoleonEvent[]>([])
  const [activePin, setActivePin] = useState<RoleonEvent | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [tab, setTab] = useState<TabId>('explore')
  const [safeTop, setSafeTop] = useState(0)
  const [searchValue, setSearchValue] = useState('')
  const [suggestions, setSuggestions] = useState<{
    places: Array<{ name: string; lat: number; lng: number }>
    events: Array<{ id: string; title: string; lat: number; lng: number }>
  }>({ places: [], events: [] })
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Safe area
  useEffect(() => {
    const el = document.documentElement
    const top = parseInt(getComputedStyle(el).getPropertyValue('--sat') || '0')
    setSafeTop(top || 44)
  }, [])

  // Buscar eventos
  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .then(({ data }) => { if (data) setEvents(data as RoleonEvent[]) })
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [OURO_PRETO_CENTER.lng, OURO_PRETO_CENTER.lat],
      zoom: 14,
      attributionControl: false,
    })

    mapInstanceRef.current = map

    // Geolocalização
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const pos: [number, number] = [coords.longitude, coords.latitude]
        if (!mapCenteredRef.current) {
          map.flyTo({ center: pos, zoom: 14 })
          mapCenteredRef.current = true
        }
        // Marker do usuário
        const el = document.createElement('div')
        el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${PRIMARY};border:2px solid #fff;box-shadow:0 0 0 4px ${PRIMARY}33`
        if (userMarkerRef.current) userMarkerRef.current.remove()
        userMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat(pos)
          .addTo(map)
      }, () => {}, { enableHighAccuracy: true })
    }

    return () => { map.remove(); mapInstanceRef.current = null }
  }, [])

  // Renderizar pins dos eventos
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || events.length === 0) return

    const addMarkers = () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      events.forEach(event => {
        if (!event.location_lat || !event.location_lng) return

        const el = document.createElement('div')
        const price = event.is_free ? 'Grátis' : `R$${Number(event.price).toFixed(0)}`
        el.innerHTML = `
          <div style="
            background:${PRIMARY};color:#fff;
            padding:4px 10px;border-radius:20px;
            font-family:'Noto Sans',sans-serif;font-size:12px;font-weight:700;
            box-shadow:0 2px 8px rgba(0,0,0,0.18);
            cursor:pointer;white-space:nowrap;
          ">${price}</div>
        `
        el.addEventListener('click', () => setActivePin(event))

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([event.location_lng, event.location_lat])
          .addTo(map)

        markersRef.current.push(marker)
      })
    }

    if (map.isStyleLoaded()) {
      addMarkers()
    } else {
      map.once('load', addMarkers)
    }

    return () => { markersRef.current.forEach(m => m.remove()); markersRef.current = [] }
  }, [events])

  // Busca
  const handleSearch = useCallback(async (value: string) => {
    setSearchValue(value)
    if (!value.trim()) {
      setSuggestions({ places: [], events: [] })
      setShowSuggestions(false)
      return
    }

    const eventMatches = events
      .filter(e => e.title.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 3)
      .map(e => ({ id: e.id, title: e.title, lat: e.location_lat, lng: e.location_lng }))

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?country=br&types=place,locality,district&limit=3&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      )
      const data = await res.json()
      const placeMatches = (data.features || []).map((f: any) => ({
        name: f.place_name,
        lat: f.center[1],
        lng: f.center[0],
      }))
      setSuggestions({ places: placeMatches, events: eventMatches })
      setShowSuggestions(placeMatches.length > 0 || eventMatches.length > 0)
    } catch {
      setSuggestions({ places: [], events: eventMatches })
      setShowSuggestions(eventMatches.length > 0)
    }
  }, [events])

  const handleSelectPlace = useCallback((lat: number, lng: number) => {
    mapInstanceRef.current?.flyTo({ center: [lng, lat], zoom: 13 })
    setShowSuggestions(false)
    setSearchValue('')
  }, [])

  const handleSelectEvent = useCallback((event: RoleonEvent) => {
    mapInstanceRef.current?.flyTo({ center: [event.location_lng, event.location_lat], zoom: 16 })
    setActivePin(event)
    setShowSuggestions(false)
    setSearchValue('')
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', fontFamily: "'Noto Sans', sans-serif" }}>
      {/* Mapa */}
      <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Barra de busca */}
      <div style={{ position: 'absolute', top: safeTop + 12, left: 12, right: 12, zIndex: 100 }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', padding: '0 14px', height: 44 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DIM} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={searchValue}
            onChange={e => handleSearch(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Buscar local ou evento"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: TEXT, background: 'transparent', fontFamily: "'Noto Sans', sans-serif" }}
          />
        </div>

        {/* Dropdown de sugestões */}
        {showSuggestions && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', marginTop: 6, overflow: 'hidden' }}>
            {suggestions.events.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: DIM, padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Eventos</div>
                {suggestions.events.map(ev => {
                  const event = events.find(e => e.id === ev.id)
                  return (
                    <div key={ev.id}
                      onPointerDown={() => event && handleSelectEvent(event)}
                      style={{ padding: '10px 16px', fontSize: 14, color: TEXT, cursor: 'pointer', borderBottom: '0.5px solid #F2F2F2' }}>
                      {ev.title}
                    </div>
                  )
                })}
              </>
            )}
            {suggestions.places.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: DIM, padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lugares</div>
                {suggestions.places.map((pl, i) => (
                  <div key={i}
                    onPointerDown={() => handleSelectPlace(pl.lat, pl.lng)}
                    style={{ padding: '10px 16px', fontSize: 14, color: TEXT, cursor: 'pointer', borderBottom: '0.5px solid #F2F2F2' }}>
                    {pl.name}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Botão centralizar */}
      <button
        onClick={() => {
          if (userMarkerRef.current) {
            const lngLat = userMarkerRef.current.getLngLat()
            mapInstanceRef.current?.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 15 })
          }
        }}
        style={{ position: 'absolute', bottom: 100, right: 16, zIndex: 100, width: 44, height: 44, borderRadius: '50%', background: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        </svg>
      </button>

      {/* Hint */}
      <MapHint count={events.length} onFilterPress={() => {}} />

      {/* Bottom sheet do evento */}
      {activePin && (
        <PinSheet
          event={activePin}
          onClose={() => setActivePin(null)}
          onBuy={() => {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (!user) { setShowAuth(true); return }
              router.push(`/checkout/${activePin.id}`)
            })
          }}
        />
      )}

      {/* Auth */}
      {showAuth && <AuthSheet onClose={() => setShowAuth(false)} />}

      {/* Nav */}
      <BottomNav activeTab={tab} onTabChange={(t) => {
        setTab(t)
        if (t === 'tickets') router.push('/ingressos')
        if (t === 'profile') router.push('/perfil')
      }} />
    </div>
  )
}
