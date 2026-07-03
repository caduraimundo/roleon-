'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { validateCPF } from '../../../lib/cpf'
import { validateName } from '../../../lib/validateName'

function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6)
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9)
}

function isAtLeast18(dateStr: string): boolean {
  if (!dateStr) return false
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 18
}

export default function CadastroProdutorPage() {
  const router = useRouter()
  const [cpf, setCpf] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [name, setName] = useState('')
  const [cpfError, setCpfError] = useState('')
  const [birthdateError, setBirthdateError] = useState('')
  const [nameError, setNameError] = useState('')
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/produtor'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, role, cpf')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'producer') { router.replace('/produtor/painel'); return }

      setName(profile?.name ?? '')
      setUserEmail(profile?.email ?? user.email ?? '')
    }
    init()
  }, [router])

  const handleSubmit = async () => {
    const nameValidationError = validateName(name)
    if (nameValidationError) { setNameError(nameValidationError); return }
    if (!validateCPF(cpf)) { setCpfError('CPF inválido'); return }
    if (!birthdate) { setBirthdateError('Data de nascimento obrigatória'); return }
    if (!isAtLeast18(birthdate)) { setBirthdateError('Você precisa ter 18 anos ou mais para se cadastrar como produtor.'); return }

    setLoading(true)
    setApiError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/produtor/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ cpf, birthdate, name }),
      })
      if (res.ok) {
        router.replace('/produtor/painel')
      } else {
        const data = await res.json()
        setApiError(data.error || 'Erro ao salvar. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fieldBase = (hasError?: boolean): React.CSSProperties => ({
    background: '#fff',
    border: hasError ? '1.5px solid #FF3B30' : '1.5px solid #E5E5EA',
    borderRadius: 12,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  })

  const labelStyle: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 600,
    color: '#6E6E73',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }

  const inputStyle: React.CSSProperties = {
    border: 'none',
    background: 'none',
    fontSize: 16,
    fontFamily: "'Noto Sans', sans-serif",
    color: '#1A1A1A',
    outline: 'none',
    width: '100%',
    padding: 0,
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
    <div style={{ padding: '32px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480, margin: '0 auto' }}>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
          Complete seu cadastro como produtor
        </p>
        <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 6, marginBottom: 0 }}>
          Preencha seus dados para publicar eventos no Roleon
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={fieldBase(!!nameError)}>
            <label style={labelStyle}>Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setNameError('') }}
              style={inputStyle}
            />
          </div>
          {nameError && (
            <span style={{ fontSize: 13, color: '#FF3B30' }}>{nameError}</span>
          )}
        </div>

        <div style={{ ...fieldBase(), background: '#F4F4F4' }}>
          <label style={labelStyle}>E-mail</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input value={userEmail} readOnly style={{ ...inputStyle, color: '#6E6E73' }} />
            <LockIcon />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={fieldBase(!!cpfError)}>
            <label style={labelStyle}>CPF</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={e => { setCpf(maskCpf(e.target.value)); setCpfError('') }}
              onBlur={() => { if (cpf && !validateCPF(cpf)) setCpfError('CPF inválido') }}
              style={inputStyle}
            />
          </div>
          {cpfError && (
            <span style={{ fontSize: 13, color: '#FF3B30' }}>{cpfError}</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={fieldBase(!!birthdateError)}>
            <label style={labelStyle}>Data de nascimento</label>
            <input
              type="date"
              value={birthdate}
              onChange={e => { setBirthdate(e.target.value); setBirthdateError('') }}
              style={inputStyle}
            />
          </div>
          {birthdateError ? (
            <span style={{ fontSize: 13, color: '#FF3B30' }}>{birthdateError}</span>
          ) : (
            <span style={{ fontSize: 12, color: '#6E6E73' }}>Usaremos para confirmar que você é maior de idade</span>
          )}
        </div>

      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="7" cy="7" r="6" stroke="#6E6E73" strokeWidth="1.4"/>
          <path d="M7 6v4M7 4.5v.5" stroke="#6E6E73" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>
          Seu CPF não poderá ser alterado após o cadastro. Certifique-se de que os dados estão corretos.
        </p>
      </div>

      {apiError && (
        <div style={{
          background: '#FFF0F0',
          border: '1px solid #FFD0D0',
          borderRadius: 10,
          padding: '12px 14px',
          color: '#C0392B',
          fontSize: 14,
        }}>
          {apiError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: '100%',
          height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 15px',
          borderRadius: 14,
          border: 'none',
          background: loading ? '#7DCFCC' : '#0EA5A0',
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? 'Salvando...' : 'Cadastrar como produtor'}
      </button>
    </div>
  )
}
