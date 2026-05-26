'use client'

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
}

export function MapHint({ count, bottomNavHeight }: MapHintProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: bottomNavHeight + 24,
        background: '#ffffff',
        borderRadius: 14,
        padding: '11px 14px',
        boxShadow: '0 10px 28px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 12,
        fontFamily: "'Noto Sans', sans-serif",
      }}
    >
      {/* Ícone circular */}
      <div style={{
        width: 32, height: 32, borderRadius: 999,
        background: '#E6F7F6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.primary, flexShrink: 0,
      }}>
        <IconCompass />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
          {count} {count === 1 ? 'rolê' : 'rolês'} por perto
        </div>
        <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 1 }}>
          Toque num pin pra ver os detalhes
        </div>
      </div>
    </div>
  )
}
