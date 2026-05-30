'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import BottomNav, { TabId } from './BottomNav'
import { PinSheet, MapHint, RoleonEvent } from './EventBottomSheet'
import AuthSheet from './AuthSheet'
import { supabase } from '../lib/supabase'

const PRIMARY = '#0EA5A0'
const TEXT    = '#1A1A1A'
const DIM     = '#6E6E73'
const BORDER  = '#EFEFEF'

const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',            stylers: [{ color: '#EAE7DF' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#9C9582' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#F1EEE6' }] },
  { featureType: 'road',          elementType: 'geometry',        stylers: [{ color: '#FBFAF6' }] },
  { featureType: 'road.arterial', elementType: 'geometry',        stylers: [{ color: '#F7F5EF' }] },
  { featureType: 'road.highway',  elementType: 'geometry',        stylers: [{ color: '#EEEBE1' }] },
  { featureType: 'road',          elementType: 'geometry.stroke', stylers: [{ color: '#E5E0D5' }] },
  { featureType: 'road.local',    elementType: 'labels.text.fill',stylers: [{ color: '#9C9582' }] },
  { featureType: 'landscape.natural', elementType: 'geometry',    stylers: [{ color: '#D6E1CB' }] },
  { featureType: 'poi',           elementType: 'geometry',        stylers: [{ color: '#DFE8D8' }] },
  { featureType: 'poi.park',      elementType: 'geometry.fill',   stylers: [{ color: '#D0DEC6' }] },
  { featureType: 'poi',           elementType: 'labels.text.fill',stylers: [{ color: '#877B5A' }] },
  { featureType: 'poi',           elementType: 'labels.icon',     stylers: [{ visibility: 'off' }] },
  { featureType: 'water',         elementType: 'geometry.fill',   stylers: [{ color: '#C9D9DC' }] },
  { featureType: 'water',         elementType: 'labels.text.fill',stylers: [{ color: '#7E9B9E' }] },
  { featureType: 'transit',       elementType: 'labels.icon',     stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative',elementType: 'geometry.stroke', stylers: [{ color: '#C9B99A' }] },
  { featureType: 'road.highway',  elementType: 'labels',          stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'labels.icon',     stylers: [{ visibility: 'off' }] },
  { featureType: 'road',          elementType: 'labels.icon',     stylers: [{ visibility: 'off' }] },
]

const OURO_PRETO_CENTER = { lat: -20.3856, lng: -43.5035 }

// ── Ícones ───────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function IconSliders() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M6 10h8M9 15h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function IconLocate() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M10 1.5v2.5M10 16v2.5M1.5 10h2.5M16 10h2.5"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" opacity="0.4"/>
    </svg>
  )
}

const DISTANCES = [10, 25, 50, 100]

// ── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ safeTop, hasActiveFilter, onFilterOpen, distance, setDistance, searchValue, onSearchChange }: {
  safeTop: number
  hasActiveFilter: boolean
  onFilterOpen: () => void
  distance: number
  setDistance: (d: number) => void
  searchValue: string
  onSearchChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      padding: `${safeTop + 4}px 16px 10px`,
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#fff', borderRadius: 16,
        padding: '10px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04)',
        pointerEvents: 'auto',
      }}>
        <span style={{ color: DIM, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <IconSearch />
        </span>
        <input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Buscar local ou evento..."
          style={{
            flex: 1, minWidth: 0, fontSize: 16, fontWeight: 500, color: TEXT,
            fontFamily: "'Noto Sans', sans-serif",
            border: 'none', outline: 'none', background: 'transparent',
            padding: 0, margin: 0,
          }}
        />
        {/* divisor */}
        <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.10)', flexShrink: 0 }} />

        {/* chip distância */}
        <button
          onClick={() => setOpen(s => !s)}
          style={{
            marginLeft: 4, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 10px',
            border: 0, borderRadius: 999, cursor: 'pointer',
            background: 'transparent',
            color: TEXT,
            fontFamily: "'Noto Sans', sans-serif",
            fontSize: 14.5, fontWeight: 500,
            lineHeight: 1,
          }}>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none"
            style={{ color: PRIMARY, flexShrink: 0, display: 'block' }}>
            <path d="M7 1.5c2.5 0 4.5 2 4.5 4.5 0 3.3-4.5 6.5-4.5 6.5S2.5 9.3 2.5 6c0-2.5 2-4.5 4.5-4.5z" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span>{distance}km</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ color: DIM, marginLeft: -1, flexShrink: 0 }}>
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* dropdown */}
        {open && (
          <>
            <div onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 22 }} />
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              background: '#fff', borderRadius: 12,
              boxShadow: '0 10px 28px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(0,0,0,0.05)',
              padding: 6, zIndex: 25, minWidth: 160,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                textTransform: 'uppercase', color: '#9E9EA7',
                padding: '8px 10px 4px',
              }}>Distância máxima</div>
              {DISTANCES.map(d => {
                const isActive = distance === d
                return (
                  <button key={d}
                    onClick={() => { setDistance(d); setOpen(false) }}
                    style={{
                      display: 'block', width: '100%',
                      textAlign: 'left', padding: '9px 10px',
                      border: 0, borderRadius: 7,
                      background: isActive ? '#F0FAF9' : 'transparent',
                      color: isActive ? PRIMARY : TEXT,
                      fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                      fontFamily: "'Noto Sans', sans-serif",
                      cursor: 'pointer',
                    }}>
                    {d}km
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Chips de filtro rápido ───────────────────────────────────────────────────

const QUICK_CHIPS = ['Samba/Pagode', 'MPB', 'Rock', 'Funk', 'Sertanejo', 'Forró', 'Rap', 'Eletrônico', 'Piseiro', 'Reggae', 'Indie', 'Axé', 'República']

function ChipBar({ activeChip, onChipChange }: {
  activeChip: string | null
  onChipChange: (chip: string | null) => void
}) {
  return (
    <div style={{
      display: 'flex', gap: 6, overflowX: 'auto',
      padding: '0 16px 4px', scrollbarWidth: 'none',
    }} className="no-scrollbar">
      {QUICK_CHIPS.map((chip) => {
        const active = activeChip === chip
        return (
          <button key={chip} onClick={() => onChipChange(active ? null : chip)} style={{
            flex: '0 0 auto', padding: '7px 13px', borderRadius: 999,
            border: 0, cursor: 'pointer',
            background: active ? TEXT : '#fff',
            color: active ? '#fff' : TEXT,
            fontSize: 13, fontWeight: 500,
            fontFamily: "'Noto Sans', sans-serif",
            whiteSpace: 'nowrap',
            boxShadow: active ? 'none' : '0 2px 6px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.04)',
            lineHeight: 1,
          }}>
            {chip}
          </button>
        )
      })}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}`}</style>
    </div>
  )
}

// ── Filter Sheet ─────────────────────────────────────────────────────────────

const CATEGORIAS  = ['Samba/Pagode', 'MPB', 'Rock', 'Funk', 'Sertanejo', 'Forró', 'Rap', 'Eletrônico', 'Piseiro', 'Reggae', 'Axé', 'República']
const PRECOS      = ['Grátis', 'Até R$50', 'Até R$100']
const DATE_CHIPS  = ['Hoje', 'Amanhã', 'Este fim de semana', 'Este mês']

function FilterChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      border: `1.4px solid ${active ? PRIMARY : '#E0E0E0'}`,
      background: active ? '#E6F7F6' : '#fff',
      color: active ? PRIMARY : '#404040',
      padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
      fontSize: 13.5, fontWeight: 500, fontFamily: "'Noto Sans', sans-serif",
      whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function FilterSheet({ onClose, bottomNavHeight, onApply, initial }: {
  onClose: () => void
  bottomNavHeight: number
  onApply: (genres: string[], date: string | null, price: string | null, distance: number) => void
  initial: { genres: string[]; when: string | null; price: string | null; distance: number }
}) {
  const [genres,        setGenres]        = useState<Set<string>>(new Set(initial.genres))
  const [selectedDate,  setSelectedDate]  = useState<string | null>(initial.when)
  const [preco,         setPreco]         = useState<string | null>(initial.price)
  const [localDistance, setLocalDistance] = useState(initial.distance)

  const toggleGenre = (g: string) =>
    setGenres(prev => { const s = new Set(prev); s.has(g) ? s.delete(g) : s.add(g); return s })

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 240,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'flex-end',
      }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%',
        background: '#fff',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        animation: 'fsUp 280ms cubic-bezier(.2,.9,.3,1)',
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        <style>{`@keyframes fsUp { from { transform: translateY(100%); } to { transform: none; } }`}</style>

        {/* Grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: '#D6D6D6' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 20px 16px', borderBottom: `0.5px solid ${BORDER}`, flexShrink: 0,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Filtros</div>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: DIM }}>
            <IconClose />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Categoria */}
          <div style={{ padding: '18px 20px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
              Categoria
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIAS.map((c) => (
                <button key={c} onClick={() => toggleGenre(c)} style={{
                  border: `1.4px solid ${genres.has(c) ? PRIMARY : '#E0E0E0'}`,
                  background: genres.has(c) ? '#E6F7F6' : '#fff',
                  color: genres.has(c) ? PRIMARY : '#404040',
                  padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 500, fontFamily: "'Noto Sans', sans-serif",
                }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Quando */}
          <div style={{ padding: '18px 20px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
              Quando
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DATE_CHIPS.map((d) => (
                <FilterChip
                  key={d}
                  label={d}
                  active={selectedDate === d}
                  onToggle={() => setSelectedDate(selectedDate === d ? null : d)}
                />
              ))}
            </div>
          </div>

          {/* Preço */}
          <div style={{ padding: '18px 20px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
              Preço
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRECOS.map((p) => (
                <button key={p} onClick={() => setPreco(preco === p ? null : p)} style={{
                  border: `1.4px solid ${preco === p ? PRIMARY : '#E0E0E0'}`,
                  background: preco === p ? '#E6F7F6' : '#fff',
                  color: preco === p ? PRIMARY : '#404040',
                  padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 500, fontFamily: "'Noto Sans', sans-serif",
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Distância */}
          <div style={{ padding: '18px 20px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
              Distância
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DISTANCES.map(d => (
                <button key={d} onClick={() => setLocalDistance(d)} style={{
                  border: `1.4px solid ${localDistance === d ? PRIMARY : '#E0E0E0'}`,
                  background: localDistance === d ? '#E6F7F6' : '#fff',
                  color: localDistance === d ? PRIMARY : '#404040',
                  padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 500, fontFamily: "'Noto Sans', sans-serif",
                }}>
                  {d}km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer fixo */}
        <div style={{
          flexShrink: 0,
          padding: '20px 20px 28px',
          borderTop: `0.5px solid ${BORDER}`,
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={() => { setGenres(new Set()); setSelectedDate(null); setPreco(null); setLocalDistance(10) }}
            style={{
              flex: 1, background: '#F5F5F5', color: TEXT,
              border: 0, cursor: 'pointer', padding: '14px 18px', borderRadius: 12,
              fontSize: 15, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif",
            }}
          >
            Limpar
          </button>
          <button
            onClick={() => { onApply(Array.from(genres), selectedDate, preco, localDistance); onClose() }}
            style={{
              flex: 2, background: PRIMARY, color: '#fff',
              border: 0, cursor: 'pointer', padding: '14px 18px', borderRadius: 12,
              fontSize: 15, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif",
              boxShadow: '0 6px 16px rgba(14,165,160,0.25)',
            }}
          >
            Aplicar filtros
          </button>
        </div>
      </div>
      </div>
    </>
  )
}

// ── Helpers de data ──────────────────────────────────────────────────────────

function getDateRange(filter: string | null): { gte?: string; lte?: string } {
  if (!filter) return {}

  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const MS_DAY = 24 * 60 * 60 * 1000

  const endOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  if (filter === 'Hoje') {
    return { gte: today.toISOString(), lte: endOf(today).toISOString() }
  }

  if (filter === 'Amanhã') {
    const tomorrow = new Date(today.getTime() + MS_DAY)
    return { gte: tomorrow.toISOString(), lte: endOf(tomorrow).toISOString() }
  }

  if (filter === 'Este fim de semana') {
    // Domingo = 0, …, Sábado = 6
    const dow = today.getDay()
    // Dias até o próximo domingo (inclusive hoje se for domingo)
    const daysToSun = dow === 0 ? 0 : 7 - dow
    const sunday    = new Date(today.getTime() + daysToSun * MS_DAY)
    const friday    = new Date(sunday.getTime() - 2 * MS_DAY)
    const fridayStart = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate(), 18, 0, 0)
    const start = fridayStart < now ? now : fridayStart
    return { gte: start.toISOString(), lte: endOf(sunday).toISOString() }
  }

  if (filter === 'Esta semana') {
    const dow = today.getDay()
    const daysToSun = dow === 0 ? 0 : 7 - dow
    const sunday = new Date(today.getTime() + daysToSun * MS_DAY)
    return { gte: today.toISOString(), lte: endOf(sunday).toISOString() }
  }

  return {}
}

// ── Haversine ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── MapClient (componente principal exportado) ───────────────────────────────

const GENRE_COLORS: Record<string, string> = {
  'Samba/Pagode': '#C8956C', 'MPB': '#7C9E87', 'Rock': '#7B7FA8',
  'Funk': '#C97B8A', 'Sertanejo': '#C4A35A', 'Forró': '#D4845A',
  'Rap': '#6E7D8C', 'Eletrônico': '#6B8FBF', 'Piseiro': '#C97B72',
  'Reggae': '#7CA87C', 'Indie': '#9E8AB4', 'Axé': '#D4A644', 'República': '#A07850',
}

interface MapClientProps {
  onEventSelect?: (event: RoleonEvent) => void
  bottomNavHeight?: number
}

export default function MapClient({ onEventSelect, bottomNavHeight = 70 }: MapClientProps) {
  const router         = useRouter()
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const overlayRefs    = useRef<Map<string, { overlay: any; container: HTMLDivElement }>>(new Map())
  const markerRefs     = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
  const clustererRef   = useRef<MarkerClusterer | null>(null)
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const locationSavedRef = useRef(false)
  const mapCenteredRef = useRef(false)

  const [events,          setEvents]          = useState<RoleonEvent[]>([])
  const [loading,         setLoading]         = useState(true)
  const [authed,          setAuthed]          = useState(false)
  const [userId,          setUserId]          = useState<string | null>(null)
  const [showAuth,        setShowAuth]        = useState(false)
  const [activePin,       setActivePin]       = useState<string | null>(null)
  const [nearbyExpanded,  setNearbyExpanded]  = useState(false)
  const [activeChip,      setActiveChip]      = useState<string | null>(null)
  const [activeTab,       setActiveTab]       = useState<TabId>('explorar')
  const [showFilter,      setShowFilter]      = useState(false)
  const [filterGenres,    setFilterGenres]    = useState<string[]>([])
  const [filterDate,      setFilterDate]      = useState<string | null>(null)
  const [filterPreco,     setFilterPreco]     = useState<string | null>(null)
  const [distance,        setDistance]        = useState(10)
  const [searchValue,     setSearchValue]     = useState('')
  const [userLocation,    setUserLocation]    = useState<{ lat: number; lng: number } | null>(null)
  const [searchCenter,    setSearchCenter]    = useState<{ lat: number; lng: number } | null>(null)
  const [safeTop,         setSafeTop]         = useState(56)
  const [suggestions, setSuggestions] = useState<{
    places: Array<{ description: string; place_id: string }>
    events: Array<{ id: string; title: string; lat: number; lng: number }>
  }>({ places: [], events: [] })
  const [showSuggestions, setShowSuggestions] = useState(false)


  useEffect(() => {
    setLoading(true)
    supabase
      .from('events')
      .select('*, ticket_types(id, quantity, quantity_sold)')
      .eq('status', 'active')
      .gte('event_date', new Date().toISOString())
      .then(({ data, error }) => {
        if (error) {
          console.log('[MapClient] erro ao buscar eventos:', error.message, error.code)
        }
        if (data) {
          setEvents(data.map((row: Record<string, unknown>) => {
            const d = row.event_date ? new Date(row.event_date as string) : null
            const tts = (row.ticket_types as Array<{ quantity: number | null; quantity_sold: number | null }>) ?? []
            const ttWithLimit = tts.filter(t => t.quantity != null)
            const isSoldOut = ttWithLimit.length > 0 && ttWithLimit.every(t => (t.quantity_sold ?? 0) >= (t.quantity ?? 0))
            return {
              id:           String(row.id),
              title:        (row.title as string) ?? '',
              genre:        (row.genre as string) ?? '',
              price:        row.is_free ? 0 : ((row.price as number) ?? 0),
              fee:          0,
              likes:        0,
              lat:          (row.location_lat as number) ?? 0,
              lng:          (row.location_lng as number) ?? 0,
              venue:        (row.location_name as string) ?? '',
              neighborhood: '',
              address:      (row.location_name as string) ?? '',
              date:         d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '',
              time:         d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
              color:        GENRE_COLORS[(row.genre as string)] ?? '#9E9E9E',
              isSoldOut,
              is_free:      (row.is_free as boolean) ?? false,
              cover_image:  (row.cover_image as string) ?? '',
              event_date:   (row.event_date as string) ?? '',
              location_lat: (row.location_lat as number) ?? 0,
              location_lng: (row.location_lng as number) ?? 0,
            } satisfies RoleonEvent
          }))
        }
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;left:0;top:0;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;'
    document.documentElement.appendChild(el)
    setSafeTop(Math.max(parseFloat(getComputedStyle(el).height) || 0, 20))
    document.documentElement.removeChild(el)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(null),
    )
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
      setUserId(data.session?.user?.id ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
      setUserId(session?.user?.id ?? null)
      if (session) setShowAuth(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleTabChange = (tab: TabId) => {
    if (tab !== 'explorar' && !authed) {
      try { sessionStorage.setItem('auth-redirect-tab', tab) } catch {}
      setShowAuth(true)
      return
    }
    if (tab === 'ingressos') { router.push('/ingressos'); return }
    if (tab === 'perfil') { router.push('/perfil'); return }
    setActiveTab(tab)
  }

  const filteredEvents = events.filter((ev) => {
    if (activeChip === 'Grátis' && ev.price > 0) return false
    if (activeChip && !['Hoje', 'Grátis'].includes(activeChip) &&
        ev.genre.toLowerCase() !== activeChip.toLowerCase()) return false
    if (filterGenres.length > 0) {
      const match = filterGenres.some(g =>
        (ev.genre || '').toLowerCase().includes(g.toLowerCase()) ||
        g.toLowerCase().includes((ev.genre || '').toLowerCase())
      )
      if (!match) return false
    }
    const distCenter = searchCenter ?? userLocation
    if (distCenter && ev.lat && ev.lng) {
      if (haversineKm(distCenter.lat, distCenter.lng, ev.lat, ev.lng) > distance) return false
    }
    if (filterDate) {
      if (!ev.event_date) return false
      const evDate = new Date(ev.event_date.replace(' ', 'T'))
      const range = getDateRange(filterDate)
      if (range) {
        if (range.gte && evDate < new Date(range.gte)) return false
        if (range.lte && evDate > new Date(range.lte)) return false
      }
    }
    if (filterPreco) {
      if (filterPreco === 'Grátis' && ev.price > 0) return false
      if (filterPreco === 'Até R$50' && ev.price > 50) return false
      if (filterPreco === 'Até R$100' && ev.price > 100) return false
    }
    return true
  })

  const activeEvent = filteredEvents.find((e) => e.id === activePin) ?? null
  const hasActiveFilter = filterGenres.length > 0 || !!(filterPreco || filterDate)

  // Inicializa o mapa + marcador de localização do usuário
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const initMap = () => {
      if (cancelled || !mapRef.current) return
      if (!window.google?.maps?.Map) {
        retryTimer = setTimeout(initMap, 100)
        return
      }

      const createMap = (initialCenter: { lat: number; lng: number }, knownPos?: { lat: number; lng: number }) => {
        const mapDiv = mapRef.current
        if (!mapDiv) return
        const map = new google.maps.Map(mapDiv, {
          center: initialCenter, zoom: 15,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
          disableDefaultUI: true, gestureHandling: 'greedy', clickableIcons: false,
        })
        mapInstanceRef.current = map

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

        if (knownPos) {
          userPos = new google.maps.LatLng(knownPos.lat, knownPos.lng)
          dotOverlay.setMap(map)
          dotOverlay.draw()
        }

        const watchId = navigator.geolocation.watchPosition(
          ({ coords }) => {
            try {
              userPos = new google.maps.LatLng(coords.latitude, coords.longitude)
              userLocationRef.current = { lat: coords.latitude, lng: coords.longitude }
              if (!mapCenteredRef.current && mapInstanceRef.current) {
                mapInstanceRef.current.panTo(userPos)
                mapCenteredRef.current = true
              }
              if (!locationSavedRef.current) {
                locationSavedRef.current = true
                fetch('/api/profile/update-location', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ lat: coords.latitude, lng: coords.longitude }),
                }).catch(() => {})
              }
              if (!dotOverlay.getMap()) dotOverlay.setMap(map)
              dotOverlay.draw()
            } catch (e) {
              console.warn('Geolocation error:', e)
            }
          },
          () => {},
          { enableHighAccuracy: true },
        )

        return () => {
          navigator.geolocation.clearWatch(watchId)
          dotOverlay.setMap(null)
        }
      }

      const savedMap = (() => { try { const s = sessionStorage.getItem('map-restore'); if (s) { sessionStorage.removeItem('map-restore'); return JSON.parse(s) } } catch {} return null })()
      if (savedMap) {
        createMap({ lat: savedMap.lat, lng: savedMap.lng })
        setTimeout(() => { mapInstanceRef.current?.setZoom(savedMap.zoom) }, 100)
        mapCenteredRef.current = true
        if (savedMap.searchCenterLat != null && savedMap.searchCenterLng != null) {
          setSearchCenter({ lat: savedMap.searchCenterLat, lng: savedMap.searchCenterLng })
        }
        return
      }

      if (navigator.geolocation) {
        const timeout = setTimeout(() => createMap(OURO_PRETO_CENTER), 3000)
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            clearTimeout(timeout)
            userLocationRef.current = { lat: coords.latitude, lng: coords.longitude }
            mapCenteredRef.current = true
            createMap({ lat: coords.latitude, lng: coords.longitude }, { lat: coords.latitude, lng: coords.longitude })
          },
          () => {
            clearTimeout(timeout)
            createMap(OURO_PRETO_CENTER)
          },
          { enableHighAccuracy: true, timeout: 3000 }
        )
      } else {
        createMap(OURO_PRETO_CENTER)
      }
    }
    initMap()
    return () => {
      cancelled = true
      if (retryTimer !== null) clearTimeout(retryTimer)
    }
  }, [])

  // Renderiza pins
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return

    // Limpa clusterer anterior antes de recriar
    clustererRef.current?.clearMarkers()
    clustererRef.current = null

    // Remove overlays e ghost markers de eventos que saíram da lista
    overlayRefs.current.forEach((_, id) => {
      if (!filteredEvents.find((e) => e.id === id)) {
        overlayRefs.current.get(id)?.overlay.setMap(null)
        overlayRefs.current.delete(id)
        const m = markerRefs.current.get(id); if (m) m.map = null
        markerRefs.current.delete(id)
      }
    })

    const allMarkers: google.maps.marker.AdvancedMarkerElement[] = []

    filteredEvents.forEach((ev) => {
      const position = new google.maps.LatLng(ev.lat, ev.lng)
      const isActive = ev.id === activePin

      if (!overlayRefs.current.has(ev.id)) {
        const container = document.createElement('div')
        container.style.cssText = 'position:absolute;'
        class PinOverlay extends google.maps.OverlayView {
          onAdd()    { this.getPanes()?.overlayMouseTarget.appendChild(container) }
          draw()     { const projection = this.getProjection(); if (!projection) return; const p = projection.fromLatLngToDivPixel(position); if (p) { container.style.left=`${p.x}px`; container.style.top=`${p.y}px` } }
          onRemove() { container.parentNode?.removeChild(container) }
        }
        const overlay = new PinOverlay()
        overlay.setMap(mapInstanceRef.current)
        overlayRefs.current.set(ev.id, { overlay, container })
      }

      const { container } = overlayRefs.current.get(ev.id)!
      const soldOut = !!ev.isSoldOut
      const pinBg = soldOut ? '#6E6E73' : (isActive ? PRIMARY : '#fff')
      const pinText = soldOut ? '#fff' : (isActive ? '#fff' : TEXT)
      const pinShadow = isActive && !soldOut
        ? `0 8px 18px rgba(14,165,160,0.4),0 0 0 1.5px ${PRIMARY}`
        : '0 3px 8px rgba(0,0,0,0.14),0 0 0 1px rgba(0,0,0,0.04)'
      container.innerHTML = `
        <button data-ev="${ev.id}" style="
          transform:translate(-50%,-100%) ${isActive?'scale(1.06)':'scale(1)'};
          transition:transform 280ms cubic-bezier(.2,.9,.3,1.4);
          background:transparent;border:0;padding:0;cursor:pointer;outline:none;
          display:inline-flex;flex-direction:column;align-items:center;">
          <div style="
            background:${pinBg};color:${pinText};
            padding:7px 11px 7px 8px;border-radius:999px;
            font-family:'Noto Sans',sans-serif;font-size:12.5px;font-weight:700;
            display:flex;flex-direction:column;align-items:center;gap:2px;white-space:nowrap;line-height:1;
            box-shadow:${pinShadow};">
            <span>${ev.price === 0 ? 'Grátis' : `R$${ev.price}`}</span>
            ${soldOut ? '<span style="font-size:9px;font-weight:600;letter-spacing:0.3px;">Esgotado</span>' : ''}
          </div>
          <div style="width:8px;height:8px;background:${pinBg};
            transform:rotate(45deg);margin-top:-4px;
            box-shadow:${isActive&&!soldOut?'none':'1.5px 1.5px 3px rgba(0,0,0,0.08)'};"></div>
        </button>`

      const btn = container.querySelector('button')
      if (btn) btn.onclick = () => setActivePin((prev) => (prev === ev.id ? null : ev.id))

      // Ghost marker invisível — só para o MarkerClusterer calcular grupos
      if (!markerRefs.current.has(ev.id)) {
        const ghostDiv = document.createElement('div')
        ghostDiv.style.display = 'none'
        const marker = new google.maps.marker.AdvancedMarkerElement({ position, content: ghostDiv })
        markerRefs.current.set(ev.id, marker)
      }
      allMarkers.push(markerRefs.current.get(ev.id)!)
    })

    // Sincroniza visibilidade das OverlayViews com o estado do clustering
    const syncOverlays = () => {
      markerRefs.current.forEach((marker, id) => {
        const entry = overlayRefs.current.get(id)
        if (!entry) return
        entry.overlay.setMap(marker.map ? mapInstanceRef.current : null)
      })
    }

    const clusterer = new MarkerClusterer({
      map: mapInstanceRef.current,
      markers: allMarkers,
      renderer: {
        render: ({ count, position, markers }) => {
          const total = markers?.length ?? count
          const clusterDiv = document.createElement('div')
          clusterDiv.innerHTML = `<div style="width:40px;height:40px;border-radius:50%;background:#0EA5A0;display:flex;align-items:center;justify-content:center;color:#fff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">${total}</div>`
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: clusterDiv,
            zIndex: 1000,
          })
        },
      },
    })
    clustererRef.current = clusterer
    google.maps.event.addListener(clusterer, 'clusteringend', syncOverlays)

    return () => {
      clustererRef.current?.clearMarkers()
      clustererRef.current = null
    }
  }, [filteredEvents, activePin])

  useEffect(() => {
    if (activePin && !filteredEvents.find((e) => e.id === activePin)) setActivePin(null)
  }, [filteredEvents, activePin])

  const handleSearch = useCallback(async (value: string) => {
    setSearchValue(value)
    if (!value.trim()) {
      setSuggestions({ places: [], events: [] })
      setShowSuggestions(false)
      setSearchCenter(null)
      return
    }
    const distCenter = searchCenter ?? userLocation
    const eventMatches = events
      .filter(e => {
        if (!e.title.toLowerCase().includes(value.toLowerCase())) return false
        if (distCenter && e.lat && e.lng) {
          return haversineKm(distCenter.lat, distCenter.lng, e.lat, e.lng) <= distance
        }
        return true
      })
      .slice(0, 3)
      .map(e => ({ id: e.id, title: e.title, lat: e.lat, lng: e.lng }))

    try {
      const { AutocompleteSuggestion } = await (window as any).google.maps.importLibrary('places')
      const { suggestions: placeSuggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: value,
        includedPrimaryTypes: ['locality', 'administrative_area_level_2'],
        includedRegionCodes: ['br'],
      })
      const placeMatches = placeSuggestions.slice(0, 3).map((s: any) => ({
        description: s.placePrediction.text.toString(),
        place_id: s.placePrediction.placeId,
      }))
      setSuggestions({ places: placeMatches, events: eventMatches })
      setShowSuggestions(placeMatches.length > 0 || eventMatches.length > 0)
    } catch {
      setSuggestions({ places: [], events: eventMatches })
      setShowSuggestions(eventMatches.length > 0)
    }
  }, [events, searchCenter, userLocation, distance])

  const handleSelectPlace = useCallback(async (placeId: string) => {
    try {
      const { Place } = await (window as any).google.maps.importLibrary('places')
      const place = new Place({ id: placeId })
      await place.fetchFields({ fields: ['location'] })
      if (place.location) {
        mapInstanceRef.current?.panTo(place.location)
        mapInstanceRef.current?.setZoom(14)
        setSearchCenter({ lat: place.location.lat(), lng: place.location.lng() })
      }
    } catch {}
    setShowSuggestions(false)
    setSearchValue('')
  }, [])

  const handleSelectEvent = useCallback((eventId: string, lat: number, lng: number) => {
    mapInstanceRef.current?.panTo({ lat, lng })
    mapInstanceRef.current?.setZoom(16)
    setActivePin(eventId)
    setShowSuggestions(false)
    setSearchValue('')
  }, [events])

  const handleViewDetail = useCallback(() => {
    if (!activeEvent) return
    try { sessionStorage.setItem(`evento-${activeEvent.id}`, JSON.stringify(activeEvent)) } catch {}
    if (onEventSelect) onEventSelect(activeEvent)
    try {
      const center = mapInstanceRef.current?.getCenter()
      const zoom = mapInstanceRef.current?.getZoom()
      if (center) sessionStorage.setItem('map-restore', JSON.stringify({
        lat: center.lat(), lng: center.lng(), zoom: zoom ?? 15,
        searchCenterLat: searchCenter?.lat ?? null,
        searchCenterLng: searchCenter?.lng ?? null,
      }))
    } catch {}
    router.push(`/evento/${activeEvent.id}`)
  }, [activeEvent, onEventSelect, router])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#F9F9F9', overflow: 'hidden' }}>

      {/* Mapa */}
      <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Controles do topo: search bar + chips */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <SearchBar safeTop={safeTop} hasActiveFilter={hasActiveFilter} onFilterOpen={() => setShowFilter(true)} distance={distance} setDistance={setDistance} searchValue={searchValue} onSearchChange={handleSearch} />
        </div>
        {showSuggestions && (
          <div style={{
            position: 'absolute',
            top: safeTop + 60,
            left: 12, right: 12,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            zIndex: 1000,
            pointerEvents: 'auto',
            overflow: 'hidden',
            fontFamily: "'Noto Sans', sans-serif",
          }}>
            {suggestions.events.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6E6E73', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Eventos</div>
                {suggestions.events.map(ev => (
                  <div key={ev.id}
                    onClick={() => handleSelectEvent(ev.id, ev.lat, ev.lng)}
                    onPointerDown={() => handleSelectEvent(ev.id, ev.lat, ev.lng)}
                    style={{ padding: '10px 16px', fontSize: 14, color: '#1A1A1A', cursor: 'pointer', borderBottom: '0.5px solid #F2F2F2' }}>
                    {ev.title}
                  </div>
                ))}
              </>
            )}
            {suggestions.places.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6E6E73', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lugares</div>
                {suggestions.places.map(pl => (
                  <div key={pl.place_id}
                    onClick={() => handleSelectPlace(pl.place_id)}
                    onPointerDown={() => handleSelectPlace(pl.place_id)}
                    style={{ padding: '10px 16px', fontSize: 14, color: '#1A1A1A', cursor: 'pointer', borderBottom: '0.5px solid #F2F2F2' }}>
                    {pl.description}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* FABs: filtros + localização */}
      {!activePin && !nearbyExpanded && (
        <div style={{
          position: 'absolute', right: 14,
          bottom: `calc(${bottomNavHeight + 95}px + env(safe-area-inset-bottom, 0px))`,
          display: 'flex', flexDirection: 'column', gap: 8,
          zIndex: 18,
        }}>
          {/* FAB filtros */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFilter(true)}
              aria-label="Filtros"
              style={{
                width: 42, height: 42, borderRadius: 999,
                background: '#fff', border: 0, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: TEXT,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M3 6h7M14 6h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <circle cx="12" cy="6" r="2" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M3 14h3M10 14h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <circle cx="8" cy="14" r="2" stroke="currentColor" strokeWidth="1.7"/>
              </svg>
            </button>
            {hasActiveFilter && (
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 18, height: 18, borderRadius: 999,
                background: PRIMARY, color: '#fff',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Noto Sans', sans-serif",
                pointerEvents: 'none',
              }}>
                {filterGenres.length + (filterDate ? 1 : 0) + (filterPreco ? 1 : 0)}
              </div>
            )}
          </div>

          {/* FAB localização */}
          <button
            onClick={() => {
              if (userLocationRef.current) {
                mapInstanceRef.current?.panTo(userLocationRef.current)
              } else {
                navigator.geolocation?.getCurrentPosition((p) =>
                  mapInstanceRef.current?.panTo({ lat: p.coords.latitude, lng: p.coords.longitude })
                )
              }
            }}
            aria-label="Minha localização"
            style={{
              width: 42, height: 42, borderRadius: 999,
              background: '#fff', border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: TEXT,
              boxShadow: '0 6px 16px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.04)',
            }}
          >
            <IconLocate />
          </button>
        </div>
      )}

      {/* Card de evento ou hint */}
      {activeEvent ? (
        <PinSheet event={activeEvent} onClose={() => setActivePin(null)} onViewDetail={handleViewDetail} bottomNavHeight={bottomNavHeight} userLocation={userLocation} />
      ) : loading ? (
        <div style={{
          position: 'absolute', left: 16, right: 16, bottom: bottomNavHeight + 8,
          background: '#ffffff', borderRadius: 14,
          padding: '11px 14px',
          boxShadow: '0 10px 28px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', gap: 10,
          zIndex: 12, fontFamily: "'Noto Sans', sans-serif",
          fontSize: 13, fontWeight: 600, color: '#6E6E73',
        }}>
          Carregando rolês...
        </div>
      ) : (
        <MapHint
            count={filteredEvents.length}
            bottomNavHeight={bottomNavHeight}
            events={filteredEvents}
            userLocation={userLocation}
            onEventSelect={(id) => {
              const ev = filteredEvents.find(e => e.id === id)
              if (ev) {
                setActivePin(id)
                if (ev.lat && ev.lng) {
                  mapInstanceRef.current?.panTo({ lat: ev.lat, lng: ev.lng })
                  mapInstanceRef.current?.setZoom(16)
                }
              }
            }}
            onExpandChange={(exp) => setNearbyExpanded(exp)}
          />
      )}

      {/* Filter sheet */}
      {showFilter && (
        <FilterSheet
          onClose={() => setShowFilter(false)}
          bottomNavHeight={bottomNavHeight}
          initial={{ genres: filterGenres, when: filterDate, price: filterPreco, distance }}
          onApply={(genres, date, price, dist) => { setFilterGenres(genres); setFilterDate(date); setFilterPreco(price); setDistance(dist) }}
        />
      )}

      {/* Bottom nav */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Auth sheet */}
      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
