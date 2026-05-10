'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <circle cx="15" cy="4" r="2.2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="15" cy="16" r="2.2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="5"  cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M7 9l6-3.6M7 11l6 3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function IconHeart({ saved }: { saved: boolean }) {
  const color = saved ? '#0EA5A0' : '#6E6E73'
  return (
    <svg width="17" height="17" viewBox="0 0 22 22" fill="none">
      <path
        d="M11 18.5s-6.5-4-6.5-9a3.8 3.8 0 016.5-2.7A3.8 3.8 0 0117.5 9.5c0 5-6.5 9-6.5 9z"
        stroke={color}
        strokeWidth="1.9"
        strokeLinejoin="round"
        fill={saved ? color : 'none'}
      />
    </svg>
  )
}

const BTN: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 999,
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(10px)',
  border: 0, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#1A1A1A',
  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
}

interface HeroActionsProps {
  title: string
  eventId: string
  onAuthRequired?: () => void
}

export default function HeroActions({ title, eventId, onAuthRequired }: HeroActionsProps) {
  const router  = useRouter()
  const [saved,   setSaved]   = useState(false)
  const [userId,  setUserId]  = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (!uid) return
      supabase
        .from('saved_events')
        .select('id')
        .eq('user_id', uid)
        .eq('event_id', eventId)
        .maybeSingle()
        .then(({ data: row }) => { if (row) setSaved(true) })
    })
  }, [eventId])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
    }
  }

  const handleSave = async () => {
    if (!userId) {
      onAuthRequired?.()
      return
    }
    const next = !saved
    setSaved(next)
    if (next) {
      await supabase.from('saved_events').insert({ user_id: userId, event_id: eventId })
    } else {
      await supabase.from('saved_events').delete().eq('user_id', userId).eq('event_id', eventId)
    }
  }

  return (
    <>
      {/* Voltar — topo esquerdo */}
      <button
        onClick={() => router.back()}
        aria-label="Voltar"
        style={{ ...BTN, position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: 16 }}
      >
        <IconArrowLeft />
      </button>

      {/* Compartilhar + Salvar — topo direito */}
      <div style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        right: 16,
        display: 'flex', gap: 8,
      }}>
        <button onClick={handleShare} aria-label="Compartilhar" style={BTN}>
          <IconShare />
        </button>
        <button onClick={handleSave} aria-label={saved ? 'Remover dos salvos' : 'Salvar evento'} style={BTN}>
          <IconHeart saved={saved} />
        </button>
      </div>
    </>
  )
}
