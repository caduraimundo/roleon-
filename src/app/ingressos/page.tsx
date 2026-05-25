'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { BackButton } from '../../components/BackButton'
import BottomNav from '../../components/BottomNav'

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
  ticket_type_name: string | null
  payment_method: string | null
  events: {
    title: string
    event_date: string | null
    location_name: string | null
  } | null
}

function IconPix() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="14" height="14" fill="none" color="#6E6E73" style={{ flexShrink: 0 }}>
      <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
      <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
      <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
    </svg>
  )
}

function IconCard() {
  return (
    <svg width="14" height="14" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="4.5" width="19" height="13" rx="2.5" stroke="#8A8A8A" strokeWidth="1.5"/>
      <path d="M1.5 9h19" stroke="#8A8A8A" strokeWidth="1.5"/>
      <path d="M5 14h5" stroke="#8A8A8A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
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
    paid:         { label: 'Válido',     bg: '#E6F7F6', color: '#0EA5A0', dot: '#0EA5A0' },
    confirmed:    { label: 'Confirmado', bg: '#E6F7F6', color: '#0EA5A0', dot: '#0EA5A0' },
    used:         { label: 'Utilizado',  bg: '#F2F2F2', color: '#6E6E73', dot: '#6E6E73' },
    pending:      { label: 'Pendente',   bg: '#FEF9C3', color: '#92400E', dot: '#F59E0B' },
    expired:      { label: 'Expirado',   bg: '#F5F5F5', color: '#6E6E73', dot: '#6E6E73' },
    refunded:     { label: 'Estornado',  bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
    chargebacked: { label: 'Contestado', bg: '#FFF7ED', color: '#92400E', dot: '#F97316' },
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
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ color: DIM }}>
      <path d="M7 1.5c2.5 0 4.5 2 4.5 4.5 0 3.3-4.5 6.5-4.5 6.5S2.5 9.3 2.5 6c0-2.5 2-4.5 4.5-4.5z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ticket.ticket_type_name && (
              <span style={{
                background: '#F0F0F0', color: '#1A1A1A',
                borderRadius: 20, padding: '4px 10px',
                fontSize: 12, fontWeight: 500,
              }}>
                {ticket.ticket_type_name}
              </span>
            )}
            <div style={{ fontSize: 13, fontWeight: 600, color: TEAL }}>
              {formatPrice(ticket.price_paid)}
            </div>
          </div>
          {ticket.payment_method && ticket.payment_method !== 'free' && (
            <span style={{ fontSize: 12, fontWeight: 500, color: '#6E6E73', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {ticket.payment_method === 'pix' ? <IconPix /> : <IconCard />}
              {ticket.payment_method === 'pix' ? 'PIX' : 'Cartão'}
            </span>
          )}
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
        .select('id, event_id, price_paid, status, created_at, ticket_type_name, payment_method, events(title, event_date, location_name)')
        .eq('user_id', user.id)

      const rows = (data as unknown as TicketWithEvent[]) ?? []

      // Expirar automaticamente tickets pendentes com mais de 15 minutos
      const cutoff15min = new Date(Date.now() - 15 * 60 * 1000)
      const toExpire = rows
        .filter(t => t.status === 'pending' && new Date(t.created_at) < cutoff15min)
        .map(t => t.id)

      if (toExpire.length > 0) {
        await supabase
          .from('tickets')
          .update({ status: 'expired' })
          .in('id', toExpire)
        toExpire.forEach(id => {
          const t = rows.find(r => r.id === id)
          if (t) t.status = 'expired'
        })
      }

      const { data: savedData } = await supabase
        .from('saved_events')
        .select('id, event_id, created_at, events(title, event_date, location_name, is_free)')
        .eq('user_id', user.id)

      const freeRows = ((savedData ?? []) as any[])
        .filter((s: any) => s.events?.is_free === true)
        .map((s: any) => ({
          id: `free-${s.id}`,
          event_id: s.event_id,
          price_paid: 0,
          status: 'confirmed',
          created_at: s.created_at,
          ticket_type_name: null,
          payment_method: 'free',
          events: s.events,
        }))

      setTickets([...rows, ...freeRows])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <LoadingScreen />

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const proximos = tickets
    .filter(t => {
      if (t.status === 'refunded' || t.status === 'chargebacked') return false
      if (t.status === 'expired') return new Date(t.created_at) > cutoff24h
      const d = t.events?.event_date ? new Date(t.events.event_date) : null
      return d !== null && d >= today && t.status !== 'used'
    })
    .sort((a, b) => {
      if (a.status === 'expired' && b.status !== 'expired') return 1
      if (b.status === 'expired' && a.status !== 'expired') return -1
      if (a.status === 'expired' && b.status === 'expired') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      const da = new Date(a.events!.event_date!).getTime()
      const db = new Date(b.events!.event_date!).getTime()
      return da - db
    })

  const historico = tickets
    .filter(t => {
      if (t.status === 'refunded' || t.status === 'chargebacked') return true
      if (t.status === 'expired') return new Date(t.created_at) <= cutoff24h
      const d = t.events?.event_date ? new Date(t.events.event_date) : null
      return (d !== null && d < today) || t.status === 'used'
    })
    .sort((a, b) => {
      const da = a.events?.event_date ? new Date(a.events.event_date).getTime() : new Date(a.created_at).getTime()
      const db = b.events?.event_date ? new Date(b.events.event_date).getTime() : new Date(b.created_at).getTime()
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
        <div style={{ position: 'absolute', left: 16 }}>
          <button onClick={() => router.push('/')} aria-label="Voltar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F2F2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>Meus Ingressos</span>
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
        <div style={{ flex: 1, padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onClick={() => {
                if (t.id.startsWith('free-')) {
                  router.push(`/evento/${t.event_id}`)
                } else {
                  router.push(`/ingresso/${t.id}`)
                }
              }}
            />
          ))}
        </div>
      )}

      <BottomNav activeTab="ingressos" onTabChange={(tab) => {
        if (tab === 'explorar') router.push('/')
        if (tab === 'perfil')   router.push('/perfil')
      }} />
    </div>
  )
}
