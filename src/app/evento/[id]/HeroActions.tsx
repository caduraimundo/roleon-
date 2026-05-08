'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 22 22" fill="none">
      <path
        d="M11 18.5s-6.5-4-6.5-9a3.8 3.8 0 016.5-2.7A3.8 3.8 0 0117.5 9.5c0 5-6.5 9-6.5 9z"
        stroke={filled ? '#E26A6A' : 'currentColor'}
        strokeWidth="1.9"
        strokeLinejoin="round"
        fill={filled ? '#E26A6A' : 'none'}
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

export default function HeroActions({ title, eventId }: { title: string; eventId: string }) {
  const router  = useRouter()
  const [liked, setLiked] = useState(false)

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
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

      {/* Compartilhar + Curtir — topo direito */}
      <div style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        right: 16,
        display: 'flex', gap: 8,
      }}>
        <button onClick={handleShare} aria-label="Compartilhar" style={BTN}>
          <IconShare />
        </button>
        <button
          onClick={() => setLiked((v) => !v)}
          aria-label="Curtir"
          style={{ ...BTN, color: liked ? '#E26A6A' : '#1A1A1A' }}
        >
          <IconHeart filled={liked} />
        </button>
      </div>
    </>
  )
}
