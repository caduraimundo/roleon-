'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { BackButton } from '../../../components/BackButton'
import { calcFees } from '../../../lib/pricing'
import { validateCPF } from '../../../lib/validateCPF'

function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6)
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9)
}

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
  const c = active ? '#0EA5A0' : '#6E6E73'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24" fill="none" color={c}>
      <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
      <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
      <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
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

  const [evento,       setEvento]       = useState<EventoCheckout | null>(null)
  const [quantity,     setQuantity]     = useState(1)
  const [loading,      setLoading]      = useState(false)
  const [user,         setUser]         = useState<{ id: string; email: string; name: string } | null>(null)
  const [payMethod,    setPayMethod]    = useState<PaymentMethod>('pix')
  const [emailInput,   setEmailInput]   = useState('')
  const [cpfInput,     setCpfInput]     = useState('')
  const [cpfError,     setCpfError]     = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [ticketTypeId,   setTicketTypeId]   = useState<string | null>(null)
  const [ticketTypeName, setTicketTypeName] = useState<string | null>(null)
  const [ticketTypePrice, setTicketTypePrice] = useState<number | null>(null)
  const [couponInput,    setCouponInput]    = useState('')
  const [couponData,     setCouponData]     = useState<{
    coupon_id: string; coupon_code: string; discount_type: string
    discount_value: number; discount_amount: number
  } | null>(null)
  const [couponError,    setCouponError]    = useState('')
  const [couponLoading,  setCouponLoading]  = useState(false)
  const [titleExpanded, setTitleExpanded] = useState(false)

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

    try {
      const raw = sessionStorage.getItem('ticket_type_name')
      if (raw) {
        const tt = JSON.parse(raw)
        if (tt.ticket_type_id)   setTicketTypeId(tt.ticket_type_id)
        if (tt.ticket_type_name) setTicketTypeName(tt.ticket_type_name)
        if (tt.price)            setTicketTypePrice(Number(tt.price))
      }
    } catch {}
  }, [id])

  if (!evento) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F7F7F7', fontFamily: "'Noto Sans', sans-serif" }}>
        <div style={{ height: 60, background: '#fff', borderBottom: '0.5px solid #EFEFEF' }} />
      </div>
    )
  }

  const price            = ticketTypePrice ?? Number(evento.price) ?? 0
  const discountedPrice  = couponData ? price - couponData.discount_amount : price
  const originalSubtotal = price * quantity
  const totalDiscount    = couponData ? couponData.discount_amount * quantity : 0
  const method           = payMethod === 'credit_card' ? 'card' : 'pix'
  const { roleonFee, pagarmeFee, total } = calcFees(discountedPrice, quantity, method)
  const totalFee         = roleonFee + pagarmeFee

  const parsed   = evento.event_date ? formatDate(evento.event_date) : null

  const handlePagar = async () => {
    if (loading || !user) return

    if (!validateCPF(cpfInput)) {
      setCpfError('CPF inválido')
      return
    }
    setCpfError('')
    setCheckoutError('')

    setLoading(true)
    try {
      // Para cartão: salva dados no session e vai para formulário (tokenização acontece lá)
      if (payMethod === 'credit_card') {
        sessionStorage.setItem('roleon_checkout', JSON.stringify({
          event_id: id,
          quantity,
          user_id: user.id,
          user_email: emailInput || user.email,
          user_name: user.name,
          event_title: evento.title,
          total,
          unit_price: discountedPrice,
          customer_document: cpfInput.replace(/\D/g, ''),
          ticket_type_id: ticketTypeId ?? undefined,
          ticket_type_name: ticketTypeName ?? undefined,
          coupon_code: couponData?.coupon_code ?? undefined,
          discount_applied: couponData?.discount_amount ?? undefined,
        }))
        router.push(`/pagamento-cartao/${id}`)
        return
      }

      // Reutiliza pedido PIX existente para evitar chamadas duplicadas à API
      const cached = sessionStorage.getItem(`roleon_order_${id}`)
      if (cached) {
        const order = JSON.parse(cached)
        sessionStorage.setItem('roleon_checkout', JSON.stringify({
          ...order,
          event_id: id,
          event_title: evento.title,
          total,
          quantity,
        }))
        router.push(`/pagamento/${order.order_id}`)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          event_id: id, quantity,
          user_id: user.id, user_email: emailInput || user.email, user_name: user.name,
          payment_method: 'pix',
          customer_document: cpfInput.replace(/\D/g, ''),
          ticket_type_id: ticketTypeId ?? undefined,
          ticket_type_name: ticketTypeName ?? undefined,
          ticket_type_price: ticketTypePrice ?? undefined,
          coupon_code: couponData?.coupon_code ?? undefined,
          discount_applied: couponData?.discount_amount ?? undefined,
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
      sessionStorage.setItem(`roleon_order_${id}`, JSON.stringify({
        order_id: data.order_id,
        qr_code_url: data.qr_code_url,
        pix_code: data.pix_code,
        amount: data.amount,
        expires_at: data.expires_at,
      }))

      router.push(`/pagamento/${data.order_id}`)
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Erro ao processar pagamento. Tente novamente.')
      setLoading(false)
    }
  }

  const applyCoupon = async () => {
    if (!couponInput.trim() || couponLoading) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim(),
          event_id: id,
          user_id: user?.id,
          ticket_price: price,
        }),
      })
      const data = await res.json()
      if (data.valid) {
        setCouponData(data)
        setCouponError('')
        sessionStorage.removeItem(`roleon_order_${id}`)
      } else {
        setCouponData(null)
        setCouponError(data.error ?? 'Cupom invalido')
      }
    } catch {
      setCouponError('Erro ao validar cupom')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setCouponData(null)
    setCouponInput('')
    setCouponError('')
    sessionStorage.removeItem(`roleon_order_${id}`)
  }

  const btnDisabled = loading || (!evento.is_free && !validateCPF(cpfInput))

  const btnLabel = loading
    ? 'Processando...'
    : payMethod === 'pix' ? 'Pagar com PIX' : 'Pagar com Cartão'

  return (
    <div suppressHydrationWarning style={{
      minHeight: '100dvh', background: '#F7F7F7',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
      paddingBottom: 96,
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: '#fff',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 16 }}>
          <BackButton />
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>Checkout</span>
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{ flex: 1, padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* RESUMO DO INGRESSO */}
        <div>
          <div style={SECTION_LABEL}>Resumo do ingresso</div>
          <div style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Thumbnail */}
            {evento.cover_image ? (
              <img
                src={evento.cover_image}
                alt={evento.title}
                style={{ width: 144, height: 72, borderRadius: 8, objectFit: 'cover', objectPosition: 'center top', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 144, height: 72, borderRadius: 8, flexShrink: 0,
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
              <div
                onClick={() => setTitleExpanded(e => !e)}
                style={{
                  fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 5, cursor: 'pointer',
                  ...(titleExpanded ? {} : {
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }),
                }}
              >
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
                background: '#F7F7F7', borderRadius: 6,
                padding: '3px 8px',
                fontSize: 12, fontWeight: 600, color: '#3A3A3A',
              }}>
                {quantity} ingresso{quantity !== 1 ? 's' : ''}{ticketTypeName ? ` · ${ticketTypeName}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* SELETOR DE QUANTIDADE */}
        {!evento.is_free && (
          <div style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>
                {ticketTypeName || 'Ingresso'}
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

        {/* CPF */}
        {!evento.is_free && (
          <div>
            <div style={SECTION_LABEL}>CPF do comprador</div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpfInput}
                onChange={e => { setCpfInput(maskCpf(e.target.value)); setCpfError('') }}
                onBlur={() => { if (cpfInput && !validateCPF(cpfInput)) setCpfError('CPF inválido') }}
                style={{
                  border: `1px solid ${cpfError ? '#FF3B30' : '#E8E8E8'}`, borderRadius: 10, padding: '12px 14px',
                  fontSize: 14, fontFamily: "'Noto Sans', sans-serif",
                  background: '#fff', color: '#1A1A1A', outline: 'none', width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              {cpfError && (
                <div style={{ fontSize: 11, color: '#FF3B30', marginTop: 4 }}>{cpfError}</div>
              )}
            </div>
          </div>
        )}

        {/* CUPOM DE DESCONTO */}
        {!evento.is_free && (
          <div>
            <div style={SECTION_LABEL}>Cupom de desconto</div>
            {!couponData ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  inputMode="text"
                  placeholder="Codigo do cupom"
                  value={couponInput}
                  onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') applyCoupon() }}
                  style={{
                    flex: 1, border: `1px solid ${couponError ? '#FF3B30' : '#E8E8E8'}`,
                    borderRadius: 10, padding: '12px 14px',
                    fontSize: 14, fontFamily: "'Noto Sans', sans-serif",
                    background: '#fff', color: '#1A1A1A', outline: 'none',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}
                />
                <button
                  onClick={applyCoupon}
                  disabled={!couponInput.trim() || couponLoading}
                  style={{
                    padding: '12px 18px', borderRadius: 10,
                    background: couponLoading || !couponInput.trim() ? '#E8E8E8' : '#0EA5A0',
                    color: couponLoading || !couponInput.trim() ? '#9A9A9A' : '#fff',
                    border: 0, cursor: couponLoading || !couponInput.trim() ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {couponLoading ? '...' : 'Aplicar'}
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#E6F7F6', borderRadius: 10, padding: '12px 14px',
                border: '1px solid #B2E8E6',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0EA5A0', letterSpacing: 0.5 }}>
                    {couponData.coupon_code}
                  </span>
                  <span style={{ fontSize: 12, color: '#0EA5A0' }}>
                    {couponData.discount_type === 'percent'
                      ? `${couponData.discount_value}% de desconto`
                      : `R$ ${fmt(couponData.discount_value)} de desconto`}
                  </span>
                </div>
                <button
                  onClick={removeCoupon}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#0EA5A0', fontWeight: 600,
                    fontFamily: "'Noto Sans', sans-serif", padding: '4px 8px',
                  }}
                >
                  Remover
                </button>
              </div>
            )}
            {couponError && (
              <div style={{ fontSize: 11, color: '#FF3B30', marginTop: 4 }}>{couponError}</div>
            )}
          </div>
        )}

        {/* DETALHES DO PREÇO */}
        {!evento.is_free && (
          <div>
            <div style={SECTION_LABEL}>Detalhes do preço</div>
            <div style={{ ...CARD, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>{quantity} × ingresso</span>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>R$ {fmt(originalSubtotal)}</span>
              </div>
              {couponData && totalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#0EA5A0' }}>Desconto ({couponData.coupon_code})</span>
                  <span style={{ fontSize: 13, color: '#0EA5A0' }}>-R$ {fmt(totalDiscount)}</span>
                </div>
              )}
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
          <a href="/termos" style={{ color: '#0EA5A0', fontWeight: 600, textDecoration: 'none' }}>Termos de compra</a>
          {' '}e a{' '}
          <a href="/privacidade" style={{ color: '#0EA5A0', fontWeight: 600, textDecoration: 'none' }}>Política de reembolso</a>.
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
                      borderRadius: 12, minHeight: 96,
                      border: sel ? '2px solid #0EA5A0' : '1px solid #E8E8E8',
                      background: sel ? '#E6F7F6' : '#fff',
                      cursor: 'pointer', transition: 'all 150ms ease',
                    }}
                  >
                    {method === 'pix' ? <IconPix active={sel} /> : <IconCard active={sel} />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: sel ? '#0EA5A0' : '#1A1A1A', fontFamily: "'Noto Sans', sans-serif" }}>
                      {method === 'pix' ? 'PIX' : 'Cartão'}
                    </span>
                    <span style={{ fontSize: 11, color: '#8A8A8A', fontFamily: "'Noto Sans', sans-serif", textAlign: 'center' }}>
                      {method === 'pix' ? 'Aprovação imediata' : 'Até 6x parcelado'}
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
        {checkoutError && (
          <div style={{
            fontSize: 13, color: '#FF3B30', textAlign: 'center',
            marginBottom: 8, fontWeight: 600,
          }}>
            {checkoutError}
          </div>
        )}
        <button
          onClick={handlePagar}
          disabled={btnDisabled}
          style={{
            width: '100%', height: 52,
            background: btnDisabled ? '#8ACFCC' : '#0EA5A0',
            color: '#fff', border: 0, borderRadius: 14,
            fontSize: 16, fontWeight: 700,
            fontFamily: "'Noto Sans', sans-serif",
            cursor: btnDisabled ? 'not-allowed' : 'pointer',
            transition: 'background 200ms ease',
          }}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  )
}
