'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { BackButton } from '../../components/BackButton'

const TEAL = '#0EA5A0'
const TEXT = '#1A1A1A'
const DIM  = '#6E6E73'

type Tab = 'proximos' | 'historico'

interface TicketWithEvent {
  id: string
  event_id: string
  price_paid: number
  status: string
  created_at: string
  events: {
    title: string
    event_date: string | null
    location_name: string | null
  } | null
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return capitalize(
    d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  )
}

function formatPrice(price: number) {
  if (!price || price === 0) return 'Gratuito'
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    paid:    { label: 'Válido',    bg: '#E6F7F6', color: '#0EA5A0', dot: '#0EA5A0' },
    used:    { label: 'Utilizado', bg: '#F2F2F2', color: '#6E6E73', dot: '#6E6E73' },
    pending: { label: 'Pendente',  bg: '#FEF9C3', color: '#92400E', dot: '#F59E0B' },
  }
  const s = map[status] ?? map['pending']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

function IconTicketEmpty() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
      <path fill="none" stroke="#6E6E73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke={DIM} strokeWidth="1.4"/>
      <path d="M5 1v3M11 1v3M1.5 6h13" stroke={DIM} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function IconPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5C5.79 1.5 4 3.29 4 5.5c0 3.5 4 9 4 9s4-5.5 4-9c0-2.21-1.79-4-4-4z"
        stroke={DIM} strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="8" cy="5.5" r="1.5" stroke={DIM} strokeWidth="1.4"/>
    </svg>
  )
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="16" cy="16" r="13" stroke="#E0E0E0" strokeWidth="3"/>
        <path d="M16 3a13 13 0 0113 13" stroke={TEAL} strokeWidth="3" strokeLinecap="round"/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </svg>
    </div>
  )
}

function TicketCard({ ticket, onClick }: { ticket: TicketWithEvent; onClick: () => void }) {
  const ev = ticket.events
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: '#fff',
        borderRadius: 12, border: 0, cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        display: 'flex', overflow: 'hidden', textAlign: 'left',
        padding: 0,
        fontFamily: "'Noto Sans', sans-serif",
      }}
    >
      <div style={{ width: 4, background: TEAL, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, lineHeight: 1.3, flex: 1 }}>
            {ev?.title ?? 'Evento'}
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {ev?.event_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconCalendar />
            <span style={{ fontSize: 12, color: DIM }}>{formatDate(ev.event_date)}</span>
          </div>
        )}

        {ev?.location_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconPin />
            <span style={{ fontSize: 12, color: DIM }}>{ev.location_name}</span>
          </div>
        )}

        <div style={{ fontSize: 13, fontWeight: 600, color: TEAL, marginTop: 2 }}>
          {formatPrice(ticket.price_paid)}
        </div>
      </div>
    </button>
  )
}

export default function IngressosPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketWithEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('proximos')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data } = await supabase
        .from('tickets')
        .select('id, event_id, price_paid, status, created_at, events(title, event_date, location_name)')
        .eq('user_id', user.id)

      setTickets((data as unknown as TicketWithEvent[]) ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <LoadingScreen />

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const proximos = tickets
    .filter(t => {
      const d = t.events?.event_date ? new Date(t.events.event_date) : null
      return d !== null && d >= today && t.status !== 'used'
    })
    .sort((a, b) => {
      const da = new Date(a.events!.event_date!).getTime()
      const db = new Date(b.events!.event_date!).getTime()
      return da - db
    })

  const historico = tickets
    .filter(t => {
      const d = t.events?.event_date ? new Date(t.events.event_date) : null
      return (d !== null && d < today) || t.status === 'used'
    })
    .sort((a, b) => {
      const da = new Date(a.events!.event_date!).getTime()
      const db = new Date(b.events!.event_date!).getTime()
      return db - da
    })

  const list = activeTab === 'proximos' ? proximos : historico

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff',
        boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ position: 'absolute', left: 8 }}>
          <button onClick={() => router.push('/')} aria-label="Voltar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F2F2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Meus Ingressos</span>
      </div>

      {/* Tabs - pill/segmented */}
      <div style={{
        margin: '12px 16px 4px',
        background: '#EEEEEE',
        borderRadius: 12,
        padding: 4,
        display: 'flex',
      }}>
        {(['proximos', 'historico'] as Tab[]).map((tab) => {
          const active = activeTab === tab
          const label = tab === 'proximos' ? 'Próximos' : 'Histórico'
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                background: active ? '#FFFFFF' : 'transparent',
                borderRadius: 10,
                border: 0,
                cursor: 'pointer',
                padding: '8px 0',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? '#1A1A1A' : DIM,
                fontFamily: "'Noto Sans', sans-serif",
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 180ms ease',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Conteúdo */}
      {list.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px', gap: 16,
        }}>
          <IconTicketEmpty />
          <div style={{ fontSize: 16, fontWeight: 600, color: TEXT, textAlign: 'center' }}>
            {activeTab === 'proximos' ? 'Nenhum ingresso próximo' : 'Nenhum ingresso no histórico'}
          </div>
          {activeTab === 'proximos' && (
            <button
              onClick={() => router.push('/')}
              style={{
                marginTop: 8, padding: '12px 28px', borderRadius: 12,
                background: TEAL, color: '#fff',
                border: 0, cursor: 'pointer',
                fontSize: 15, fontWeight: 600,
                fontFamily: "'Noto Sans', sans-serif",
              }}
            >
              Explorar eventos
            </button>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onClick={() => router.push(`/ingresso/${t.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
