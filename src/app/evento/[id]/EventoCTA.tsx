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
  title?: string
  eventDate?: string
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

export default function EventoCTA({ id, isFree, price, ticketTypeId, ticketTypeName, selectedPrice, isSoldOut = false, title, eventDate }: EventoCTAProps) {
  const router = useRouter()
  const [authed,          setAuthed]          = useState(false)
  const [showAuth,        setShowAuth]        = useState(false)
  const [inWaitlist,      setInWaitlist]      = useState(false)
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [showEmailAlert,  setShowEmailAlert]  = useState(false)
  const [resendLoading,   setResendLoading]   = useState(false)
  const [resendSent,      setResendSent]      = useState(false)

  const [isParticipating,      setIsParticipating]      = useState(false)
  const [participatingLoading, setParticipatingLoading] = useState(false)
  const [showConfirmSheet,     setShowConfirmSheet]      = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
      if (data.session && isFree) {
        if (ticketTypeId) {
          supabase
            .from('tickets')
            .select('id')
            .eq('user_id', data.session.user.id)
            .eq('event_id', id)
            .eq('status', 'confirmed')
            .maybeSingle()
            .then(({ data: confirmed }) => setIsParticipating(!!confirmed))
        } else {
          supabase
            .from('saved_events')
            .select('id')
            .eq('user_id', data.session.user.id)
            .eq('event_id', id)
            .maybeSingle()
            .then(({ data: saved }) => setIsParticipating(!!saved))
        }
      }
      if (data.session && isSoldOut) {
        const qs = ticketTypeId ? `&ticket_type_id=${ticketTypeId}` : ''
        fetch(`/api/waitlist?event_id=${id}${qs}`, {
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
  }, [id, isSoldOut, ticketTypeId])

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
          body: JSON.stringify({ event_id: id, ticket_type_id: ticketTypeId ?? null }),
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
            ticket_type_id: ticketTypeId ?? null,
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
    if (!authed) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
      setShowAuth(true)
      return
    }
    if (isFree) {
      setParticipatingLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setParticipatingLoading(false); return }
      try {
        if (ticketTypeId) {
          if (isParticipating) {
            const res = await fetch('/api/confirmar-presenca', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ event_id: id }),
            })
            if (res.ok) setIsParticipating(false)
          } else {
            const res = await fetch('/api/confirmar-presenca', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ event_id: id, ticket_type_id: ticketTypeId }),
            })
            if (res.ok) {
              setIsParticipating(true)
              setShowConfirmSheet(true)
            } else {
              const errData = await res.json().catch(() => ({}))
              alert(errData.error || 'Não foi possível confirmar presença')
            }
          }
        } else {
          if (isParticipating) {
            await supabase
              .from('saved_events')
              .delete()
              .eq('user_id', session.user.id)
              .eq('event_id', id)
            setIsParticipating(false)
          } else {
            await supabase
              .from('saved_events')
              .insert({ user_id: session.user.id, event_id: id })
            setIsParticipating(true)
            setShowConfirmSheet(true)
          }
        }
      } finally {
        setParticipatingLoading(false)
      }
      return
    }
    if (!isFree) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_verified')
          .eq('id', session.user.id)
          .single()
        if (profile && !profile.email_verified) {
          setShowEmailAlert(true)
          return
        }
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
    if (session?.user) {
      await fetch('/api/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name ?? '',
        }),
      })
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
              <button
                onClick={handleCTA}
                disabled={participatingLoading || isSoldOut}
                style={isSoldOut ? BTN_SOLD_OUT : isParticipating ? BTN_PARTICIPATING : BTN_TEAL}
              >
                {isSoldOut ? 'Esgotado' : participatingLoading ? 'Aguarde...' : isParticipating ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Participando
                  </span>
                ) : 'Participar'}
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
              className="w-full h-11 flex items-center justify-center rounded-xl text-sm font-semibold bg-[#0EA5A0] text-white mb-3 disabled:opacity-50"
            >
              {resendLoading ? 'Enviando...' : resendSent ? 'Link enviado' : 'Reenviar e-mail de confirmação'}
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

      {showConfirmSheet && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setShowConfirmSheet(false)}
        >
          <div
            style={{
              width: '100%',
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              padding: '28px 24px calc(env(safe-area-inset-bottom, 0px) + 28px)',
              fontFamily: "'Noto Sans', sans-serif",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#E6F7F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <path d="M5 13l5.5 5.5L21 7" stroke="#0EA5A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>
                Presença confirmada
              </div>
            </div>
            {title && (
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{title}</div>
              </div>
            )}
            {eventDate && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#6E6E73' }}>{eventDate}</div>
              </div>
            )}
            {!title && <div style={{ marginBottom: 20 }} />}
            <button
              onClick={() => { setShowConfirmSheet(false); router.push('/ingressos') }}
              style={{
                width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 15px',
                background: '#0EA5A0', color: '#fff',
                border: 0, borderRadius: 14,
                fontSize: 15, fontWeight: 700,
                fontFamily: "'Noto Sans', sans-serif",
                cursor: 'pointer', marginBottom: 10,
              }}
            >
              Ver em Meus Ingressos
            </button>
            <button
              onClick={() => setShowConfirmSheet(false)}
              style={{
                width: '100%', padding: '14px',
                background: 'transparent', color: '#6E6E73',
                border: 0, borderRadius: 14,
                fontSize: 15, fontWeight: 600,
                fontFamily: "'Noto Sans', sans-serif",
                cursor: 'pointer',
              }}
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
  height: 44, padding: '0 22px', borderRadius: 12,
  fontSize: 16, fontWeight: 700,
  fontFamily: "'Noto Sans', sans-serif",
  boxShadow: '0 6px 18px rgba(14,165,160,0.28)',
  whiteSpace: 'nowrap',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
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
  background: '#F7F7F7',
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

const BTN_PARTICIPATING: React.CSSProperties = {
  ...BTN_TEAL,
  background: '#fff',
  color: '#0EA5A0',
  border: '2px solid #0EA5A0',
  boxShadow: 'none',
}
