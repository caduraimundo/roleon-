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

function formatDate(iso: string) {
  const d = new Date(iso)
  const wds = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const mons = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const day = String(d.getDate()).padStart(2, '0')
  const hh  = String(d.getHours()).padStart(2, '0')
  const mm  = String(d.getMinutes()).padStart(2, '0')
  return { date: `${wds[d.getDay()]}, ${day} ${mons[d.getMonth()]}`, time: `${hh}:${mm}` }
}

// ── Ícones ────────────────────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4L6 9l5 5" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="#6E6E73" strokeWidth="1.2"/>
      <path d="M1 5h10M4 1v2M8 1v2" stroke="#6E6E73" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="4.5" stroke="#6E6E73" strokeWidth="1.2"/>
      <path d="M6 3.5v2.5l1.5 1.5" stroke="#6E6E73" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconMinus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7h8" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 3v8M3 7h8" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function IconPix({ active }: { active: boolean }) {
  const c = active ? '#0EA5A0' : '#8A8A8A'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke={c} strokeWidth="1.5" fill="none"/>
      <path d="M7 10 Q9 8 12 10 Q15 12 17 10" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      <path d="M7 14 Q9 12 12 14 Q15 16 17 14" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function IconCard({ active }: { active: boolean }) {
  const c = active ? '#0EA5A0' : '#8A8A8A'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1.5" y="4.5" width="19" height="13" rx="2.5" stroke={c} strokeWidth="1.5"/>
      <path d="M1.5 9h19" stroke={c} strokeWidth="1.5"/>
      <path d="M5 14h5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}


const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#6E6E73',
  textTransform: 'uppercase', letterSpacing: 0.7,
  marginBottom: 8,
}
const CARD: React.CSSProperties = {
  background: '#fff', borderRadius: 12, border: '1px solid #EFEFEF',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const params  = useParams()
  const router  = useRouter()
  const id      = String(params.id)

  const [evento,    setEvento]    = useState<EventoCheckout | null>(null)
  const [quantity,  setQuantity]  = useState(1)
  const [loading,   setLoading]   = useState(false)
  const [user,      setUser]      = useState<{ id: string; email: string; name: string } | null>(null)
  const [payMethod,   setPayMethod]   = useState<PaymentMethod>('pix')
  const [emailInput,  setEmailInput]  = useState('')

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, cover_image, event_date, location_name, price, is_free')
      .eq('id', id)
      .single()
      .then(({ data }) => { if (data) setEvento(data as EventoCheckout) })

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const email = data.user.email ?? ''
        setUser({
          id:    data.user.id,
          email,
          name:  data.user.user_metadata?.full_name ?? email,
        })
        setEmailInput(email)
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

  const price    = Number(evento.price) || 0
  const subtotal = price * quantity
  const totalFee = subtotal * 0.04 + subtotal * 0.0119 + 0.99
  const total    = subtotal + totalFee

  const parsed   = evento.event_date ? formatDate(evento.event_date) : null

  const handlePagar = async () => {
    if (loading || !user) return
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: id, quantity,
          user_id: user.id, user_email: emailInput || user.email, user_name: user.name,
          payment_method: payMethod,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')

      sessionStorage.setItem('roleon_checkout', JSON.stringify({
        order_id: data.order_id,
        event_id: id,
        event_title: evento.title,
        total,
        quantity,
        ticket_id: data.ticket_id,
        qr_code_url: data.qr_code_url,
        pix_code: data.pix_code,
        expires_at: data.expires_at,
      }))

      if (payMethod === 'credit_card') {
        router.push(`/pagamento-cartao/${data.order_id}`)
      } else {
        router.push(`/pagamento/${data.order_id}`)
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
      paddingBottom: 96,
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: '#fff',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px',
        gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          style={{
            width: 32, height: 32, borderRadius: 999,
            background: 'transparent', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, padding: 0,
          }}
        >
          <IconArrowLeft />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>Checkout</span>
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{ flex: 1, padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* RESUMO DO INGRESSO */}
        <div>
          <div style={SECTION_LABEL}>Resumo do ingresso</div>
          <div style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Thumbnail */}
            {evento.cover_image ? (
              <img
                src={evento.cover_image}
                alt={evento.title}
                style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: 8, flexShrink: 0,
                background: '#0EA5A0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.5,
                textTransform: 'uppercase', textAlign: 'center', padding: 4,
              }}>
                {evento.title.split(/\s+/).slice(0, 2).join('\n')}
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {evento.title}
              </div>
              {parsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <IconCalendar />
                  <span style={{ fontSize: 12, color: '#6E6E73' }}>{parsed.date}</span>
                  <IconClock />
                  <span style={{ fontSize: 12, color: '#6E6E73' }}>{parsed.time}</span>
                </div>
              )}
              {/* Badge quantidade */}
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: '#F2F2F2', borderRadius: 6,
                padding: '3px 8px',
                fontSize: 12, fontWeight: 600, color: '#3A3A3A',
              }}>
                {quantity} ingresso{quantity !== 1 ? 's' : ''} · Pista
              </div>
            </div>
          </div>
        </div>

        {/* SELETOR DE QUANTIDADE */}
        {!evento.is_free && (
          <div style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>
                Pista — Lote 1
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity === 1}
                style={{
                  width: 32, height: 32, borderRadius: 999,
                  border: '1.5px solid #E8E8E8',
                  background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: quantity === 1 ? 'not-allowed' : 'pointer',
                  opacity: quantity === 1 ? 0.4 : 1,
                }}
              >
                <IconMinus />
              </button>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', minWidth: 16, textAlign: 'center' }}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(q => Math.min(10, q + 1))}
                style={{
                  width: 32, height: 32, borderRadius: 999,
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

        {/* E-MAIL PARA ENVIO */}
        {user && (
          <div>
            <div style={SECTION_LABEL}>E-mail para envio</div>
            <div>
              <input
                type="email"
                inputMode="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                style={{
                  border: '1px solid #E8E8E8', borderRadius: 10, padding: '12px 14px',
                  fontSize: 14, fontFamily: "'Noto Sans', sans-serif",
                  background: '#fff', color: '#1A1A1A', outline: 'none', width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 6 }}>
              O ingresso será enviado para esse e-mail
            </div>
          </div>
        )}

        {/* DETALHES DO PREÇO */}
        {!evento.is_free && (
          <div>
            <div style={SECTION_LABEL}>Detalhes do preço</div>
            <div style={{ ...CARD, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>Ingresso</span>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>R$ {fmt(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>Taxa de serviço</span>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>R$ {fmt(totalFee)}</span>
              </div>
              <div style={{ height: 1, background: '#EFEFEF' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>Total</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A' }}>R$ {fmt(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* AVISO LEGAL */}
        <div style={{ fontSize: 11, color: '#8A8A8A', lineHeight: 1.6 }}>
          Ao continuar, você concorda com os{' '}
          <span style={{ color: '#0EA5A0', fontWeight: 600 }}>Termos de compra</span>
          {' '}e a{' '}
          <span style={{ color: '#0EA5A0', fontWeight: 600 }}>Política de reembolso</span>.
        </div>

        {/* FORMA DE PAGAMENTO */}
        {!evento.is_free && (
          <div>
            <div style={SECTION_LABEL}>Forma de pagamento</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['pix', 'credit_card'] as PaymentMethod[]).map(method => {
                const sel = payMethod === method
                return (
                  <button
                    key={method}
                    onClick={() => setPayMethod(method)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 6, padding: '14px 10px',
                      borderRadius: 12,
                      border: sel ? '2px solid #0EA5A0' : '1px solid #E8E8E8',
                      background: sel ? '#E6F7F6' : '#fff',
                      cursor: 'pointer', transition: 'all 150ms ease',
                    }}
                  >
                    {method === 'pix' ? <IconPix active={sel} /> : <IconCard active={sel} />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: sel ? '#0EA5A0' : '#1A1A1A', fontFamily: "'Noto Sans', sans-serif" }}>
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

      </div>

      {/* ── BOTÃO STICKY ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderTop: '0.5px solid rgba(0,0,0,0.07)',
        padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
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
