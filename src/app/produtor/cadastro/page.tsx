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
  const [userName, setUserName] = useState('')
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

      setUserName(profile?.name ?? '')
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

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#6E6E73',
    marginBottom: 6,
  }

  const readonlyInput: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #E8E8E8',
    background: '#F5F5F5',
    color: '#6E6E73',
    fontSize: 14,
    boxSizing: 'border-box',
  }

  const editableInput = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: hasError ? '1px solid #FF3B30' : '1px solid #E8E8E8',
    background: '#fff',
    color: '#1A1A1A',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  })

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      paddingTop: 60,
      paddingBottom: 40,
      minHeight: 'calc(100vh - 56px)',
    }}>
      <div style={{
        width: 480,
        background: '#fff',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        alignSelf: 'flex-start',
      }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
          Complete seu cadastro como produtor
        </p>
        <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 6, marginBottom: 28 }}>
          Preencha seus dados para publicar eventos no Roleon
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>Nome</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setNameError('') }}
            style={editableInput(!!nameError)}
          />
          {nameError && (
            <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 4, marginBottom: 0 }}>
              {nameError}
            </p>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>E-mail</label>
          <input value={userEmail} readOnly style={readonlyInput} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>CPF</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={e => { setCpf(maskCpf(e.target.value)); setCpfError('') }}
            onBlur={() => { if (cpf && !validateCPF(cpf)) setCpfError('CPF inválido') }}
            style={editableInput(!!cpfError)}
          />
          {cpfError && (
            <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 4, marginBottom: 0 }}>
              {cpfError}
            </p>
          )}
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={fieldLabel}>Data de nascimento</label>
          <input
            type="date"
            value={birthdate}
            onChange={e => { setBirthdate(e.target.value); setBirthdateError('') }}
            style={editableInput(!!birthdateError)}
          />
          {birthdateError ? (
            <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 4, marginBottom: 0 }}>
              {birthdateError}
            </p>
          ) : (
            <p style={{ fontSize: 12, color: '#6E6E73', marginTop: 4, marginBottom: 0 }}>
              Usaremos para confirmar que você é maior de idade
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 20, marginBottom: 20 }}>
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
            marginBottom: 16,
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
    </div>
  )
}
