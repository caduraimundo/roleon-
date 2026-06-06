'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú' },
  { code: '077', name: 'Banco Inter' },
  { code: '260', name: 'Nubank' },
  { code: '336', name: 'C6 Bank' },
  { code: '655', name: 'Neon' },
  { code: '212', name: 'Banco Original' },
  { code: '323', name: 'Mercado Pago' },
  { code: '290', name: 'PagBank' },
  { code: '380', name: 'PicPay' },
  { code: '756', name: 'Sicoob' },
]

type Form = {
  mother_name: string; birthdate: string; monthly_income: string
  professional_occupation: string; phone_ddd: string; phone_number: string
  address_cep: string; address_street: string; address_number: string
  address_complement: string; address_neighborhood: string
  address_city: string; address_state: string; address_reference: string
  bank_code: string; bank_agency: string; bank_agency_digit: string
  bank_account: string; bank_account_digit: string; bank_account_type: string
  bank_holder_name: string
}

const EMPTY: Form = {
  mother_name: '', birthdate: '', monthly_income: '',
  professional_occupation: '', phone_ddd: '', phone_number: '',
  address_cep: '', address_street: '', address_number: '',
  address_complement: '', address_neighborhood: '',
  address_city: '', address_state: '', address_reference: '',
  bank_code: '', bank_agency: '', bank_agency_digit: '',
  bank_account: '', bank_account_digit: '', bank_account_type: 'checking',
  bank_holder_name: '',
}

function centsToDisplay(cents: number | null): string {
  if (!cents) return ''
  return (cents / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function displayToCents(display: string): number {
  return Math.round(parseFloat(display.replace(/\./g, '').replace(',', '.')) * 100) || 0
}

export default function ContaBancariaPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveWarning, setSaveWarning] = useState('')

  useEffect(() => {
    (async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/produtor'); return }
      const { data } = await supabase
        .from('profiles')
        .select('mother_name,birthdate,monthly_income,professional_occupation,phone_ddd,phone_number,address_cep,address_street,address_number,address_complement,address_neighborhood,address_city,address_state,address_reference,bank_code,bank_agency,bank_agency_digit,bank_account,bank_account_digit,bank_account_type,bank_holder_name')
        .eq('id', user.id)
        .single()
      if (data) {
        setForm({
          mother_name: data.mother_name || '',
          birthdate: data.birthdate || '',
          monthly_income: centsToDisplay(data.monthly_income),
          professional_occupation: data.professional_occupation || '',
          phone_ddd: data.phone_ddd || '',
          phone_number: data.phone_number || '',
          address_cep: data.address_cep || '',
          address_street: data.address_street || '',
          address_number: data.address_number || '',
          address_complement: data.address_complement || '',
          address_neighborhood: data.address_neighborhood || '',
          address_city: data.address_city || '',
          address_state: data.address_state || '',
          address_reference: data.address_reference || '',
          bank_code: data.bank_code || '',
          bank_agency: data.bank_agency || '',
          bank_agency_digit: data.bank_agency_digit || '',
          bank_account: data.bank_account || '',
          bank_account_digit: data.bank_account_digit || '',
          bank_account_type: data.bank_account_type || 'checking',
          bank_holder_name: data.bank_holder_name || '',
        })
      }
      setLoading(false)
    })()
  }, [router])

  function set(field: keyof Form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function fetchCep(cep: string) {
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          address_street: data.logradouro || prev.address_street,
          address_neighborhood: data.bairro || prev.address_neighborhood,
          address_city: data.localidade || prev.address_city,
          address_state: data.uf || prev.address_state,
        }))
      }
    } catch {}
    setCepLoading(false)
  }

  function validateStep(): string {
    if (step === 1) {
      if (!form.mother_name.trim()) return 'Informe o nome da mãe.'
      if (!form.birthdate) return 'Informe a data de nascimento.'
      if (!form.monthly_income) return 'Informe a renda mensal.'
      if (!form.professional_occupation.trim()) return 'Informe a ocupação profissional.'
      if (form.phone_ddd.length !== 2) return 'Informe o DDD (2 dígitos).'
      if (!form.phone_number.trim()) return 'Informe o número de telefone.'
    }
    if (step === 2) {
      if (form.address_cep.length !== 8) return 'Informe o CEP (8 dígitos).'
      if (!form.address_street.trim()) return 'Informe a rua.'
      if (!form.address_number.trim()) return 'Informe o número.'
      if (!form.address_neighborhood.trim()) return 'Informe o bairro.'
      if (!form.address_city.trim()) return 'Informe a cidade.'
      if (!form.address_state.trim()) return 'Informe o estado.'
    }
    if (step === 3) {
      if (!form.bank_holder_name.trim()) return 'Informe o nome do titular da conta.'
      if (!form.bank_code) return 'Selecione o banco.'
      if (!form.bank_agency.trim()) return 'Informe a agência.'
      if (!form.bank_account.trim()) return 'Informe o número da conta.'
      if (!form.bank_account_digit.trim()) return 'Informe o dígito da conta.'
    }
    return ''
  }

  async function handleNext() {
    const err = validateStep()
    if (err) { setError(err); return }
    if (step < 3) { setStep(s => s + 1); setError(''); return }
    setSaving(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/produtor/banking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ ...form, monthly_income: displayToCents(form.monthly_income) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar dados.')
      if (json.warning) {
        setSaveWarning(json.warning)
      } else {
        setSaved(true)
        setTimeout(() => router.push('/produtor/perfil'), 1800)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '12px 14px', borderRadius: 10,
    border: '1px solid #E8E8E8', background: '#fff',
    fontSize: 14, color: '#1A1A1A', outline: 'none',
    fontFamily: "'Noto Sans', sans-serif",
  }
  const lbl = { fontSize: 12, fontWeight: 600 as const, color: '#6E6E73', marginBottom: 6, display: 'block' as const }
  const fld = { display: 'flex' as const, flexDirection: 'column' as const, gap: 0 }
  const stepTitles = ['Dados pessoais', 'Endereço', 'Conta bancária']

  if (loading) return (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9A9A9A', fontSize: 14, fontFamily: "'Noto Sans', sans-serif" }}>
      Carregando...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F9F9', fontFamily: "'Noto Sans', sans-serif", paddingBottom: 110 }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff', borderBottom: '1px solid #E8E8E8',
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
      }}>
        <button
          onClick={() => step > 1 ? (setStep(s => s - 1), setError('')) : router.back()}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#F2F2F2', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5.5 8L10 13" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>Conta bancária para repasse</span>
        <div style={{ width: 36 }} />
      </header>

      {/* Stepper */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: s < 3 ? 1 : 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: step >= s ? '#0EA5A0' : '#E8E8E8',
              color: step >= s ? '#fff' : '#9A9A9A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
            }}>
              {step > s ? (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5L6.5 12 13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : s}
            </div>
            {s < 3 && <div style={{ flex: 1, height: 2, marginLeft: 8, background: step > s ? '#0EA5A0' : '#E8E8E8' }} />}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ fontSize: 12, color: '#9A9A9A', fontWeight: 500 }}>Passo {step} de 3</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', letterSpacing: -0.3, marginTop: 2, marginBottom: 20 }}>
          {stepTitles[step - 1]}
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {step === 1 && <>
          <div style={fld}>
            <label style={lbl}>Nome da mãe</label>
            <input value={form.mother_name} onChange={e => set('mother_name', e.target.value)}
              placeholder="Nome completo da mãe" style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Data de nascimento</label>
            <input type="date" value={form.birthdate} onChange={e => set('birthdate', e.target.value)} style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Renda mensal</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#6E6E73', fontFamily: "'Noto Sans', sans-serif" }}>R$</span>
              <input value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)}
                placeholder="0,00" style={{ ...inp, paddingLeft: 36 }} />
            </div>
          </div>
          <div style={fld}>
            <label style={lbl}>Ocupação profissional</label>
            <input value={form.professional_occupation} onChange={e => set('professional_occupation', e.target.value)}
              placeholder="Ex: Produtor de eventos" style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...fld, width: 80, flexShrink: 0 }}>
              <label style={lbl}>DDD</label>
              <input value={form.phone_ddd} onChange={e => set('phone_ddd', e.target.value.replace(/\D/g,'').slice(0,2))}
                placeholder="31" maxLength={2} style={inp} />
            </div>
            <div style={{ ...fld, flex: 1 }}>
              <label style={lbl}>Telefone</label>
              <input value={form.phone_number} onChange={e => set('phone_number', e.target.value.replace(/\D/g,'').slice(0,9))}
                placeholder="999999999" maxLength={9} style={inp} />
            </div>
          </div>
        </>}

        {step === 2 && <>
          <div style={fld}>
            <label style={lbl}>CEP</label>
            <div style={{ position: 'relative' }}>
              <input value={form.address_cep}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g,'').slice(0,8)
                  set('address_cep', val)
                  if (val.length === 8) fetchCep(val)
                }}
                placeholder="00000000" maxLength={8} style={inp} />
              {cepLoading && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9A9A9A' }}>Buscando...</span>}
            </div>
          </div>
          <div style={fld}>
            <label style={lbl}>Rua / Avenida</label>
            <input value={form.address_street} onChange={e => set('address_street', e.target.value)}
              placeholder="Nome da rua" style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...fld, width: 100, flexShrink: 0 }}>
              <label style={lbl}>Número</label>
              <input value={form.address_number} onChange={e => set('address_number', e.target.value)}
                placeholder="123" style={inp} />
            </div>
            <div style={{ ...fld, flex: 1 }}>
              <label style={lbl}>Complemento</label>
              <input value={form.address_complement} onChange={e => set('address_complement', e.target.value)}
                placeholder="Apto, sala... (opcional)" style={inp} />
            </div>
          </div>
          <div style={fld}>
            <label style={lbl}>Ponto de referência</label>
            <input value={form.address_reference} onChange={e => set('address_reference', e.target.value)}
              placeholder="Próximo a..." style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Bairro</label>
            <input value={form.address_neighborhood} onChange={e => set('address_neighborhood', e.target.value)}
              placeholder="Bairro" style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...fld, flex: 1 }}>
              <label style={lbl}>Cidade</label>
              <input value={form.address_city} onChange={e => set('address_city', e.target.value)}
                placeholder="Cidade" style={inp} />
            </div>
            <div style={{ ...fld, width: 72, flexShrink: 0 }}>
              <label style={lbl}>Estado</label>
              <input value={form.address_state} onChange={e => set('address_state', e.target.value.toUpperCase().slice(0,2))}
                placeholder="MG" maxLength={2} style={inp} />
            </div>
          </div>
        </>}

        {step === 3 && <>
          <div style={fld}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6E6E73' }}>Nome do titular da conta bancária</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: form.bank_holder_name.length >= 28 ? '#C0392B' : '#9A9A9A' }}>
                {form.bank_holder_name.length}/30
              </span>
            </div>
            <input value={form.bank_holder_name}
              onChange={e => set('bank_holder_name', e.target.value)}
              placeholder="Ex: Carlos E O Raimundo"
              maxLength={30}
              style={inp} />
            <span style={{ fontSize: 11, color: '#9A9A9A', marginTop: 4, lineHeight: 1.4 }}>
              Nome como consta na conta bancária. Limite de 30 caracteres.
            </span>
          </div>
          <div style={fld}>
            <label style={lbl}>Banco</label>
            <select value={form.bank_code} onChange={e => set('bank_code', e.target.value)} style={inp}>
              <option value="">Selecione o banco</option>
              {BANKS.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...fld, flex: 1 }}>
              <label style={lbl}>Agência</label>
              <input value={form.bank_agency} onChange={e => set('bank_agency', e.target.value.replace(/\D/g,''))}
                placeholder="0000" style={inp} />
            </div>
            <div style={{ ...fld, width: 80, flexShrink: 0 }}>
              <label style={lbl}>Dígito</label>
              <input value={form.bank_agency_digit} onChange={e => set('bank_agency_digit', e.target.value.slice(0,1))}
                placeholder="0" maxLength={1} style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...fld, flex: 1 }}>
              <label style={lbl}>Conta</label>
              <input value={form.bank_account} onChange={e => set('bank_account', e.target.value.replace(/\D/g,''))}
                placeholder="00000000" style={inp} />
            </div>
            <div style={{ ...fld, width: 80, flexShrink: 0 }}>
              <label style={lbl}>Dígito</label>
              <input value={form.bank_account_digit} onChange={e => set('bank_account_digit', e.target.value.slice(0,1))}
                placeholder="0" maxLength={1} style={inp} />
            </div>
          </div>
          <div style={fld}>
            <label style={lbl}>Tipo de conta</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ value: 'checking', label: 'Corrente' }, { value: 'savings', label: 'Poupança' }].map(opt => (
                <button key={opt.value} onClick={() => set('bank_account_type', opt.value)} style={{
                  flex: 1, padding: '12px 0', borderRadius: 10,
                  border: `1px solid ${form.bank_account_type === opt.value ? '#0EA5A0' : '#E8E8E8'}`,
                  background: form.bank_account_type === opt.value ? '#E6F7F6' : '#fff',
                  color: form.bank_account_type === opt.value ? '#0EA5A0' : '#6E6E73',
                  fontFamily: "'Noto Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>
        </>}

        {saveWarning && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FCD34D',
            borderRadius: 10, padding: '12px 14px',
            color: '#92400E', fontSize: 13, lineHeight: 1.5,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M8 2L14.5 13H1.5L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M8 6v3M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {saveWarning}
          </div>
        )}
        {saved && (
          <div style={{
            background: '#ECFDF5', border: '1px solid #6EE7B7',
            borderRadius: 10, padding: '12px 14px',
            color: '#065F46', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12 13 5" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dados bancários salvos com sucesso!
          </div>
        )}
        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '12px 14px', color: '#C0392B', fontSize: 14 }}>
            {error}
          </div>
        )}

      </div>

      {/* Footer fixo */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: '#fff', borderTop: '1px solid #E8E8E8', zIndex: 100 }}>
        <button onClick={handleNext} disabled={saving} style={{
          width: '100%', padding: 14, borderRadius: 10,
          background: saving ? '#7DCFCC' : '#0EA5A0',
          color: '#fff', fontWeight: 600, fontSize: 15,
          fontFamily: "'Noto Sans', sans-serif", border: 'none', cursor: saving ? 'default' : 'pointer',
        }}>
          {saving ? 'Salvando...' : step < 3 ? 'Próximo' : 'Salvar dados bancários'}
        </button>
      </div>

    </div>
  )
}
