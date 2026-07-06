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
  const [phoneDdd, setPhoneDdd] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneError, setPhoneError] = useState('')
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
    if (phoneDdd.length !== 2) { setPhoneError('Informe o DDD (2 dígitos).'); return }
    if (!phoneNumber.trim()) { setPhoneError('Informe o número de telefone.'); return }

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
        body: JSON.stringify({ cpf, birthdate, name, phone_ddd: phoneDdd, phone_number: phoneNumber }),
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

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6E6E73', marginBottom: 6, display: 'block' }

  const inp = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', borderRadius: 10,
    border: hasError ? '1px solid #FF3B30' : '1px solid #E8E8E8',
    background: '#fff',
    fontSize: 14, color: '#1A1A1A', outline: 'none',
    fontFamily: "'Noto Sans', sans-serif",
  })

  function LockIcon() {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: '#EEE',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#6E6E73', flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
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
          <label style={lbl}>Nome</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setNameError('') }}
            style={inp(!!nameError)}
          />
          {nameError && (
            <span style={{ fontSize: 13, color: '#FF3B30' }}>{nameError}</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>E-mail</label>
          <div style={{ ...inp(), padding: '8px 14px', minHeight: 46.14, display: 'flex', alignItems: 'center', gap: 8, background: '#F4F4F4' }}>
            <input
              value={userEmail}
              readOnly
              style={{
                flex: 1, minWidth: 0, padding: 0,
                border: 'none', background: 'transparent', outline: 'none',
                fontSize: 14, color: '#6E6E73', fontFamily: "'Noto Sans', sans-serif",
              }}
            />
            <LockIcon />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>CPF</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={e => { setCpf(maskCpf(e.target.value)); setCpfError('') }}
            onBlur={() => { if (cpf && !validateCPF(cpf)) setCpfError('CPF inválido') }}
            style={inp(!!cpfError)}
          />
          {cpfError && (
            <span style={{ fontSize: 13, color: '#FF3B30' }}>{cpfError}</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Data de nascimento</label>
          <input
            type="date"
            value={birthdate}
            onChange={e => { setBirthdate(e.target.value); setBirthdateError('') }}
            style={{ ...inp(!!birthdateError), minWidth: 0, display: 'block' }}
          />
          {birthdateError && (
            <span style={{ fontSize: 13, color: '#FF3B30' }}>{birthdateError}</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 90, flexShrink: 0 }}>
              <label style={lbl}>DDD</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="31"
                maxLength={2}
                value={phoneDdd}
                onChange={e => { setPhoneDdd(e.target.value.replace(/\D/g, '').slice(0, 2)); setPhoneError('') }}
                style={inp(!!phoneError)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Telefone</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="999999999"
                maxLength={9}
                value={phoneNumber}
                onChange={e => { setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9)); setPhoneError('') }}
                style={inp(!!phoneError)}
              />
            </div>
          </div>
          {phoneError && (
            <span style={{ fontSize: 13, color: '#FF3B30' }}>{phoneError}</span>
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
