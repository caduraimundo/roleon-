'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

// ── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ safeTop, hasActiveFilter, onFilterOpen }: {
  safeTop: number
  hasActiveFilter: boolean
  onFilterOpen: () => void
}) {
  return (
    <div style={{
      padding: `${safeTop + 4}px 16px 10px`,
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#fff', borderRadius: 999,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)',
        pointerEvents: 'auto',
      }}>
        <span style={{ color: DIM, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <IconSearch />
        </span>
        <div style={{
          flex: 1, fontSize: 14.5, fontWeight: 500, color: TEXT,
          fontFamily: "'Noto Sans', sans-serif", cursor: 'pointer', userSelect: 'none',
        }}>
          Ouro Preto
        </div>
        <div style={{ width: 1, height: 18, background: '#E4E4E4', flexShrink: 0 }} />
        <button
          onClick={onFilterOpen}
          aria-label="Filtros"
          style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            padding: '0 2px', display: 'flex', alignItems: 'center',
            color: hasActiveFilter ? PRIMARY : DIM,
          }}
        >
          <IconSliders />
        </button>
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

const CATEGORIAS  = ['Samba/Pagode', 'MPB', 'Rock', 'Funk', 'Sertanejo', 'Forró', 'Rap', 'Eletrônico', 'Piseiro', 'Reggae', 'Indie', 'Axé', 'República']
const PRECOS      = ['Grátis', 'Até R$30', 'Até R$50']
const DATE_CHIPS  = ['Hoje', 'Amanhã', 'Este fim de semana', 'Esta semana']

function FilterChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      border: `1.5px solid ${active ? TEXT : '#E8E8E8'}`,
      background: active ? TEXT : '#fff',
      color: active ? '#fff' : '#404040',
      padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
      fontSize: 13.5, fontWeight: 500, fontFamily: "'Noto Sans', sans-serif",
      whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function FilterSheet({ onClose, bottomNavHeight, onApply }: {
  onClose: () => void
  bottomNavHeight: number
  onApply: (cat: string | null, date: string | null, price: string | null) => void
}) {
  const [categoria,     setCategoria]     = useState<string | null>(null)
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null)
  const [preco,         setPreco]         = useState<string | null>(null)

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.35)', zIndex: 85,
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: bottomNavHeight,
        background: '#fff',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
        zIndex: 90,
        maxHeight: 'calc(100dvh - 120px)',
        overflowY: 'auto', paddingBottom: 30,
        animation: 'fsUp 280ms cubic-bezier(.2,.9,.3,1)',
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        <style>{`@keyframes fsUp { from { transform: translateY(100%); } to { transform: none; } }`}</style>

        {/* Grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: '#D6D6D6' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 20px 16px', borderBottom: `0.5px solid ${BORDER}`,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Filtros</div>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: DIM }}>
            <IconClose />
          </button>
        </div>

        {/* Categoria */}
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
            Categoria
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIAS.map((c) => (
              <button key={c} onClick={() => setCategoria(categoria === c ? null : c)} style={{
                border: `1.5px solid ${categoria === c ? PRIMARY : '#E0E0E0'}`,
                background: categoria === c ? `${PRIMARY}18` : '#fff',
                color: categoria === c ? PRIMARY : '#404040',
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
                border: `1.5px solid ${preco === p ? PRIMARY : '#E0E0E0'}`,
                background: preco === p ? `${PRIMARY}18` : '#fff',
                color: preco === p ? PRIMARY : '#404040',
                padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                fontSize: 13.5, fontWeight: 500, fontFamily: "'Noto Sans', sans-serif",
              }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Aplicar */}
        <div style={{ padding: '24px 20px 0' }}>
          <button onClick={() => { onApply(categoria, selectedDate, preco); onClose() }} style={{
            width: '100%', background: PRIMARY, color: '#fff',
            border: 0, cursor: 'pointer', padding: '14px 18px', borderRadius: 12,
            fontSize: 15, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif",
            boxShadow: '0 6px 16px rgba(14,165,160,0.25)',
          }}>
            Aplicar filtros
          </button>
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

export default function MapClient({ onEventSelect, bottomNavHeight = 64 }: MapClientProps) {
  const router         = useRouter()
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const overlayRefs     = useRef<Map<string, { overlay: any; container: HTMLDivElement }>>(new Map())
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null)

  const [events,          setEvents]          = useState<RoleonEvent[]>([])
  const [loading,         setLoading]         = useState(true)
  const [authed,          setAuthed]          = useState(false)
  const [userId,          setUserId]          = useState<string | null>(null)
  const [showAuth,        setShowAuth]        = useState(false)
  const [activePin,       setActivePin]       = useState<string | null>(null)
  const [activeChip,      setActiveChip]      = useState<string | null>(null)
  const [activeTab,       setActiveTab]       = useState<TabId>('explorar')
  const [showFilter,      setShowFilter]      = useState(false)
  const [filterCategoria, setFilterCategoria] = useState<string | null>(null)
  const [filterDate,      setFilterDate]      = useState<string | null>(null)
  const [filterPreco,     setFilterPreco]     = useState<string | null>(null)
  const [safeTop,         setSafeTop]         = useState(56)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .then(({ data, error }) => {
        if (error) {
          console.log('[MapClient] erro ao buscar eventos:', error.message, error.code)
        }
        if (data) {
          setEvents(data.map((row: Record<string, unknown>) => {
            const d = row.event_date ? new Date(row.event_date as string) : null
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
    if (filterCategoria && ev.genre !== filterCategoria) return false
    return true
  })

  const activeEvent = filteredEvents.find((e) => e.id === activePin) ?? null
  const hasActiveFilter = !!(filterCategoria || filterPreco || filterDate)

  // Inicializa o mapa + marcador de localização do usuário
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = new google.maps.Map(mapRef.current, {
      center: OURO_PRETO_CENTER, zoom: 15,
      styles: LIGHT_MAP_STYLE,
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
      draw()     { if (!userPos) return; const p = this.getProjection().fromLatLngToDivPixel(userPos); if (p) { dot.style.left=`${p.x}px`; dot.style.top=`${p.y}px` } }
      onRemove() { dot.parentNode?.removeChild(dot) }
    }
    const dotOverlay = new UserDot()

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        userPos = new google.maps.LatLng(coords.latitude, coords.longitude)
        userLocationRef.current = { lat: coords.latitude, lng: coords.longitude }
        if (!dotOverlay.getMap()) dotOverlay.setMap(map)
        dotOverlay.draw()
      },
      () => {},
      { enableHighAccuracy: true },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      dotOverlay.setMap(null)
    }
  }, [])

  // Renderiza pins
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return

    overlayRefs.current.forEach((_, id) => {
      if (!filteredEvents.find((e) => e.id === id)) {
        overlayRefs.current.get(id)?.overlay.setMap(null)
        overlayRefs.current.delete(id)
      }
    })

    filteredEvents.forEach((ev) => {
      const position = new google.maps.LatLng(ev.lat, ev.lng)
      const isActive = ev.id === activePin

      if (!overlayRefs.current.has(ev.id)) {
        const container = document.createElement('div')
        container.style.cssText = 'position:absolute;'
        class PinOverlay extends google.maps.OverlayView {
          onAdd()    { this.getPanes()?.overlayMouseTarget.appendChild(container) }
          draw()     { const p = this.getProjection()?.fromLatLngToDivPixel(position); if (p) { container.style.left=`${p.x}px`; container.style.top=`${p.y}px` } }
          onRemove() { container.parentNode?.removeChild(container) }
        }
        const overlay = new PinOverlay()
        overlay.setMap(mapInstanceRef.current)
        overlayRefs.current.set(ev.id, { overlay, container })
      }

      const { container } = overlayRefs.current.get(ev.id)!
      container.innerHTML = `
        <button data-ev="${ev.id}" style="
          transform:translate(-50%,-100%) ${isActive?'scale(1.06)':'scale(1)'};
          transition:transform 280ms cubic-bezier(.2,.9,.3,1.4);
          background:transparent;border:0;padding:0;cursor:pointer;outline:none;
          display:inline-flex;flex-direction:column;align-items:center;">
          <div style="
            background:${isActive?PRIMARY:'#fff'};color:${isActive?'#fff':TEXT};
            padding:7px 11px 7px 8px;border-radius:999px;
            font-family:'Noto Sans',sans-serif;font-size:12.5px;font-weight:700;
            display:flex;align-items:center;gap:5px;white-space:nowrap;line-height:1;
            box-shadow:${isActive?`0 8px 18px rgba(14,165,160,0.4),0 0 0 1.5px ${PRIMARY}`:'0 3px 8px rgba(0,0,0,0.14),0 0 0 1px rgba(0,0,0,0.04)'};">
            ${ev.price === 0 ? 'Grátis' : `R$${ev.price}`}
          </div>
          <div style="width:8px;height:8px;background:${isActive?PRIMARY:'#fff'};
            transform:rotate(45deg);margin-top:-4px;
            box-shadow:${isActive?'none':'1.5px 1.5px 3px rgba(0,0,0,0.08)'};"></div>
        </button>`

      const btn = container.querySelector('button')
      if (btn) btn.onclick = () => setActivePin((prev) => (prev === ev.id ? null : ev.id))
    })
  }, [filteredEvents, activePin])

  useEffect(() => {
    if (activePin && !filteredEvents.find((e) => e.id === activePin)) setActivePin(null)
  }, [filteredEvents, activePin])

  const handleViewDetail = useCallback(() => {
    if (!activeEvent) return
    try { sessionStorage.setItem(`evento-${activeEvent.id}`, JSON.stringify(activeEvent)) } catch {}
    if (onEventSelect) onEventSelect(activeEvent)
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
          <SearchBar safeTop={safeTop} hasActiveFilter={hasActiveFilter} onFilterOpen={() => setShowFilter(true)} />
          <ChipBar activeChip={activeChip} onChipChange={setActiveChip} />
        </div>
      </div>

      {/* FAB: localização */}
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
          position: 'absolute', right: 14,
          bottom: `calc(${bottomNavHeight + (activeEvent ? 203 : 82)}px + env(safe-area-inset-bottom, 0px))`,
          width: 42, height: 42, borderRadius: 999,
          background: '#fff', border: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: TEXT,
          boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
          zIndex: 18,
          transition: 'bottom 320ms cubic-bezier(.2,.9,.3,1.1)',
        }}
      >
        <IconLocate />
      </button>

      {/* Card de evento ou hint */}
      {activeEvent ? (
        <PinSheet event={activeEvent} onClose={() => setActivePin(null)} onViewDetail={handleViewDetail} bottomNavHeight={bottomNavHeight} />
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
        <MapHint count={filteredEvents.length} bottomNavHeight={bottomNavHeight} />
      )}

      {/* Filter sheet */}
      {showFilter && (
        <FilterSheet
          onClose={() => setShowFilter(false)}
          bottomNavHeight={bottomNavHeight}
          onApply={(cat, date, price) => { setFilterCategoria(cat); setFilterDate(date); setFilterPreco(price) }}
        />
      )}

      {/* Bottom nav */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Auth sheet */}
      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
