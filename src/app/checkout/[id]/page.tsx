'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

interface EventoCheckout {
  id: string
  title: string
  cover_image: string | null
  event_date: string | null
  location_name: string | null
  price: number
  is_free: boolean
}

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',')
}

function IconArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12 4L7 10l5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconMinus() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 9h10" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 4v10M4 9h10" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id)

  const [evento, setEvento] = useState<EventoCheckout | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null)

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, cover_image, event_date, location_name, price, is_free')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setEvento(data as EventoCheckout)
      })

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? '',
          name: data.user.user_metadata?.full_name ?? data.user.email ?? '',
        })
      }
    })
  }, [id])

  if (!evento) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F9F9F9', fontFamily: "'Noto Sans', sans-serif" }}>
        <div style={{ height: 60, background: '#fff', borderBottom: '0.5px solid #EFEFEF' }} />
      </div>
    )
  }

  const price = Number(evento.price) || 0
  const subtotal = price * quantity
  const roleonFee = subtotal * 0.04
  const operationalFee = subtotal * 0.0119 + 0.99
  const total = subtotal + roleonFee + operationalFee

  const dateLabel = evento.event_date
    ? new Date(evento.event_date).toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      })
    : null

  const handlePagar = async () => {
    if (loading || !user) return
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: id,
          quantity,
          user_id: user.id,
          user_email: user.email,
          user_name: user.name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      const params = new URLSearchParams({
        qr_code_url: data.qr_code_url,
        pix_code: data.pix_code,
        amount: String(data.amount),
        expires_at: data.expires_at,
      })
      router.push(`/pagamento/${data.order_id}?${params.toString()}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
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
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Checkout</span>
      </div>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Card do evento */}
        <div style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          border: '1px solid #EFEFEF',
        }}>
          {evento.cover_image && (
            <img
              src={evento.cover_image}
              alt={evento.title}
              style={{ width: '100%', height: 160, objectFit: 'cover' }}
            />
          )}
          {!evento.cover_image && (
            <div style={{ height: 120, background: '#0EA5A0', opacity: 0.7 }} />
          )}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{evento.title}</div>
            {dateLabel && (
              <div style={{ fontSize: 12.5, color: '#8A8A8A' }}>{dateLabel}</div>
            )}
            {evento.location_name && (
              <div style={{ fontSize: 12.5, color: '#8A8A8A' }}>{evento.location_name}</div>
            )}
          </div>
        </div>

        {/* Seletor de quantidade */}
        {!evento.is_free && (
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #EFEFEF',
            padding: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>Quantidade</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                style={{
                  width: 36, height: 36, borderRadius: 999,
                  border: '1.5px solid #E8E8E8', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <IconMinus />
              </button>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', minWidth: 20, textAlign: 'center' }}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(q => Math.min(10, q + 1))}
                style={{
                  width: 36, height: 36, borderRadius: 999,
                  border: '1.5px solid #E8E8E8', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <IconPlus />
              </button>
            </div>
          </div>
        )}

        {/* Breakdown de preço */}
        {!evento.is_free && (
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #EFEFEF',
            padding: '16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#5A5A5A' }}>Ingresso × {quantity}</span>
              <span style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>R$ {fmt(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#5A5A5A' }}>Taxa Roleon (4%)</span>
              <span style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>R$ {fmt(roleonFee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#5A5A5A' }}>Taxa operacional (1,19% + R$0,99)</span>
              <span style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>R$ {fmt(operationalFee)}</span>
            </div>
            <div style={{ height: 1, background: '#F2F2F2', margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A' }}>R$ {fmt(total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Botão fixo */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(249,249,249,0.95)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '0.5px solid rgba(0,0,0,0.08)',
        padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 12px)',
        zIndex: 50,
      }}>
        <button
          onClick={handlePagar}
          disabled={loading}
          style={{
            width: '100%', height: 52,
            background: loading ? '#8ACFCC' : '#0EA5A0',
            color: '#fff', border: 0, borderRadius: 14,
            fontSize: 16, fontWeight: 700,
            fontFamily: "'Noto Sans', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 200ms ease',
          }}
        >
          {loading ? 'Processando...' : 'Pagar com PIX'}
        </button>
      </div>
    </div>
  )
}
