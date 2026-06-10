'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSmartBack } from '../../../hooks/useSmartBack'

interface CheckoutSession {
  event_id?: string
  event_title?: string
  total?: number
  ticket_id?: string
  quantity?: number
  user_id?: string
  user_email?: string
  user_name?: string
  customer_document?: string
}

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4L6 9l5 5" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
function fmt(n: number) {
  return n.toFixed(2).replace('.', ',')
}
// total1x = preco * 1.0819 + 0.99  →  preco = (total1x - 0.99) / 1.0819
// totalComTaxa (2x-6x) = preco * 1.0949 + 0.99
function calcInstallment(total1x: number, n: number): number {
  if (n === 1) return total1x
  const preco = (total1x - 0.99) / 1.0819
  const totalComTaxa = preco * 1.0949 + 0.99
  return totalComTaxa / n
}

function calcTotalForInstallments(total1x: number, n: number): number {
  if (n === 1) return total1x
  const preco = (total1x - 0.99) / 1.0819
  return preco * 1.0949 + 0.99
}

const INPUT_STYLE: React.CSSProperties = {
  border: '1px solid #E8E8E8', borderRadius: 10, padding: '12px 14px',
  fontSize: 15, fontFamily: "'Noto Sans', sans-serif",
  background: '#fff', color: '#1A1A1A', outline: 'none', width: '100%',
  boxSizing: 'border-box',
}

export default function PagamentoCartaoPage() {
  const params = useParams()
  const router = useRouter()
  const goBack = useSmartBack('/')
  const orderId = String(params.order_id)
  void orderId

  const [session] = useState<CheckoutSession | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('roleon_checkout')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  const total = Number(session?.total) || 0
  const eventTitle = session?.event_title || 'Evento'
  const ticketId = session?.ticket_id || 'mock_ticket_001'

  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [installments, setInstallments] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [paid, setPaid] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (cardNumber.replace(/\s/g, '').length < 16) e.cardNumber = 'Número inválido'
    if (!cardName.trim()) e.cardName = 'Nome obrigatório'
    if (cardExpiry.length < 5) e.cardExpiry = 'Validade inválida'
    if (cardCvv.length < 3) e.cardCvv = 'CVV inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleConfirm = async () => {
    if (!validate() || loading) return
    if (!session?.event_id || !session?.quantity) {
      setErrors({ form: 'Sessão expirada. Volte e tente novamente.' })
      return
    }
    setLoading(true)
    try {
      const tokenRes = await fetch(
        `https://api.pagar.me/core/v5/tokens?appId=${process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'card',
            card: {
              number: cardNumber.replace(/\s/g, ''),
              holder_name: cardName,
              exp_month: cardExpiry.split('/')[0],
              exp_year: cardExpiry.split('/')[1],
              cvv: cardCvv,
            },
          }),
        }
      )
      if (!tokenRes.ok) {
        throw new Error('Verifique os dados do cartão e tente novamente.')
      }
      const tokenData = await tokenRes.json()
      const cardToken = tokenData.id

      let ticketTypeName: string | null = null
      let ticketTypePrice: number | null = null
      try {
        const ttRaw = sessionStorage.getItem('ticket_type_name')
        if (ttRaw) {
          const tt = JSON.parse(ttRaw)
          ticketTypeName = tt?.ticket_type_name || null
          ticketTypePrice = Number(tt?.price) || null
        }
      } catch {}

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: session?.event_id,
          quantity: session?.quantity,
          user_id: session?.user_id,
          user_email: session?.user_email,
          user_name: session?.user_name,
          payment_method: 'credit_card',
          card_token: cardToken,
          installments,
          customer_document: session?.customer_document || '',
          ticket_type_name: ticketTypeName,
          ticket_type_price: ticketTypePrice ?? undefined,
          coupon_code: session?.coupon_code ?? undefined,
          discount_applied: session?.discount_applied ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro no pagamento')

      if (!data.ticket_id) throw new Error('Pagamento aprovado mas ticket não gerado. Contate o suporte.')
      setPaid(true)
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Erro ao processar pagamento' })
      setLoading(false)
    }
  }

  if (paid) return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 24, textAlign: 'center',
    }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#0EA5A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A' }}>Pagamento confirmado!</div>
        <div style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.5 }}>Seu ingresso está garantido. Aproveite o rolê!</div>
      </div>
      <button onClick={() => router.replace('/ingressos')} style={{ width: '100%', maxWidth: 320, height: 52, background: '#0EA5A0', color: '#fff', border: 0, borderRadius: 14, fontSize: 16, fontWeight: 700, fontFamily: "'Noto Sans', sans-serif", cursor: 'pointer' }}>
        Ver meu ingresso
      </button>
      <button onClick={() => router.replace('/')} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 15, color: '#6E6E73', fontFamily: "'Noto Sans', sans-serif", fontWeight: 500 }}>
        Voltar ao mapa
      </button>
    </div>
  )

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
      paddingBottom: 96,
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 16 }}>
          <button
            onClick={goBack}
            aria-label="Voltar"
            style={{
              width: 36, height: 36, borderRadius: 999,
              background: '#F2F2F2', border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: 0,
            }}
          >
            <IconArrowLeft />
          </button>
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>Cartão de crédito</span>
      </div>

      <div style={{ flex: 1, padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Formulário */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #EFEFEF',
          padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Número do cartão */}
          <div>
            <input
              type="text" inputMode="numeric" placeholder="Número do cartão"
              value={cardNumber} onChange={e => setCardNumber(maskCard(e.target.value))}
              style={{ ...INPUT_STYLE, borderColor: errors.cardNumber ? '#E53935' : '#E8E8E8' }}
            />
            {errors.cardNumber && (
              <div style={{ fontSize: 11, color: '#E53935', marginTop: 4 }}>{errors.cardNumber}</div>
            )}
          </div>

          {/* Nome */}
          <div>
            <input
              type="text" placeholder="Como está no cartão"
              value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())}
              style={{ ...INPUT_STYLE, borderColor: errors.cardName ? '#E53935' : '#E8E8E8' }}
            />
            {errors.cardName && (
              <div style={{ fontSize: 11, color: '#E53935', marginTop: 4 }}>{errors.cardName}</div>
            )}
          </div>

          {/* Validade + CVV */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <input
                type="text" inputMode="numeric" placeholder="MM/AA"
                value={cardExpiry} onChange={e => setCardExpiry(maskExpiry(e.target.value))}
                style={{ ...INPUT_STYLE, borderColor: errors.cardExpiry ? '#E53935' : '#E8E8E8' }}
              />
              {errors.cardExpiry && (
                <div style={{ fontSize: 11, color: '#E53935', marginTop: 4 }}>{errors.cardExpiry}</div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text" inputMode="numeric" placeholder="CVV" maxLength={3}
                value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                style={{ ...INPUT_STYLE, borderColor: errors.cardCvv ? '#E53935' : '#E8E8E8' }}
              />
              {errors.cardCvv && (
                <div style={{ fontSize: 11, color: '#E53935', marginTop: 4 }}>{errors.cardCvv}</div>
              )}
            </div>
          </div>

          {/* Parcelas */}
          <div>
            <select
              value={installments}
              onChange={e => setInstallments(Number(e.target.value))}
              style={{
                ...INPUT_STYLE,
                appearance: 'none', WebkitAppearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%236E6E73' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: 36,
                cursor: 'pointer',
              }}
            >
              <option value={1}>1x de R$ {fmt(total)} (sem juros)</option>
              {[2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>
                  {n}x de R$ {fmt(calcInstallment(total, n))}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: '#8A8A8A', marginTop: 6 }}>
              Parcelas acima de 1x incluem juros
            </div>
          </div>
        </div>

        {/* Resumo do pedido */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #EFEFEF',
          padding: '16px',
        }}>
          <div style={{ fontSize: 14, color: '#3A3A3A', marginBottom: 6 }}>{eventTitle}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
            Total: R$ {fmt(calcTotalForInstallments(total, installments))}
          </div>
        </div>

        {errors.form && (
          <div style={{ fontSize: 13, color: '#FF3B30', textAlign: 'center', padding: '0 4px' }}>
            {errors.form}
          </div>
        )}
      </div>

      {/* Botão fixo */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderTop: '0.5px solid rgba(0,0,0,0.07)',
        padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
        zIndex: 50,
      }}>
        <button
          onClick={handleConfirm}
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
          {loading ? 'Processando...' : 'Confirmar pagamento'}
        </button>
      </div>
    </div>
  )
}
