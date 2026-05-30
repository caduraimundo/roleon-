'use client'
import { useSmartBack } from '../hooks/useSmartBack'

export function BackButton({ variant = 'default', fallback = '/' }: { variant?: 'default' | 'overlay'; fallback?: string }) {
  const goBack = useSmartBack(fallback)

  if (variant === 'overlay') {
    return (
      <button onClick={goBack} aria-label="Voltar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFFFFF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', flexShrink: 0 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    )
  }

  return (
    <button onClick={goBack} aria-label="Voltar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F2F2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', flexShrink: 0 }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
  )
}
