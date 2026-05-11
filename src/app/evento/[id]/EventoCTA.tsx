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
}

export default function EventoCTA({ id, isFree, price, fee }: EventoCTAProps) {
  const router = useRouter()
  const [authed,    setAuthed]    = useState(false)
  const [showAuth,  setShowAuth]  = useState(false)

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

  const handleCTA = () => {
    if (!authed) { setShowAuth(true); return }
    if (!isFree) {
      router.push(`/checkout/${id}`)
    }
  }

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
              <div style={{ fontSize: 12, color: '#8A8A8A', fontWeight: 500 }}>Total</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#1A1A1A', letterSpacing: -0.5 }}>
                R$ {price.toFixed(2).replace('.', ',')}
              </div>
              <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 1 }}>
                R$ {price.toFixed(2).replace('.', ',')} + R$ {fee.toFixed(2).replace('.', ',')} taxa
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
  padding: '13px 22px', borderRadius: 12,
  fontSize: 15, fontWeight: 700,
  fontFamily: "'Noto Sans', sans-serif",
  boxShadow: '0 6px 18px rgba(14,165,160,0.28)',
  whiteSpace: 'nowrap',
}
