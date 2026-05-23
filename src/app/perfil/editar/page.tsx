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
  const [initials, setInitials] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/perfil'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_initials')
        .eq('id', user.id)
        .single()

      const displayName = profile?.name ?? ''
      setName(displayName)
      setInitials(profile?.avatar_initials ?? getInitials(displayName))
      setLoading(false)
    })

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
    timerRef.current = setTimeout(() => router.push('/perfil'), 2000)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#F9F9F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto Sans', sans-serif", fontSize: 14, color: '#6E6E73',
      }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
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

        {/* Campo Nome */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', letterSpacing: 0.2 }}>
            Nome
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
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: error ? '1.5px solid #FF3B30' : '1.5px solid #E5E5EA',
              background: '#fff',
              fontSize: 16,
              fontFamily: "'Noto Sans', sans-serif",
              color: '#1A1A1A',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
          />
          {error && (
            <span style={{ fontSize: 13, color: '#FF3B30', marginTop: 2 }}>
              {error}
            </span>
          )}
        </div>

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
