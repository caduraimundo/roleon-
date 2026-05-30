'use client'

import { useState, useMemo } from 'react'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// Tipagem do evento - adapte aos campos do seu banco de dados
export interface RoleonEvent {
  id: string
  title: string
  venue: string
  neighborhood: string
  address: string
  date: string
  time: string
  price: number
  fee: number
  likes: number
  genre: string
  color: string           // cor do placeholder da thumb (hex)
  lat: number
  lng: number
  description?: string
  isSoldOut?: boolean
  is_free?: boolean
  cover_image?: string
  event_date?: string
  location_lat?: number
  location_lng?: number
}

const T = {
  primary:   '#0EA5A0',
  text:      '#1A1A1A',
  textDim:   '#6E6E73',
  textMute:  '#9A9A9A',
  borderSoft:'#EFEFEF',
}

// ── Ícones ───────────────────────────────────────────────────────────────────

function IconCompass() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8.2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M14 8l-1.2 4.2L8.6 14l1.2-4.2L14 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
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

function IconCalendar() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1.5 6h11M4.5 1.5v3M9.5 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// ── Miniatura do evento (placeholder colorido) ───────────────────────────────

function EventThumb({ ev, size = 76 }: { ev: RoleonEvent; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: ev.color,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Grid sutil sobre a cor */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}>
        <g stroke="#fff" strokeWidth="1" fill="none">
          <path d="M0 30 L100 30 M0 50 L100 50 M0 70 L100 70"/>
          <path d="M30 0 L30 100 M70 0 L70 100"/>
        </g>
      </svg>
      {/* Gênero em mono */}
      <div style={{
        position: 'absolute', bottom: 5, left: 7,
        color: '#fff', opacity: 0.85,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 9, fontWeight: 500, letterSpacing: 0.5,
      }}>
        {ev.genre.toUpperCase()}
      </div>
    </div>
  )
}

// ── Card de prévia ao clicar num pin ─────────────────────────────────────────

interface PinSheetProps {
  event: RoleonEvent
  onClose: () => void
  onViewDetail: () => void
  /** Altura da BottomNav (px) para posicionar o card acima dela */
  bottomNavHeight: number
}

export function PinSheet({ event: ev, onClose, onViewDetail, bottomNavHeight }: PinSheetProps) {

  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: `calc(${bottomNavHeight + 24}px + env(safe-area-inset-bottom, 0px))`,
        background: '#ffffff',
        borderRadius: 18,
        boxShadow: '0 16px 40px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(0,0,0,0.05)',
        padding: 12,
        zIndex: 30,
        fontFamily: "'Noto Sans', sans-serif",
        animation: 'pinSheetIn 320ms cubic-bezier(.2,.9,.3,1.2) both',
      }}
    >
      <style>{`
        @keyframes pinSheetIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* Conteúdo principal */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <EventThumb ev={ev} size={76} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Gênero */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              textTransform: 'uppercase', color: T.primary,
              background: '#E6F7F6', padding: '3px 7px', borderRadius: 999,
            }}>
              {ev.genre}
            </div>
          </div>

          {/* Título */}
          <div style={{
            fontSize: 14.5, fontWeight: 700, color: T.text,
            lineHeight: 1.25, letterSpacing: -0.1,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const,
          }}>
            {ev.title}
          </div>

          {/* Data · Hora */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 11.5, color: T.textDim, fontWeight: 500, marginTop: 1,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconCalendar /> {ev.date}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconClock /> {ev.time}
            </span>
          </div>
        </div>

        {/* Botão fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: 'absolute', top: 9, right: 9,
            width: 24, height: 24, borderRadius: 999,
            background: '#F0F0F0', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.textDim,
          }}
        >
          <IconClose />
        </button>
      </div>

      {/* Footer: preço + CTA */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10, paddingTop: 10,
        borderTop: `0.5px solid ${T.borderSoft}`,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: T.text }}>
              R$ {ev.price.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
        <button
          onClick={onViewDetail}
          style={{
            padding: '10px 14px',
            background: T.primary, color: '#fff',
            border: 0, borderRadius: 10, cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            fontFamily: "'Noto Sans', sans-serif",
            boxShadow: '0 6px 14px rgba(14,165,160,0.28)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Ver detalhes
        </button>
      </div>
    </div>
  )
}

// ── Hint card quando nenhum pin está selecionado ─────────────────────────────

interface MapHintProps {
  count: number
  bottomNavHeight: number
  events: Array<{
    id: string
    title: string
    genre?: string
    lat?: number
    lng?: number
    price?: number
    is_free?: boolean
    cover_image?: string
    event_date?: string
  }>
  userLocation?: { lat: number; lng: number } | null
  onEventSelect?: (id: string) => void
  onExpandChange?: (expanded: boolean) => void
}

export function MapHint({ count, bottomNavHeight, events, userLocation, onEventSelect, onExpandChange }: MapHintProps) {
  const [expanded, setExpanded] = useState(false)
  const [index, setIndex] = useState(0)

  const sorted = useMemo(() => {
    if (!userLocation) return events
    return [...events]
      .filter(ev => ev.lat && ev.lng)
      .map(ev => ({
        ...ev,
        _dist: haversineKm(userLocation.lat, userLocation.lng, ev.lat!, ev.lng!),
      }))
      .sort((a, b) => a._dist - b._dist)
  }, [events, userLocation])

  const current = sorted[index]

  const handleExpand = () => { setExpanded(true); setIndex(0); onExpandChange?.(true) }
  const handleClose = () => { setExpanded(false); onExpandChange?.(false) }

  if (expanded && current) {
    const distLabel = (current as any)._dist != null
      ? ((current as any)._dist < 1 ? ((current as any)._dist * 1000).toFixed(0) + ' m' : (current as any)._dist.toFixed(1) + ' km')
      : null
    const dateLabel = current.event_date
      ? new Date(current.event_date.replace(' ', 'T')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      : null

    return (
      <div style={{
        position: 'absolute', left: 14, right: 14,
        bottom: bottomNavHeight + 24,
        background: '#fff', borderRadius: 14,
        boxShadow: '0 10px 28px rgba(0,0,0,0.13), 0 0 0 0.5px rgba(0,0,0,0.05)',
        zIndex: 12, fontFamily: "'Noto Sans', sans-serif", overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6E6E73', letterSpacing: 0.6, textTransform: 'uppercase' }}>Perto de você</span>
          <button onClick={handleClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: '#6E6E73' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, background: '#E6F7F6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {current.cover_image
                ? <img src={current.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 10, fontWeight: 700, color: '#0EA5A0' }}>{current.genre?.toUpperCase() ?? 'EVENTO'}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {current.genre && (
                <div style={{ display: 'inline-flex', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#0EA5A0', letterSpacing: 0.5, background: '#E6F7F6', borderRadius: 999, padding: '2px 8px' }}>
                    {current.genre.toUpperCase()}
                  </span>
                </div>
              )}
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.3, marginBottom: 4 }}>{current.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {distLabel && (
                  <span style={{ fontSize: 11.5, color: '#6E6E73', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                    </svg>
                    {distLabel}
                  </span>
                )}
                {dateLabel && <span style={{ fontSize: 11.5, color: '#6E6E73' }}>{dateLabel}</span>}
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0EA5A0', marginLeft: 'auto' }}>
                  {current.is_free ? 'Grátis' : `R$ ${Number(current.price ?? 0).toFixed(2).replace('.', ',')}`}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => { onEventSelect?.(current.id); handleClose() }} style={{ marginTop: 12, width: '100%', background: '#0EA5A0', color: '#fff', border: 0, borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif", cursor: 'pointer' }}>
            Ver evento
          </button>
        </div>
        {sorted.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 12px', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
            <button onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0} style={{ border: 0, background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', padding: 4, color: index === 0 ? '#C0C0C0' : '#1A1A1A' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span style={{ fontSize: 12, color: '#6E6E73' }}>{index + 1} de {sorted.length}</span>
            <button onClick={() => setIndex(i => Math.min(sorted.length - 1, i + 1))} disabled={index === sorted.length - 1} style={{ border: 0, background: 'transparent', cursor: index === sorted.length - 1 ? 'default' : 'pointer', padding: 4, color: index === sorted.length - 1 ? '#C0C0C0' : '#1A1A1A' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div onClick={handleExpand} style={{ position: 'absolute', left: 14, right: 14, bottom: bottomNavHeight + 24, background: '#ffffff', borderRadius: 14, padding: '11px 14px', boxShadow: '0 10px 28px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 12, fontFamily: "'Noto Sans', sans-serif", cursor: 'pointer' }}>
      <div style={{ width: 32, height: 32, borderRadius: 999, background: '#E6F7F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5A0', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 585.61 833.16" fill="currentColor">
          <path d="M315.27,0l-46.28.13C88.26,15.59-36.83,188.99,9.81,367.08c10.05,38.36,22.99,74.06,39.65,110.28,55.47,120.6,142.46,246.73,226.57,349.46l10.25,6.34h12.67s10.63-6.37,10.63-6.37c84.39-103.01,171.52-229.52,227.05-350.59,16.64-36.27,29.54-72.01,39.46-110.45C622.02,187.82,496.16,14.52,315.27,0ZM536.19,307.83c-6.28,97-80.8,227.21-135.27,311.03-33.48,51.52-68.36,100.04-108.07,150.78-68.61-87.9-131.44-179.16-182.06-277.27-27.39-54.29-57.06-123.9-61.27-183.01C39.42,167.4,152.2,48.67,292.02,48.16c139.83-.51,253.36,117.67,244.17,259.67Z"/>
          <path d="M488.04,291.66c-.31-12.1-9.46-23.45-22.46-23.73l-28.44-.62c-10.98-61.76-58.68-108.87-119.71-119.53l-.18-26.42c-.1-14.42-11.61-24.77-25.19-24.38-12.79.37-23.58,10.5-23.66,24.38l-.15,26.47c-61.66,10.74-109.1,58.44-119.89,119.9l-26.69.07c-14.11.04-24.52,11.8-24.06,25.34.42,12.3,10.7,23.32,24.16,23.41l26.65.18c10.64,60.88,57.98,108.89,119.54,119.66l.46,27.15c.24,13.96,12.15,24.29,25.14,23.85,13.27-.45,23.77-11.45,23.75-25.47l-.03-25.29c61.19-10.64,109.25-58.46,119.94-119.91l28.17-.32c13.34-.15,22.98-12.32,22.66-24.74ZM292.81,389.66c-53.85,0-97.51-43.66-97.51-97.51s43.66-97.51,97.51-97.51,97.51,43.66,97.51,97.51-43.66,97.51-97.51,97.51Z"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{count} {count === 1 ? 'rolê' : 'rolês'} no mapa</div>
        <div style={{ fontSize: 11.5, color: '#6E6E73', marginTop: 1 }}>Toque para ver os mais próximos</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#6E6E73', flexShrink: 0 }}>
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}
