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
}

export default function EventoCTA({ id, isFree, price, ticketTypeId, ticketTypeName, selectedPrice }: EventoCTAProps) {
  const router = useRouter()
  const [authed,   setAuthed]   = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
      if (session) setShowAuth(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const displayPrice = selectedPrice ?? price

  const handleCTA = () => {
    if (!authed) { setShowAuth(true); return }
    if (!isFree) {
      if (ticketTypeId) {
        sessionStorage.setItem(`roleon_ticket_type_${id}`, JSON.stringify({
          ticket_type_id: ticketTypeId,
          ticket_type_name: ticketTypeName ?? '',
          price: displayPrice,
        }))
      }
      router.push(`/checkout/${id}`)
    }
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
            <button onClick={handleCTA} style={BTN_TEAL}>Participar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#8A8A8A', fontWeight: 500 }}>Ingresso</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#1A1A1A', letterSpacing: -0.5 }}>
                {priceLabel}
              </div>
            </div>
            <button onClick={handleCTA} style={BTN_TEAL}>Comprar ingresso</button>
          </div>
        )}
      </div>

      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} />
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
