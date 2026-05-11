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

function initials(title: string) {
  const words = title.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const wd = weekdays[d.getDay()]
  const day = String(d.getDate()).padStart(2, '0')
  const mon = months[d.getMonth()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${wd}, ${day} ${mon} · ${hh}:${mm}`
}

// ── Ícones ────────────────────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4L6 9l5 5" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
      {/* Losango externo */}
      <path
        d="M12 2L22 12L12 22L2 12L12 2Z"
        stroke={c} strokeWidth="1.5" fill="none"
      />
      {/* Onda superior */}
      <path
        d="M7 10 Q9 8 12 10 Q15 12 17 10"
        stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none"
      />
      {/* Onda inferior */}
      <path
        d="M7 14 Q9 12 12 14 Q15 16 17 14"
        stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none"
      />
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

function maskCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function maskExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d
}

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#6E6E73',
  textTransform: 'uppercase', letterSpacing: 0.6,
}

const CARD: React.CSSProperties = {
  background: '#fff', borderRadius: 12, border: '1px solid #EFEFEF',
}

const INPUT_STYLE: React.CSSProperties = {
  border: '1px solid #E8E8E8', borderRadius: 10, padding: '12px 14px',
  fontSize: 15, fontFamily: "'Noto Sans', sans-serif",
  background: '#fff', color: '#1A1A1A', outline: 'none', width: '100%',
  boxSizing: 'border-box',
}

// ── Page ─────────────────────────────────────────────────────────────────────

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
      .then(({ data }) => { if (data) setEvento(data as EventoCheckout) })

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
        <div style={{ height: 80, background: '#fff', borderBottom: '0.5px solid #EFEFEF' }} />
      </div>
    )
  }

  const price = Number(evento.price) || 0
  const subtotal = price * quantity
  const totalFee = subtotal * 0.04 + subtotal * 0.0119 + 0.99
  const total = subtotal + totalFee

  const dateLabel = evento.event_date ? formatDate(evento.event_date) : null
  const initStr = initials(evento.title)

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
      paddingBottom: 100,
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: '#fff',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Botão voltar */}
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            style={{
              width: 36, height: 36, borderRadius: 999,
              background: '#F2F2F2', border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconArrowLeft />
          </button>

          {/* Título central */}
          <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
              Passo 1 de 2
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.2 }}>
              Ingressos
            </div>
          </div>

          {/* Barra de progresso */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 20, height: 4, borderRadius: 2, background: '#0EA5A0' }} />
            <div style={{ width: 20, height: 4, borderRadius: 2, background: '#E8E8E8' }} />
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{ flex: 1, padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Card do evento */}
        <div style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 8, flexShrink: 0,
            background: '#0EA5A0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
            letterSpacing: -0.5,
          }}>
            {initStr}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {evento.title}
            </div>
            {dateLabel && (
              <div style={{ fontSize: 12, color: '#6E6E73', marginBottom: 2 }}>{dateLabel}</div>
            )}
            {evento.location_name && (
              <div style={{ fontSize: 12, color: '#6E6E73', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {evento.location_name}
              </div>
            )}
          </div>
        </div>

        {/* Seletor de lote / quantidade */}
        {!evento.is_free && (
          <div style={{ ...CARD, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 3 }}>
                  Pista — Lote 1
                </div>
                <div style={{ fontSize: 12, color: '#6E6E73' }}>
                  R$ {fmt(price)} + R$ {fmt(totalFee / quantity)} taxa
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{
                    width: 32, height: 32, borderRadius: 999,
                    border: '1.5px solid #E8E8E8', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <IconMinus />
                </button>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', minWidth: 18, textAlign: 'center' }}>
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
          </div>
        )}

        {/* E-mail para envio */}
        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={LABEL}>E-mail para envio</div>
            <div style={{
              background: '#F9F9F9', border: '1px solid #EFEFEF', borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>{user.email}</div>
            </div>
            <div style={{ fontSize: 12, color: '#6E6E73' }}>
              O ingresso será enviado para esse e-mail
            </div>
          </div>
        )}

        {/* Detalhes do preço */}
        {!evento.is_free && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={LABEL}>Detalhes do preço</div>
            <div style={{ ...CARD, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>Ingresso × {quantity}</span>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>R$ {fmt(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>Taxa de serviço</span>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>R$ {fmt(totalFee)}</span>
              </div>
              <div style={{ height: 1, background: '#EFEFEF' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>Total</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0EA5A0' }}>R$ {fmt(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Aviso legal */}
        <div style={{ fontSize: 11, color: '#8A8A8A', textAlign: 'center', lineHeight: 1.6, padding: '0 4px' }}>
          Ao continuar, você concorda com os{' '}
          <span style={{ color: '#0EA5A0', fontWeight: 600 }}>Termos de compra</span>
          {' '}e a{' '}
          <span style={{ color: '#0EA5A0', fontWeight: 600 }}>Política de reembolso</span>.
        </div>

        {/* Forma de pagamento */}
        {!evento.is_free && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={LABEL}>Forma de pagamento</div>
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
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: sel ? '#0EA5A0' : '#1A1A1A',
                      fontFamily: "'Noto Sans', sans-serif",
                    }}>
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
              type="text" inputMode="numeric"
              placeholder="Número do cartão"
              value={cardNumber}
              onChange={e => setCardNumber(maskCard(e.target.value))}
              style={INPUT_STYLE}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text" inputMode="numeric"
                placeholder="Validade (MM/AA)"
                value={cardExpiry}
                onChange={e => setCardExpiry(maskExpiry(e.target.value))}
                style={{ ...INPUT_STYLE, flex: 1 }}
              />
              <input
                type="text" inputMode="numeric"
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

      {/* ── BOTÃO STICKY ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderTop: '0.5px solid rgba(0,0,0,0.07)',
        padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)',
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
