'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function MeusDadosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [initials, setInitials] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    (async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/produtor'); return }
      setEmail(user.email ?? '')
      const { data } = await supabase
        .from('profiles')
        .select('name, avatar_initials, cpf')
        .eq('id', user.id)
        .single()
      if (data) {
        setName(data.name ?? '')
        setInitials(data.avatar_initials ?? getInitials(data.name ?? ''))
        setCpf(data.cpf ?? '')
      }
      setLoading(false)
    })()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [router])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) { setError('Nome deve ter pelo menos 2 caracteres'); return }
    if (trimmed.length > 50) { setError('Nome deve ter no máximo 50 caracteres'); return }
    setError('')
    setSaving(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/produtor'); return }
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
    setInitials(json.avatar_initials ?? getInitials(trimmed))
    setSuccess(true)
    timerRef.current = setTimeout(() => router.push('/produtor/perfil'), 2000)
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

  const fieldBase: React.CSSProperties = {
    background: '#fff',
    border: '1.5px solid #E5E5EA',
    borderRadius: 12,
    padding: '10px 14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 600,
    color: '#6E6E73', letterSpacing: 0.5,
    textTransform: 'uppercase',
  }

  const inputStyle: React.CSSProperties = {
    border: 'none', background: 'none',
    fontSize: 16, fontFamily: "'Noto Sans', sans-serif",
    color: '#1A1A1A', outline: 'none',
    width: '100%', padding: 0,
  }

  function LockIcon() {
    return (
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
        <button
          onClick={() => router.back()}
          style={{
            position: 'absolute', left: 16,
            width: 36, height: 36, borderRadius: '50%',
            background: '#F7F7F7', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4.5L6.5 9L11 13.5" stroke="#1A1A1A" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 700, color: '#1A1A1A',
        }}>
          Meus dados
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: '32px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: 22,
          background: '#0EA5A0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff',
          letterSpacing: -0.5, flexShrink: 0,
        }}>
          {initials}
        </div>

        {/* Campos */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Nome — editável */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ ...fieldBase, border: error ? '1.5px solid #FF3B30' : '1.5px solid #E5E5EA' }}>
              <label style={labelStyle}>Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                  setInitials(getInitials(e.target.value))
                }}
                maxLength={50}
                style={inputStyle}
              />
            </div>
            {error && (
              <span style={{ fontSize: 13, color: '#FF3B30', marginTop: 2 }}>{error}</span>
            )}
          </div>

          {/* CPF — somente leitura */}
          <div style={{ ...fieldBase, background: '#F4F4F4' }}>
            <label style={labelStyle}>CPF</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={cpf ? formatCPF(cpf) : '—'}
                readOnly
                style={{ ...inputStyle, color: '#6E6E73' }}
              />
              <LockIcon />
            </div>
          </div>

          {/* E-mail — somente leitura */}
          <div style={{ ...fieldBase, background: '#F4F4F4' }}>
            <label style={labelStyle}>E-mail</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="email"
                value={email}
                readOnly
                style={{ ...inputStyle, color: '#6E6E73', minWidth: 0 }}
              />
              <LockIcon />
            </div>
          </div>

        </div>

        {/* Botão salvar */}
        <button
          onClick={handleSave}
          disabled={saving || success}
          style={{
            width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 15px',
            borderRadius: 14,
            background: saving || success ? '#7DCFCC' : '#0EA5A0',
            border: 'none', fontSize: 15, fontWeight: 700,
            color: '#fff', fontFamily: "'Noto Sans', sans-serif",
            cursor: saving || success ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>

        {success && (
          <div style={{ fontSize: 14, fontWeight: 600, color: '#16A34A' }}>
            Nome atualizado!
          </div>
        )}

      </div>
    </div>
  )
}
