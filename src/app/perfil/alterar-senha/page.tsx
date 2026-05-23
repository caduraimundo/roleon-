'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { BackButton } from '../../../components/BackButton'

// ── Ícone olho ────────────────────────────────────────────────────────────────

function IconEye({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

// ── Campo de senha ────────────────────────────────────────────────────────────

function PasswordField({
  label,
  value,
  onChange,
  error,
  show,
  onToggleShow,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  show: boolean
  onToggleShow: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        background: '#fff',
        border: `1.5px solid ${error ? '#FF3B30' : '#E5E5EA'}`,
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'border-color 0.15s',
      }}>
        <label style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: 0.5,
          color: '#6E6E73', textTransform: 'uppercase',
        }}>
          {label}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              fontSize: 15,
              fontFamily: "'Noto Sans', sans-serif",
              color: '#1A1A1A',
              outline: 'none',
              padding: 0,
              minWidth: 0,
            }}
          />
          <button
            type="button"
            onClick={onToggleShow}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center',
            }}
          >
            <IconEye visible={show} />
          </button>
        </div>
      </div>
      {error && (
        <span style={{ fontSize: 13, color: '#FF3B30' }}>{error}</span>
      )}
    </div>
  )
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AlterarSenhaPage() {
  const router = useRouter()

  const [atual, setAtual]           = useState('')
  const [nova, setNova]             = useState('')
  const [confirmar, setConfirmar]   = useState('')
  const [showAtual, setShowAtual]   = useState(false)
  const [showNova, setShowNova]     = useState(false)
  const [showConf, setShowConf]     = useState(false)
  const [errorNova, setErrorNova]   = useState('')
  const [errorConf, setErrorConf]   = useState('')
  const [errorGeral, setErrorGeral] = useState('')
  const [saving, setSaving]         = useState(false)
  const [success, setSuccess]       = useState(false)
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const validateNova = (v: string) => {
    if (v.length > 0 && v.length < 8) return 'A senha deve ter pelo menos 8 caracteres'
    return ''
  }

  const validateConf = (v: string, n: string) => {
    if (v.length > 0 && v !== n) return 'As senhas não coincidem'
    return ''
  }

  const isValid =
    atual.length > 0 &&
    nova.length >= 8 &&
    confirmar === nova &&
    !errorNova &&
    !errorConf

  const handleSave = async () => {
    if (!isValid || saving) return

    const novaErr = validateNova(nova)
    const confErr = validateConf(confirmar, nova)
    if (novaErr) { setErrorNova(novaErr); return }
    if (confErr) { setErrorConf(confErr); return }

    setSaving(true)
    setErrorGeral('')

    const { error } = await supabase.auth.updateUser({ password: nova })

    setSaving(false)

    if (error) {
      setErrorGeral(error.message ?? 'Erro ao alterar senha. Tente novamente.')
      return
    }

    setSuccess(true)
    timerRef.current = setTimeout(() => router.push('/perfil/configuracoes'), 2000)
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
          Alterar senha
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: '32px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <PasswordField
            label="Senha atual"
            value={atual}
            onChange={setAtual}
            show={showAtual}
            onToggleShow={() => setShowAtual((v) => !v)}
          />

          <PasswordField
            label="Nova senha"
            value={nova}
            onChange={(v) => {
              setNova(v)
              setErrorNova(validateNova(v))
              if (confirmar) setErrorConf(validateConf(confirmar, v))
            }}
            error={errorNova}
            show={showNova}
            onToggleShow={() => setShowNova((v) => !v)}
          />

          <PasswordField
            label="Confirmar nova senha"
            value={confirmar}
            onChange={(v) => {
              setConfirmar(v)
              setErrorConf(validateConf(v, nova))
            }}
            error={errorConf}
            show={showConf}
            onToggleShow={() => setShowConf((v) => !v)}
          />

        </div>

        {errorGeral && (
          <span style={{ fontSize: 14, color: '#FF3B30', textAlign: 'center' }}>
            {errorGeral}
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={!isValid || saving || success}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 14,
            background: !isValid || success ? '#7DCFCC' : '#0EA5A0',
            border: 'none',
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'Noto Sans', sans-serif",
            cursor: !isValid || saving || success ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>

        {success && (
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: '#16A34A', textAlign: 'center',
          }}>
            Senha alterada com sucesso!
          </div>
        )}

      </div>
    </div>
  )
}
