'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import AuthSheet from '../../../components/AuthSheet'

interface EventoCTAProps {
  id: string
  isFree: boolean
  price: number
  fee: number
  ticketTypeId?: string
  ticketTypeName?: string
  selectedPrice?: number
  isSoldOut?: boolean
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

export default function EventoCTA({ id, isFree, price, ticketTypeId, ticketTypeName, selectedPrice, isSoldOut = false }: EventoCTAProps) {
  const router = useRouter()
  const [authed,          setAuthed]          = useState(false)
  const [showAuth,        setShowAuth]        = useState(false)
  const [inWaitlist,      setInWaitlist]      = useState(false)
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [showEmailAlert,  setShowEmailAlert]  = useState(false)
  const [resendLoading,   setResendLoading]   = useState(false)
  const [resendSent,      setResendSent]      = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
      if (data.session && isSoldOut) {
        fetch(`/api/waitlist?event_id=${id}`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        })
          .then(r => r.json())
          .then(j => setInWaitlist(!!j.inWaitlist))
          .catch(() => {})
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
      if (session) setShowAuth(false)
    })
    return () => subscription.unsubscribe()
  }, [id, isSoldOut])

  const handleWaitlist = async () => {
    if (waitlistLoading) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setWaitlistLoading(true)
    try {
      if (inWaitlist) {
        await fetch('/api/waitlist', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ event_id: id }),
        })
        setInWaitlist(false)
      } else {
        const res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            event_id: id,
            ticket_type_id: null,
            email: session.user.email ?? '',
          }),
        })
        if (res.status === 201 || res.status === 409) setInWaitlist(true)
      }
    } finally {
      setWaitlistLoading(false)
    }
  }

  const displayPrice = selectedPrice ?? price

  const handleCTA = async () => {
    if (!authed) { setShowAuth(true); return }
    if (!isFree) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && !session.user.email_confirmed_at) {
        setShowEmailAlert(true)
        return
      }
      if (ticketTypeId) {
        sessionStorage.setItem('ticket_type_name', JSON.stringify({
          ticket_type_id: ticketTypeId,
          ticket_type_name: ticketTypeName ?? '',
          price: displayPrice,
        }))
      }
      router.push(`/checkout/${id}`)
    }
  }

  async function handleResendEmail() {
    setResendLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email) {
      await supabase.auth.resend({ type: 'signup', email: session.user.email })
    }
    setResendLoading(false)
    setResendSent(true)
  }

  const priceLabel = `R$ ${displayPrice.toFixed(2).replace('.', ',')}`

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(249,249,249,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '0.5px solid rgba(0,0,0,0.08)',
        padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 12px)',
        zIndex: 50,
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        {isFree ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#8A8A8A', fontWeight: 500 }}>Ingresso</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A' }}>Entrada gratuita</div>
            </div>
            {isSoldOut && authed ? (
              <button onClick={handleWaitlist} disabled={waitlistLoading} style={inWaitlist ? BTN_IN_WAITLIST : BTN_NOTIFY}>
                {waitlistLoading ? 'Aguarde...' : inWaitlist ? 'Na fila - Cancelar aviso' : <><IconBell />Me avise se abrir vagas</>}
              </button>
            ) : (
              <button onClick={isSoldOut ? undefined : handleCTA} disabled={isSoldOut} style={isSoldOut ? BTN_SOLD_OUT : BTN_TEAL}>
                {isSoldOut ? 'Esgotado' : 'Participar'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#8A8A8A', fontWeight: 500 }}>Ingresso</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#1A1A1A', letterSpacing: -0.5 }}>
                {priceLabel}
              </div>
            </div>
            {isSoldOut && authed ? (
              <button onClick={handleWaitlist} disabled={waitlistLoading} style={inWaitlist ? BTN_IN_WAITLIST : BTN_NOTIFY}>
                {waitlistLoading ? 'Aguarde...' : inWaitlist ? 'Na fila - Cancelar aviso' : <><IconBell />Me avise se abrir vagas</>}
              </button>
            ) : (
              <button onClick={isSoldOut ? undefined : handleCTA} disabled={isSoldOut} style={isSoldOut ? BTN_SOLD_OUT : BTN_TEAL}>
                {isSoldOut ? 'Esgotado' : 'Comprar ingresso'}
              </button>
            )}
          </div>
        )}
      </div>

      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {showEmailAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-[#1A1A1A] mb-2">
              Confirme seu e-mail
            </h3>
            <p className="text-sm text-[#6E6E73] mb-4">
              Para comprar ingressos, confirme seu e-mail primeiro.
              {!resendSent
                ? ' Reenviamos o link para o seu endereço cadastrado.'
                : ' O link foi reenviado. Verifique sua caixa de entrada.'}
            </p>
            <button
              onClick={handleResendEmail}
              disabled={resendLoading || resendSent}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-[#0EA5A0] text-white mb-3 disabled:opacity-50"
            >
              {resendLoading ? 'Enviando...' : resendSent ? 'Link enviado' : 'Reenviar e-mail de confirmacao'}
            </button>
            <button
              onClick={() => setShowEmailAlert(false)}
              className="w-full py-3 rounded-xl text-sm font-semibold text-[#6E6E73]"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const BTN_TEAL: React.CSSProperties = {
  background: '#0EA5A0', color: '#fff',
  border: 0, cursor: 'pointer',
  padding: '15px 22px', borderRadius: 12,
  fontSize: 16, fontWeight: 700,
  fontFamily: "'Noto Sans', sans-serif",
  boxShadow: '0 6px 18px rgba(14,165,160,0.28)',
  whiteSpace: 'nowrap',
  display: 'flex', alignItems: 'center',
}

const BTN_SOLD_OUT: React.CSSProperties = {
  ...BTN_TEAL,
  background: '#6E6E73',
  cursor: 'not-allowed',
  opacity: 0.5,
  boxShadow: 'none',
}

const BTN_NOTIFY: React.CSSProperties = {
  ...BTN_TEAL,
  background: '#F9F9F9',
  color: '#0EA5A0',
  border: '1.5px solid #0EA5A0',
  boxShadow: 'none',
  cursor: 'pointer',
  fontSize: 14,
  justifyContent: 'center',
}

const BTN_IN_WAITLIST: React.CSSProperties = {
  ...BTN_NOTIFY,
  background: '#F0F0F0',
  color: '#6E6E73',
  border: '1px solid #6E6E73',
}
