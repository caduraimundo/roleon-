'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { BackButton } from '../../../components/BackButton'
import { getInitials } from '../../../lib/getInitials'

export default function EditarPerfilPage() {
  const router = useRouter()

  const [loading, setLoading]   = useState(true)
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [isGoogle, setIsGoogle] = useState(false)
  const [initials, setInitials] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.replace('/login'); return }

      setEmail(user.email ?? '')
      setIsGoogle(session.user.app_metadata?.provider === 'google')

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_initials')
        .eq('id', user.id)
        .maybeSingle()
      const displayName = profile?.name ?? ''
      setName(displayName)
      setInitials(profile?.avatar_initials ?? getInitials(displayName))
      setLoading(false)
    }
    load()

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [router])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) { setError('Nome deve ter pelo menos 2 caracteres'); return }
    if (trimmed.length > 50) { setError('Nome deve ter no máximo 50 caracteres'); return }
    setError('')
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/perfil'); return }

    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name: trimmed }),
    })

    setSaving(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Erro ao salvar. Tente novamente.')
      return
    }

    const json = await res.json()
    setInitials(json.avatar_initials)
    setSuccess(true)
    router.refresh()
    timerRef.current = setTimeout(() => router.push('/perfil'), 2000)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#F7F7F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto Sans', sans-serif", fontSize: 14, color: '#6E6E73',
      }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#F7F7F7',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 16, paddingRight: 16,
        background: '#fff',
        borderBottom: '0.5px solid #EFEFEF',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 16 }}>
          <BackButton />
        </div>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 700, color: '#1A1A1A',
        }}>
          Editar perfil
        </div>
      </div>

      {/* Conteudo */}
      <div style={{ flex: 1, padding: '32px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: 999,
          background: '#0EA5A0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff',
          letterSpacing: -0.5, flexShrink: 0,
        }}>
          {initials}
        </div>

        {/* Campos */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Campo Nome */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            background: '#fff',
            border: error ? '1.5px solid #FF3B30' : '1.5px solid #E5E5EA',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
            transition: 'border-color 0.15s',
          }}>
            <label style={{ fontSize: 10.5, fontWeight: 600, color: '#6E6E73', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Nome Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
                setInitials(getInitials(e.target.value))
              }}
              maxLength={50}
              style={{
                border: 'none',
                background: 'none',
                fontSize: 16,
                fontFamily: "'Noto Sans', sans-serif",
                color: '#1A1A1A',
                outline: 'none',
                width: '100%',
                padding: 0,
              }}
            />
          </div>
          {error && (
            <span style={{ fontSize: 13, color: '#FF3B30', marginTop: 2 }}>
              {error}
            </span>
          )}
        </div>

        {/* Campo Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            background: '#F4F4F4',
            border: '1.5px solid #E5E5EA',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <label style={{ fontSize: 10.5, fontWeight: 600, color: '#6E6E73', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              E-mail
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="email"
                value={email}
                readOnly
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  fontSize: 16,
                  fontFamily: "'Noto Sans', sans-serif",
                  color: '#6E6E73',
                  outline: 'none',
                  padding: 0,
                  minWidth: 0,
                }}
              />
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#EEE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6E6E73', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
            </div>
          </div>
          {isGoogle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#6E6E73' }}>
              <svg width="12" height="12" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" fill="#34A853"/>
                <path d="M3.97 10.72A5.41 5.41 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" fill="#FBBC05"/>
                <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.96 8.96 0 009 0 9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Vinculado ao Google
            </div>
          )}
        </div>

        </div>{/* fim Campos */}

        {/* Botao Salvar */}
        <button
          onClick={handleSave}
          disabled={saving || success}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            background: saving || success ? '#7DCFCC' : '#0EA5A0',
            border: 'none',
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'Noto Sans', sans-serif",
            cursor: saving || success ? 'default' : 'pointer',
            letterSpacing: 0.1,
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>

        {/* Mensagem de sucesso */}
        {success && (
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: '#16A34A',
          }}>
            Nome atualizado!
          </div>
        )}

      </div>
    </div>
  )
}
