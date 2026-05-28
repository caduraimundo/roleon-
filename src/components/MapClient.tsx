'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import BottomNav, { TabId } from './BottomNav'
import { PinSheet, MapHint, RoleonEvent } from './EventBottomSheet'
import AuthSheet from './AuthSheet'
import FilterBar from './FilterBar'
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
  const [tab, setTab] = useState<TabId>('explorar')
  const [safeTop, setSafeTop] = useState(0)
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
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

  // Buscar eventos — mapeia location_lat/location_lng → lat/lng do RoleonEvent
  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, description, price, is_free, location_lat, location_lng, location_name, event_date, genre, cover_image, status')
      .eq('status', 'active')
      .then(({ data }) => {
        if (!data) return
        setEvents(data.map((row: any) => {
          const d = row.event_date ? new Date(row.event_date) : null
          return {
            id:           String(row.id),
            title:        row.title ?? '',
            genre:        row.genre ?? '',
            price:        row.is_free ? 0 : (row.price ?? 0),
            fee:          0,
            likes:        0,
            lat:          row.location_lat ?? 0,
            lng:          row.location_lng ?? 0,
            venue:        row.location_name ?? '',
            neighborhood: '',
            address:      row.location_name ?? '',
            date:         d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '',
            time:         d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            color:        '#0EA5A0',
            description:  row.description ?? '',
          } as RoleonEvent
        }))
      })
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
        if (!mapInstanceRef.current) return
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

  // Renderizar pins dos eventos (com filtro de gênero)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || events.length === 0) return

    const addMarkers = () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      const filtered = activeGenre
        ? events.filter(e => e.genre?.toLowerCase() === activeGenre.toLowerCase())
        : events

      filtered.forEach(event => {
        if (!event.lat || !event.lng) return

        const el = document.createElement('div')
        const price = event.price === 0 ? 'Grátis' : `R$${Number(event.price).toFixed(0)}`
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
          .setLngLat([event.lng, event.lat])
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
  }, [events, activeGenre])

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
      .map(e => ({ id: e.id, title: e.title, lat: e.lat, lng: e.lng }))

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
    mapInstanceRef.current?.flyTo({ center: [event.lng, event.lat], zoom: 16 })
    setActivePin(event)
    setShowSuggestions(false)
    setSearchValue('')
  }, [])

  const filteredCount = activeGenre
    ? events.filter(e => e.genre?.toLowerCase() === activeGenre.toLowerCase()).length
    : events.length

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', fontFamily: "'Noto Sans', sans-serif" }}>
      {/* Mapa */}
      <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Barra de busca + FilterBar */}
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

        {/* FilterBar */}
        <div style={{ marginTop: 8, marginLeft: -12, marginRight: -12 }}>
          <FilterBar activeGenre={activeGenre} onGenreChange={setActiveGenre} />
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
      {!activePin && <MapHint count={filteredCount} bottomNavHeight={64} />}

      {/* Bottom sheet do evento */}
      {activePin && (
        <PinSheet
          event={activePin}
          onClose={() => setActivePin(null)}
          onViewDetail={() => {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (!user) { setShowAuth(true); return }
              router.push(`/checkout/${activePin!.id}`)
            })
          }}
          bottomNavHeight={64}
        />
      )}

      {/* Auth */}
      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* Nav */}
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
        <BottomNav activeTab={tab} onTabChange={(t) => {
          setTab(t)
          if (t === 'ingressos') router.push('/ingressos')
          if (t === 'perfil') router.push('/perfil')
        }} />
      </div>
    </div>
  )
}
