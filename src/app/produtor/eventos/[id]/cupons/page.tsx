'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Coupon = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  max_uses: number | null
  uses_count: number
  max_uses_per_user: number
  expires_at: string | null
  active: boolean
  created_at: string
}

function fmt(n: number) { return n.toFixed(2).replace('.', ',') }

function CouponBadge({ type, value }: { type: string; value: number }) {
  const label = type === 'percent' ? `${value}% off` : `R$ ${fmt(value)} off`
  return (
    <span style={{
      background: '#E6F7F6', color: '#0EA5A0', borderRadius: 6,
      padding: '3px 8px', fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
    }}>{label}</span>
  )
}

export default function CuponsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [eventId, setEventId] = useState('')
  const [token, setToken] = useState('')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [maxUsesPerUser, setMaxUsesPerUser] = useState('1')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    params.then(({ id }) => {
      setEventId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.replace('/produtor'); return }
        setToken(session.access_token)
        fetch(`/api/produtor/coupons?event_id=${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then(r => r.json())
          .then(d => { setCoupons(d.coupons ?? []); setLoading(false) })
          .catch(() => setLoading(false))
      })
    })
  }, [params, router])

  const handleCreate = async () => {
    setError('')
    if (!code.trim() || !discountValue) { setError('Preencha o codigo e o valor do desconto'); return }
    const dv = Number(discountValue)
    if (isNaN(dv) || dv <= 0) { setError('Valor do desconto invalido'); return }
    if (discountType === 'percent' && dv > 100) { setError('Desconto percentual nao pode ser maior que 100'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/produtor/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          event_id: eventId,
          code: code.trim(),
          discount_type: discountType,
          discount_value: dv,
          max_uses: maxUses ? Number(maxUses) : null,
          max_uses_per_user: Number(maxUsesPerUser) || 1,
          expires_at: expiresAt || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar cupom'); setSubmitting(false); return }
      setCoupons(prev => [data.coupon, ...prev])
      setCode(''); setDiscountValue(''); setMaxUses(''); setMaxUsesPerUser('1'); setExpiresAt('')
      setSuccess('Cupom criado com sucesso')
      setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Erro ao criar cupom') }
    setSubmitting(false)
  }

  const toggleActive = async (couponId: string, current: boolean) => {
    const res = await fetch(`/api/produtor/coupons/${couponId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !current }),
    })
    if (res.ok) {
      setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, active: !current } : c))
    }
  }

  const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }
  const INPUT: React.CSSProperties = { width: '100%', border: '1px solid #E8E8E8', borderRadius: 10, padding: '11px 13px', fontSize: 14, fontFamily: "'Noto Sans', sans-serif", background: '#fff', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100dvh', background: '#F2F2F2', fontFamily: "'Noto Sans', sans-serif", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.07)', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <button onClick={() => router.back()} style={{ position: 'absolute', left: 16, width: 36, height: 36, borderRadius: '50%', background: '#F2F2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', letterSpacing: -0.5 }}>Cupons de desconto</span>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Formulario de criacao */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EFEFEF', padding: '16px 16px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 16, letterSpacing: -0.3 }}>Novo cupom</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={LABEL}>Codigo</div>
              <input style={INPUT} placeholder="EX: PROMO20" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={20} />
              <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 4 }}>Apenas letras e numeros, 3 a 20 caracteres</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={LABEL}>Tipo</div>
                <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')} style={{ ...INPUT, appearance: 'none' }}>
                  <option value="percent">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={LABEL}>{discountType === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}</div>
                <input style={INPUT} type="number" min="0" placeholder={discountType === 'percent' ? 'Ex: 20' : 'Ex: 15'} value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={LABEL}>Limite total (opcional)</div>
                <input style={INPUT} type="number" min="1" placeholder="Ex: 100" value={maxUses} onChange={e => setMaxUses(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={LABEL}>Limite por usuario</div>
                <input style={INPUT} type="number" min="1" placeholder="1" value={maxUsesPerUser} onChange={e => setMaxUsesPerUser(e.target.value)} />
              </div>
            </div>

            <div>
              <div style={LABEL}>Valido ate (opcional)</div>
              <input style={INPUT} type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>

            {error && <div style={{ fontSize: 13, color: '#FF3B30' }}>{error}</div>}
            {success && <div style={{ fontSize: 13, color: '#0EA5A0', fontWeight: 600 }}>{success}</div>}

            <button
              onClick={handleCreate}
              disabled={submitting}
              style={{ width: '100%', height: 48, background: submitting ? '#8ACFCC' : '#0EA5A0', color: '#fff', border: 0, borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: "'Noto Sans', sans-serif", cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Criando...' : 'Criar cupom'}
            </button>
          </div>
        </div>

        {/* Lista de cupons */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
            Cupons criados ({coupons.length})
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#9A9A9A', padding: 32, fontSize: 14 }}>Carregando...</div>
          ) : coupons.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EFEFEF', padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#9A9A9A' }}>Nenhum cupom criado ainda</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {coupons.map(c => (
                <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${c.active ? '#EFEFEF' : '#F0F0F0'}`, padding: '14px 16px', opacity: c.active ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', letterSpacing: 0.5 }}>{c.code}</span>
                      <CouponBadge type={c.discount_type} value={Number(c.discount_value)} />
                    </div>
                    <button
                      onClick={() => toggleActive(c.id, c.active)}
                      style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 8, border: `1px solid ${c.active ? '#0EA5A0' : '#E8E8E8'}`, background: c.active ? '#E6F7F6' : '#F5F5F5', color: c.active ? '#0EA5A0' : '#6E6E73', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}
                    >
                      {c.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#6E6E73' }}>
                      {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''} uso{c.uses_count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: 12, color: '#6E6E73' }}>
                      Max {c.max_uses_per_user} por usuario
                    </span>
                    {c.expires_at && (
                      <span style={{ fontSize: 12, color: '#6E6E73' }}>
                        Valido ate {new Date(c.expires_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
