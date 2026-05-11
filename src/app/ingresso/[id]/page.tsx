'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

interface Ticket {
  id: string
  event_id: string
  user_id: string
  price_paid: number
  status: string
}

interface EventoInfo {
  title: string
  event_date: string | null
  location_name: string | null
}

function IconArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12 4L7 10l5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function IngressoPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = String(params.id)

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [evento, setEvento] = useState<EventoInfo | null>(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase
        .from('tickets')
        .select('id, event_id, user_id, price_paid, status')
        .eq('id', ticketId)
        .single()

      if (!t) return
      setTicket(t as Ticket)

      const { data: ev } = await supabase
        .from('events')
        .select('title, event_date, location_name')
        .eq('id', (t as Ticket).event_id)
        .single()

      if (ev) setEvento(ev as EventoInfo)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.full_name ?? user.email ?? '')
      }
    }
    load()
  }, [ticketId])

  const dateLabel = evento?.event_date
    ? new Date(evento.event_date).toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      })
    : null

  const shortId = ticketId.slice(-8).toUpperCase()
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketId}`

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(249,249,249,0.95)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px',
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          style={{
            position: 'absolute', left: 16,
            top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
            width: 36, height: 36, borderRadius: 999,
            background: 'transparent', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1A1A1A',
          }}
        >
          <IconArrowLeft />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Meu Ingresso</span>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360,
          overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}>
          {/* Seção QR Code */}
          <div style={{
            padding: '28px 24px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <img
              src={qrUrl}
              alt="QR Code do ingresso"
              width={200}
              height={200}
              style={{ borderRadius: 8 }}
            />
            <div style={{
              fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
              color: '#5A5A5A', letterSpacing: 1,
            }}>
              N° {shortId}
            </div>
          </div>

          {/* Linha tracejada */}
          <div style={{ position: 'relative', height: 0, overflow: 'visible' }}>
            <div style={{
              position: 'absolute', left: -1, top: 0, width: 20, height: 20,
              background: '#F9F9F9', borderRadius: '0 10px 10px 0',
              border: '1px solid #EFEFEF', borderLeft: 'none',
            }} />
            <div style={{
              position: 'absolute', right: -1, top: 0, width: 20, height: 20,
              background: '#F9F9F9', borderRadius: '10px 0 0 10px',
              border: '1px solid #EFEFEF', borderRight: 'none',
            }} />
            <div style={{
              borderTop: '1.5px dashed #E0E0E0',
              margin: '0 22px',
            }} />
          </div>

          {/* Seção infos */}
          <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evento?.title && (
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.3 }}>
                {evento.title}
              </div>
            )}
            {dateLabel && (
              <div style={{ fontSize: 12, color: '#8A8A8A' }}>{dateLabel}</div>
            )}
            {evento?.location_name && (
              <div style={{ fontSize: 12, color: '#8A8A8A' }}>{evento.location_name}</div>
            )}
            {userName && (
              <div style={{ fontSize: 12, color: '#8A8A8A' }}>{userName}</div>
            )}
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#B0B0B0' }}>
              Apresente este QR Code na entrada
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
