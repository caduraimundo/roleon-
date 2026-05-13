'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function IconEye({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M3 3l14 14M8.5 8.7A2 2 0 0011.3 11.5M6.5 5.8C4.6 7 3.2 8.8 2 10c2 3 5 5 8 5 1.4 0 2.7-.4 3.8-1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10.5 5.1C13.5 5.5 16 7.5 18 10c-.7.9-1.5 1.7-2.4 2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M2 10c2-4 5-6 8-6s6 2 8 6c-2 4-5 6-8 6s-6-2-8-6z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

const INPUT: React.CSSProperties = {
  width: '100%', background: '#F6F6F6', border: 'none',
  borderRadius: 10, padding: '13px 14px', fontSize: 14.5,
  fontFamily: "'Noto Sans', sans-serif", color: '#1A1A1A',
  outline: 'none', boxSizing: 'border-box',
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwdError,    setPwdError]    = useState<string | null>(null)
  const [confirmError,setConfirmError]= useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError(null); setConfirmError(null); setError(null)

    let hasError = false
    if (password.length < 8) { setPwdError('Mínimo 8 caracteres'); hasError = true }
    if (password !== confirm) { setConfirmError('As senhas não conferem'); hasError = true }
    if (hasError) return

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError('Algo deu errado. Tente novamente.'); return }
    router.replace('/')
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '0.5px solid #EFEFEF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 52,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Redefinir senha</span>
      </div>

      {/* Formulário */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Nova senha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwdError(null) }}
                required
                style={{ ...INPUT, paddingRight: 44, ...(pwdError ? { border: '1.5px solid #E05555' } : {}) }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 0, cursor: 'pointer', color: '#9A9A9A',
                  display: 'flex', alignItems: 'center', padding: 0,
                }}
              >
                <IconEye hidden={!showPwd} />
              </button>
            </div>
            {pwdError ? (
              <span style={{ fontSize: 12, color: '#E05555', fontWeight: 500, paddingLeft: 4 }}>{pwdError}</span>
            ) : (
              <span style={{ fontSize: 12, color: '#6E6E73', paddingLeft: 4 }}>Mínimo 8 caracteres</span>
            )}
          </div>

          {/* Confirmar senha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirmar nova senha"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setConfirmError(null) }}
                required
                style={{ ...INPUT, paddingRight: 44, ...(confirmError ? { border: '1.5px solid #E05555' } : {}) }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 0, cursor: 'pointer', color: '#9A9A9A',
                  display: 'flex', alignItems: 'center', padding: 0,
                }}
              >
                <IconEye hidden={!showConfirm} />
              </button>
            </div>
            {confirmError && (
              <span style={{ fontSize: 12, color: '#E05555', fontWeight: 500, paddingLeft: 4 }}>{confirmError}</span>
            )}
          </div>

          {error && (
            <div style={{ fontSize: 12.5, color: '#E05555', fontWeight: 500 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: loading ? '#7DCFCD' : '#0EA5A0',
              color: '#fff', border: 0, cursor: loading ? 'default' : 'pointer',
              padding: '14px 18px', borderRadius: 12,
              fontSize: 15, fontWeight: 700,
              fontFamily: "'Noto Sans', sans-serif",
              boxShadow: '0 6px 16px rgba(14,165,160,0.25)',
              marginTop: 4,
              transition: 'background 200ms',
            }}
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
