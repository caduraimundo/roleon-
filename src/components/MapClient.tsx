'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import BottomNav, { TabId } from './BottomNav'
import { PinSheet, MapHint, RoleonEvent } from './EventBottomSheet'

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

const CATEGORIAS = ['Samba/Pagode', 'MPB', 'Rock', 'Funk', 'Sertanejo', 'Forró', 'Rap', 'Eletrônico', 'Piseiro', 'Reggae', 'Indie', 'Axé', 'República']
const PRECOS     = ['Grátis', 'Até R$30', 'Até R$50', 'Qualquer']

function FilterSheet({ onClose, bottomNavHeight, onApply }: {
  onClose: () => void
  bottomNavHeight: number
  onApply: (cat: string | null, price: string | null) => void
}) {
  const [categoria, setCategoria] = useState<string | null>(null)
  const [preco, setPreco]         = useState<string | null>(null)

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
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
            Categoria
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIAS.map((c) => {
              const on = categoria === c
              return (
                <button key={c} onClick={() => setCategoria(on ? null : c)} style={{
                  border: `1.5px solid ${on ? PRIMARY : '#E0E0E0'}`,
                  background: on ? `${PRIMARY}18` : '#fff',
                  color: on ? PRIMARY : '#404040',
                  padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 500, fontFamily: "'Noto Sans', sans-serif",
                }}>
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* Preço */}
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
            Preço
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRECOS.map((p) => {
              const on = preco === p
              return (
                <button key={p} onClick={() => setPreco(on ? null : p)} style={{
                  border: `1.5px solid ${on ? PRIMARY : '#E0E0E0'}`,
                  background: on ? `${PRIMARY}18` : '#fff',
                  color: on ? PRIMARY : '#404040',
                  padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 500, fontFamily: "'Noto Sans', sans-serif",
                }}>
                  {p}
                </button>
              )
            })}
          </div>
        </div>

        {/* Aplicar */}
        <div style={{ padding: '24px 20px 0' }}>
          <button onClick={() => { onApply(categoria, preco); onClose() }} style={{
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

// ── MapClient (componente principal exportado) ───────────────────────────────

interface MapClientProps {
  events?: RoleonEvent[]
  onEventSelect?: (event: RoleonEvent) => void
  bottomNavHeight?: number
}

export default function MapClient({ events = [], onEventSelect, bottomNavHeight = 64 }: MapClientProps) {
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const overlayRefs    = useRef<Map<string, { overlay: any; container: HTMLDivElement }>>(new Map())

  const [activePin,       setActivePin]       = useState<string | null>(null)
  const [activeChip,      setActiveChip]      = useState<string | null>(null)
  const [activeTab,       setActiveTab]       = useState<TabId>('explorar')
  const [showFilter,      setShowFilter]      = useState(false)
  const [filterCategoria, setFilterCategoria] = useState<string | null>(null)
  const [filterPreco,     setFilterPreco]     = useState<string | null>(null)
  const [safeTop,         setSafeTop]         = useState(56)

  useEffect(() => {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;left:0;top:0;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;'
    document.documentElement.appendChild(el)
    setSafeTop(Math.max(parseFloat(getComputedStyle(el).height) || 0, 20))
    document.documentElement.removeChild(el)
  }, [])

  const filteredEvents = events.filter((ev) => {
    if (activeChip === 'Grátis' && ev.price > 0) return false
    if (activeChip && !['Hoje', 'Grátis'].includes(activeChip) &&
        ev.genre.toLowerCase() !== activeChip.toLowerCase()) return false
    if (filterCategoria && ev.genre !== filterCategoria) return false
    return true
  })

  const activeEvent = filteredEvents.find((e) => e.id === activePin) ?? null
  const hasActiveFilter = !!(filterCategoria || filterPreco)

  // Inicializa o mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: OURO_PRETO_CENTER, zoom: 15,
      styles: LIGHT_MAP_STYLE,
      disableDefaultUI: true, gestureHandling: 'greedy', clickableIcons: false,
    })
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
            <span style="width:18px;height:18px;border-radius:999px;
              background:${isActive?'rgba(255,255,255,0.22)':'#F2F0EB'};
              display:flex;align-items:center;justify-content:center;
              font-size:10px;font-weight:700;color:${isActive?'#fff':'#7A6F5A'};">♪</span>
            R$${ev.price}
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
    if (activeEvent && onEventSelect) onEventSelect(activeEvent)
  }, [activeEvent, onEventSelect])

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
        onClick={() => navigator.geolocation?.getCurrentPosition((p) =>
          mapInstanceRef.current?.panTo({ lat: p.coords.latitude, lng: p.coords.longitude })
        )}
        aria-label="Minha localização"
        style={{
          position: 'absolute', right: 14,
          bottom: bottomNavHeight + (activeEvent ? 168 : 64) + 12,
          width: 42, height: 42, borderRadius: 999,
          background: '#fff', border: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: TEXT,
          boxShadow: '0 6px 16px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.04)',
          zIndex: 18,
          transition: 'bottom 320ms cubic-bezier(.2,.9,.3,1.1)',
        }}
      >
        <IconLocate />
      </button>

      {/* Card de evento ou hint */}
      {activeEvent ? (
        <PinSheet event={activeEvent} onClose={() => setActivePin(null)} onViewDetail={handleViewDetail} bottomNavHeight={bottomNavHeight} />
      ) : (
        <MapHint count={filteredEvents.length} bottomNavHeight={bottomNavHeight} />
      )}

      {/* Filter sheet */}
      {showFilter && (
        <FilterSheet
          onClose={() => setShowFilter(false)}
          bottomNavHeight={bottomNavHeight}
          onApply={(cat, price) => { setFilterCategoria(cat); setFilterPreco(price) }}
        />
      )}

      {/* Bottom nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
