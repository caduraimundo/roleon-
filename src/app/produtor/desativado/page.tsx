'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const TEAL  = '#0EA5A0'
const TEXT  = '#1A1A1A'
const DIM   = '#6E6E73'
const BG    = '#F7F7F7'
const WHITE = '#FFFFFF'
const BORDER = '#E5E5EA'

export default function ContaDesativada() {
  const router = useRouter()

  const handleSair = async () => {
    await supabase.auth.signOut()
    router.replace('/produtor')
  }

  return (
    <div style={{
      minHeight: '100dvh', background: BG,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      <div style={{
        background: WHITE, borderRadius: 16,
        border: `1px solid ${BORDER}`,
        padding: '32px 24px',
        width: '100%', maxWidth: 400,
        textAlign: 'center',
      }}>
        {/* Ícone */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: '#FEF2F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#FF3B30" strokeWidth="1.6"/>
            <path d="M12 7v5M12 16v.5" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Título */}
        <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 10, letterSpacing: -0.3 }}>
          Conta desativada
        </div>

        {/* Mensagem */}
        <div style={{ fontSize: 14, color: DIM, lineHeight: 1.6, marginBottom: 24 }}>
          Sua conta de produtor foi desativada pelo time Roleon.
          Entre em contato para mais informações ou para solicitar a reativação.
        </div>

        {/* Email */}
        <div style={{
          background: '#F7F7F7', borderRadius: 10,
          padding: '12px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="4" width="16" height="12" rx="2" stroke={TEAL} strokeWidth="1.5"/>
            <path d="M2 7l8 5 8-5" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: TEAL }}>contato@roleon.com.br</span>
        </div>

        {/* Botão sair */}
        <button
          onClick={handleSair}
          style={{
            width: '100%', padding: '13px 0',
            background: TEXT, color: WHITE,
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Noto Sans', sans-serif",
          }}
        >
          Sair da conta
        </button>
      </div>

      {/* Rodapé */}
      <div style={{ fontSize: 12, color: DIM, marginTop: 20 }}>Roleon - Ouro Preto & Mariana</div>
    </div>
  )
}
