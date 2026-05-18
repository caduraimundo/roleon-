'use client'

import { useRouter } from 'next/navigation'
import { BackButton } from '../../../components/BackButton'

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

const BTN: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 999,
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(10px)',
  border: 0, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#1A1A1A',
  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
}

const TOP = 'calc(env(safe-area-inset-top, 0px) + 10px)'

export default function HeroActions({ title }: { title: string }) {
  const router = useRouter()

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
    }
  }

  return (
    <>
      <div style={{ position: 'absolute', top: TOP, left: 16 }}>
        <BackButton variant="overlay" />
      </div>

      <div style={{ position: 'absolute', top: TOP, right: 16 }}>
        <button onClick={handleShare} aria-label="Compartilhar" style={BTN}>
          <IconShare />
        </button>
      </div>
    </>
  )
}
