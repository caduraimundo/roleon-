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

type PaymentMethod = 'pix' | 'credit_card'

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

function IconPix({ active }: { active: boolean }) {
  const c = active ? '#0EA5A0' : '#8A8A8A'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill={active ? '#E6F7F6' : 'none'}/>
    </svg>
  )
}

function IconCard({ active }: { active: boolean }) {
  const c = active ? '#0EA5A0' : '#8A8A8A'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="1.5" y="4.5" width="17" height="12" rx="2" stroke={c} strokeWidth="1.5"/>
      <path d="M1.5 8.5h17" stroke={c} strokeWidth="1.5"/>
      <path d="M5 12.5h4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function maskCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function maskExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d
}

const INPUT_STYLE: React.CSSProperties = {
  border: '1px solid #E8E8E8', borderRadius: 10, padding: '12px 14px',
  fontSize: 15, fontFamily: "'Noto Sans', sans-serif",
  background: '#fff', color: '#1A1A1A', outline: 'none', width: '100%',
  boxSizing: 'border-box',
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id)

  const [evento, setEvento] = useState<EventoCheckout | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('pix')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardName, setCardName] = useState('')

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
          payment_method: payMethod,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')

      if (payMethod === 'credit_card') {
        router.push(`/ingresso/${data.ticket_id}`)
      } else {
        const sp = new URLSearchParams({
          qr_code_url: data.qr_code_url,
          pix_code: data.pix_code,
          amount: String(data.amount),
          expires_at: data.expires_at,
        })
        router.push(`/pagamento/${data.order_id}?${sp.toString()}`)
      }
    } catch {
      setLoading(false)
    }
  }

  const btnLabel = loading
    ? 'Processando...'
    : payMethod === 'pix' ? 'Pagar com PIX' : 'Pagar com Cartão'

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
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #EFEFEF' }}>
          {evento.cover_image
            ? <img src={evento.cover_image} alt={evento.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
            : <div style={{ height: 120, background: '#0EA5A0', opacity: 0.7 }} />
          }
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{evento.title}</div>
            {dateLabel && <div style={{ fontSize: 12.5, color: '#8A8A8A' }}>{dateLabel}</div>}
            {evento.location_name && <div style={{ fontSize: 12.5, color: '#8A8A8A' }}>{evento.location_name}</div>}
          </div>
        </div>

        {/* Seletor de quantidade */}
        {!evento.is_free && (
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #EFEFEF',
            padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>Quantidade</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                style={{ width: 36, height: 36, borderRadius: 999, border: '1.5px solid #E8E8E8', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IconMinus />
              </button>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', minWidth: 20, textAlign: 'center' }}>{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(10, q + 1))}
                style={{ width: 36, height: 36, borderRadius: 999, border: '1.5px solid #E8E8E8', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IconPlus />
              </button>
            </div>
          </div>
        )}

        {/* Breakdown de preço */}
        {!evento.is_free && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EFEFEF', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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

        {/* Seleção de forma de pagamento */}
        {!evento.is_free && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#5A5A5A' }}>Forma de pagamento</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['pix', 'credit_card'] as PaymentMethod[]).map(method => {
                const selected = payMethod === method
                return (
                  <button
                    key={method}
                    onClick={() => setPayMethod(method)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 6, padding: '14px 10px',
                      borderRadius: 12,
                      border: selected ? '2px solid #0EA5A0' : '1px solid #E8E8E8',
                      background: selected ? '#E6F7F6' : '#fff',
                      cursor: 'pointer', transition: 'all 150ms ease',
                    }}
                  >
                    {method === 'pix' ? <IconPix active={selected} /> : <IconCard active={selected} />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: selected ? '#0EA5A0' : '#1A1A1A', fontFamily: "'Noto Sans', sans-serif" }}>
                      {method === 'pix' ? 'PIX' : 'Cartão'}
                    </span>
                    <span style={{ fontSize: 11, color: '#8A8A8A', fontFamily: "'Noto Sans', sans-serif" }}>
                      {method === 'pix' ? 'Aprovação imediata' : 'Crédito à vista'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Formulário de cartão */}
        {!evento.is_free && payMethod === 'credit_card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Número do cartão"
              value={cardNumber}
              onChange={e => setCardNumber(maskCard(e.target.value))}
              style={INPUT_STYLE}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Validade (MM/AA)"
                value={cardExpiry}
                onChange={e => setCardExpiry(maskExpiry(e.target.value))}
                style={{ ...INPUT_STYLE, flex: 1 }}
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="CVV"
                maxLength={3}
                value={cardCvv}
                onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                style={{ ...INPUT_STYLE, flex: 1 }}
              />
            </div>
            <input
              type="text"
              placeholder="Nome no cartão"
              value={cardName}
              onChange={e => setCardName(e.target.value.toUpperCase())}
              style={INPUT_STYLE}
            />
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
          {btnLabel}
        </button>
      </div>
    </div>
  )
}
