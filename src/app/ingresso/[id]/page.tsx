'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

interface EventInfo {
  title: string
  event_date: string | null
  location_name: string | null
}

interface Ticket {
  id: string
  event_id: string
  user_id: string
  price_paid: number
  qr_code: string
  status: string
  created_at: string
  events: EventInfo | null
}

function IconArrowLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
      <path fill="none" stroke="#6E6E73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
    </svg>
  )
}

function IconLocation() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
      <path fill="none" stroke="#6E6E73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return capitalize(
    d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  )
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatTicketNumber(id: string) {
  return `#${id.slice(-4).toUpperCase()}`
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
        <path d="M16 3a13 13 0 0113 13" stroke="#0EA5A0" strokeWidth="3" strokeLinecap="round"/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </svg>
    </div>
  )
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff',
        boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px',
      }}>
        <button
          onClick={onBack}
          aria-label="Voltar"
          style={{
            position: 'absolute', left: 16,
            top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
            width: 36, height: 36, borderRadius: 999,
            background: 'transparent', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconArrowLeft />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Meu Ingresso</span>
      </div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', gap: 16,
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="#E53935" strokeWidth="2"/>
          <path d="M24 14v14M24 32v3" stroke="#E53935" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', textAlign: 'center' }}>
          {message}
        </div>
        <button
          onClick={onBack}
          style={{
            marginTop: 8, padding: '12px 28px', borderRadius: 12,
            background: '#0EA5A0', color: '#fff',
            border: 0, cursor: 'pointer',
            fontSize: 15, fontWeight: 600,
            fontFamily: "'Noto Sans', sans-serif",
          }}
        >
          Voltar
        </button>
      </div>
    </div>
  )
}

export default function IngressoPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = String(params.id)

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [evento, setEvento] = useState<EventInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: t, error: tErr } = await supabase
        .from('tickets')
        .select('*, events(*)')
        .eq('id', ticketId)
        .single()

      if (tErr || !t) {
        setError('Ingresso não encontrado.')
        setLoading(false)
        return
      }

      const ticket = t as Ticket
      if (ticket.user_id !== user.id) {
        setError('Este ingresso não pertence à sua conta.')
        setLoading(false)
        return
      }

      setTicket(ticket)
      if (ticket.events) setEvento(ticket.events)
      setLoading(false)
    }
    load()
  }, [ticketId, router])

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} onBack={() => router.back()} />

  const statusMap: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    paid:    { label: 'Válido',    bg: '#E6F7F6', color: '#0EA5A0', dot: '#0EA5A0' },
    used:    { label: 'Utilizado', bg: '#F2F2F2', color: '#6E6E73', dot: '#6E6E73' },
    pending: { label: 'Pendente',  bg: '#FEF9C3', color: '#92400E', dot: '#F59E0B' },
  }
  const badgeStyle = statusMap[ticket?.status ?? ''] ?? statusMap['pending']
  const qrData = ticket?.qr_code || ticketId
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header fixo */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff',
        boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px',
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          style={{
            position: 'absolute', left: 16,
            top: 'calc(env(safe-area-inset-top, 0px) + 6px)',
            background: 'transparent', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 8,
          }}
        >
          <IconArrowLeft />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Meu Ingresso</span>
      </div>

      {/* Conteúdo */}
      <div style={{
        flex: 1, padding: '28px 20px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%', maxWidth: 380,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>

          {/* Seção superior: infos do evento */}
          <div style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Badge de status */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 99,
                background: badgeStyle.bg,
                fontSize: 12, fontWeight: 600,
                color: badgeStyle.color,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: badgeStyle.dot,
                  display: 'inline-block',
                }} />
                {badgeStyle.label}
              </span>
            </div>

            {/* Nome do evento */}
            {evento?.title && (
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.3 }}>
                {evento.title}
              </div>
            )}

            {/* Data e horário */}
            {evento?.event_date && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ marginTop: 1, flexShrink: 0 }}>
                  <IconCalendar />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>
                    {formatDate(evento.event_date)}
                  </span>
                  <span style={{ fontSize: 13, color: '#6E6E73' }}>
                    {formatTime(evento.event_date)}
                  </span>
                </div>
              </div>
            )}

            {/* Local */}
            {evento?.location_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flexShrink: 0 }}>
                  <IconLocation />
                </div>
                <span style={{ fontSize: 13, color: '#6E6E73' }}>{evento.location_name}</span>
              </div>
            )}
          </div>

          {/* Divider estilo ticket perfurado */}
          <div style={{ position: 'relative', height: 2 }}>
            <div style={{
              position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
              width: 20, height: 20, borderRadius: '50%',
              background: '#F9F9F9', zIndex: 1,
            }} />
            <div style={{
              position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)',
              width: 20, height: 20, borderRadius: '50%',
              background: '#F9F9F9', zIndex: 1,
            }} />
            <div style={{ borderTop: '2px dashed #E5E7EB', margin: '0 16px', position: 'relative', top: 1 }} />
          </div>

          {/* Seção inferior: QR Code + número + rodapé */}
          <div style={{
            padding: '24px 24px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            <img
              src={qrUrl}
              alt="QR Code do ingresso"
              width={200}
              height={200}
              style={{ borderRadius: 8, display: 'block' }}
            />

            <div style={{
              fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
              color: '#1A1A1A', letterSpacing: 2,
            }}>
              {formatTicketNumber(ticketId)}
            </div>

            <div style={{
              width: '100%', paddingTop: 14,
              borderTop: '1px solid #F2F2F2',
              textAlign: 'center',
              fontSize: 12, color: '#6E6E73', lineHeight: 1.5,
            }}>
              Apresente este QR Code na entrada do evento
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
