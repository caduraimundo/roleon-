'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabase'

const GENRES = ['Samba/Pagode', 'MPB', 'Rock', 'Funk', 'Sertanejo', 'Forró', 'Rap', 'Eletrônico', 'Piseiro', 'Reggae', 'Axé', 'República']
const AGE_RATINGS = ['Livre', '+18 anos']

function parseLocationName(locationName: string) {
  const result = { cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '' }
  try {
    let rest = locationName
    const cepMatch = rest.match(/, CEP (\d{5}-\d{3})$/)
    if (!cepMatch) return result
    result.cep = cepMatch[1]
    rest = rest.slice(0, rest.length - cepMatch[0].length)

    const estadoMatch = rest.match(/ - ([A-Z]{2})$/)
    if (!estadoMatch) return result
    result.estado = estadoMatch[1]
    rest = rest.slice(0, rest.length - estadoMatch[0].length)

    const parts = rest.split(', ')
    if (parts.length === 3) {
      result.rua = parts[0]
      result.numero = parts[1]
      result.cidade = parts[2]
    } else if (parts.length === 4) {
      result.rua = parts[0]
      result.numero = parts[1]
      result.bairro = parts[2]
      result.cidade = parts[3]
    }
  } catch {}
  return result
}

export default function EditarEventoAdminPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = String(params.id)

  const [title, setTitle] = useState('')
  const [organizerName, setOrganizerName] = useState('')
  const [description, setDescription] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [isUnlimited, setIsUnlimited] = useState(false)
  const [ageRating, setAgeRating] = useState('Livre')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [policies, setPolicies] = useState<string[]>([''])
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showError(msg: string) {
    setError(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    if (msg) {
      errorTimerRef.current = setTimeout(() => setError(''), 5000)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/admin'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.replace('/admin'); return }

      const { data: ev } = await supabase
        .from('events')
        .select('id, title, description, genre, event_date, location_name, age_rating, is_unlimited, cover_image, policies, display_organizer_name, producer_id, status')
        .eq('id', eventId)
        .single()

      if (!ev) { router.replace('/admin?tab=moderacao'); return }
      if (ev.producer_id !== null) { router.replace('/admin?tab=moderacao'); return }
      if (ev.status === 'active' && ev.event_date && new Date(ev.event_date.replace(' ', 'T')) < new Date()) {
        router.replace('/admin?tab=moderacao'); return
      }

      setTitle(ev.title || '')
      setOrganizerName(ev.display_organizer_name || '')
      setDescription(ev.description || '')
      setGenres(Array.isArray(ev.genre) ? ev.genre : ev.genre ? [ev.genre] : [])
      setAgeRating(ev.age_rating || 'Livre')
      setIsUnlimited(!!ev.is_unlimited)
      setCoverPreview(ev.cover_image || null)
      setPolicies(Array.isArray(ev.policies) && ev.policies.length > 0 ? ev.policies : [''])

      if (ev.event_date) {
        const d = new Date(ev.event_date)
        setEventDate(d.toISOString().slice(0, 10))
        setEventTime(d.toISOString().slice(11, 16))
      }

      if (ev.location_name) {
        const parsed = parseLocationName(ev.location_name)
        setCep(parsed.cep)
        setRua(parsed.rua)
        setNumero(parsed.numero)
        setBairro(parsed.bairro)
        setCidade(parsed.cidade)
        setEstado(parsed.estado)
      }
    }
    init()
    return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current) }
  }, [router, eventId])

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const buscarCep = async (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true); setCepError('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) { setCepError('CEP não encontrado'); return }
      setRua(data.logradouro || '')
      setBairro(data.bairro || '')
      setCidade(data.localidade || '')
      setEstado(data.uf || '')
    } catch {
      setCepError('Erro ao buscar CEP. Tente novamente.')
    } finally {
      setCepLoading(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (!termsAccepted) { showError('Aceite os termos para salvar o evento'); return }
    if (!title.trim()) { showError('Título é obrigatório'); return }
    if (genres.length < 1) { showError('Selecione pelo menos um gênero'); return }
    if (!eventDate || !eventTime) { showError('Data e hora são obrigatórios'); return }
    if (cep.replace(/\D/g, '').length !== 8) { showError('CEP é obrigatório'); return }
    if (!rua.trim()) { showError('Rua é obrigatória'); return }
    if (!numero.trim()) { showError('Número é obrigatório'); return }
    if (!cidade.trim()) { showError('Cidade é obrigatória'); return }
    if (!estado.trim()) { showError('Estado é obrigatório'); return }

    setLoading(true)
    let coverImageUrl: string | null = coverPreview && !coverFile ? coverPreview : null

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (coverFile) {
        setUploading(true)
        const uploadRes = await fetch('/api/produtor/upload-cover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ fileType: coverFile.type }),
        })
        let uploadData: { error?: string; path?: string; token?: string; publicUrl?: string } = {}
        try { uploadData = await uploadRes.json() } catch { uploadData = { error: 'Resposta inválida do servidor ao preparar upload' } }
        if (!uploadRes.ok || !uploadData.path || !uploadData.token) {
          setUploading(false)
          showError(uploadData.error || 'Erro ao preparar upload da capa')
          return
        }
        const { error: putError } = await supabase.storage
          .from('event-covers')
          .uploadToSignedUrl(uploadData.path, uploadData.token, coverFile)
        setUploading(false)
        if (putError) { showError('Erro ao enviar imagem: ' + putError.message); return }
        coverImageUrl = uploadData.publicUrl ?? null
      }

      const event_date = `${eventDate}T${eventTime}:00-03:00`
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title,
          description,
          genres,
          age_rating: ageRating,
          event_date,
          location_name: `${rua}, ${numero}${bairro ? ', ' + bairro : ''}, ${cidade} - ${estado}, CEP ${cep}`,
          is_unlimited: isUnlimited,
          cover_image: coverImageUrl ?? null,
          policies: policies.filter(p => p.trim() !== ''),
          display_organizer_name: organizerName,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setShowSuccessToast(true)
        setTimeout(() => router.replace('/admin?tab=moderacao'), 1400)
      } else {
        showError(data.error || 'Erro ao salvar evento')
      }
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid #E8E8E8',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#fff',
    color: '#1A1A1A',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#6E6E73',
    marginBottom: 6,
  }

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F7', fontFamily: "'Noto Sans', sans-serif" }}>
      {/* Header */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #E8E8E8',
        height: 56,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#F7F7F7',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 14L6 9L11 4" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>
          Editar evento
        </span>
        <div style={{ width: 36 }} />
      </header>

      {/* Content */}
      <div style={{ padding: '24px 20px 110px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Capa */}
        <div style={sectionStyle}>
          <label style={labelStyle}>CAPA DO EVENTO</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleCoverChange}
          />
          {coverPreview ? (
            <div>
              <img
                src={coverPreview}
                alt="Capa do evento"
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, display: 'block' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0', borderRadius: 8, border: '1px solid #E8E8E8', background: '#fff', fontSize: 13, fontWeight: 500, color: '#1A1A1A', cursor: 'pointer' }}
                >
                  Trocar imagem
                </button>
                <button
                  onClick={() => { setCoverFile(null); setCoverPreview(null) }}
                  style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0', borderRadius: 8, border: '1px solid #FFD0D0', background: '#FFF5F5', fontSize: 13, fontWeight: 500, color: '#C0392B', cursor: 'pointer' }}
                >
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                height: 160,
                borderRadius: 12,
                border: '2px dashed #E8E8E8',
                background: '#FAFAFA',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                gap: 8,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="#C0C0C0" strokeWidth="1.5"/>
                <circle cx="8.5" cy="10.5" r="1.5" stroke="#C0C0C0" strokeWidth="1.5"/>
                <path d="M3 15l4-4 3 3 3-3 4 4" stroke="#C0C0C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 13, color: '#6E6E73' }}>Toque para adicionar capa</span>
            </div>
          )}
          <span style={{ fontSize: 11, color: '#6E6E73', marginTop: 6 }}>JPEG, PNG ou WebP · máximo 5MB</span>
          <span style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>Recomendado: 1200 × 600 px (proporção 2:1)</span>
        </div>

        {/* Título */}
        <div style={sectionStyle}>
          <label style={labelStyle}>TÍTULO</label>
          <input
            type="text"
            placeholder="Nome do evento"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Organizador */}
        <div style={sectionStyle}>
          <label style={labelStyle}>ORGANIZADOR (OPCIONAL)</label>
          <input
            type="text"
            placeholder="Ex: Prefeitura de Ouro Preto"
            value={organizerName}
            onChange={e => setOrganizerName(e.target.value)}
            style={inputStyle}
          />
          <span style={{ fontSize: 11, color: '#6E6E73', marginTop: 6 }}>
            Aparece na tela do evento como organizador. Deixe em branco para não mostrar.
          </span>
        </div>

        {/* Gênero */}
        <div style={sectionStyle}>
          <label style={labelStyle}>GÊNERO</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {GENRES.map(g => {
              const selected = genres.includes(g)
              return (
                <button
                  key={g}
                  onClick={() => {
                    if (selected) {
                      setGenres(prev => prev.filter(x => x !== g))
                    } else if (genres.length < 3) {
                      setGenres(prev => [...prev, g])
                    }
                  }}
                  style={{
                    borderRadius: 8,
                    padding: '8px 4px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: selected ? '#E6F7F6' : '#fff',
                    border: selected ? '1.5px solid #0EA5A0' : '1px solid #E8E8E8',
                    color: selected ? '#0EA5A0' : '#1A1A1A',
                  }}
                >
                  {g}
                </button>
              )
            })}
          </div>
          <span style={{ fontSize: 12, color: '#6E6E73', marginTop: 6 }}>Selecione até 3 gêneros</span>
        </div>

        {/* Data e Hora */}
        <div style={sectionStyle}>
          <label style={labelStyle}>DATA E HORA</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="time"
              value={eventTime}
              onChange={e => setEventTime(e.target.value)}
              style={{ ...inputStyle, flex: 'none', width: 100 }}
            />
          </div>
        </div>

        {/* Local */}
        <div style={sectionStyle}>
          <label style={labelStyle}>LOCAL</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={9}
            placeholder="00000-000"
            value={cep}
            onChange={e => {
              const raw = e.target.value.replace(/\D/g, '').slice(0, 8)
              const masked = raw.length > 5 ? raw.slice(0, 5) + '-' + raw.slice(5) : raw
              setCep(masked); setCepError('')
            }}
            onBlur={() => buscarCep(cep)}
            style={{ ...inputStyle, marginBottom: 4, border: cepError ? '1px solid #FF3B30' : '1px solid #E8E8E8' }}
          />
          {cepError && <p style={{ fontSize: 12, color: '#FF3B30', margin: '0 0 8px' }}>{cepError}</p>}
          {cepLoading && <p style={{ fontSize: 12, color: '#6E6E73', margin: '0 0 8px' }}>Buscando CEP...</p>}
          <input
            type="text"
            placeholder="Rua ou Avenida"
            value={rua}
            onChange={e => setRua(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8, background: rua ? '#FAFAFA' : '#fff' }}
          />
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input
                type="text"
                placeholder="Nº"
                value={numero}
                onChange={e => setNumero(e.target.value.replace(/\D/g, ''))}
                style={{ ...inputStyle }}
              />
              <button
                type="button"
                onClick={() => setNumero('S/N')}
                style={{ background: 'none', border: 'none', padding: 0, alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, color: '#0EA5A0', cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}
              >
                Sem número
              </button>
            </div>
            <input
              type="text"
              placeholder="Bairro"
              value={bairro}
              onChange={e => setBairro(e.target.value)}
              style={{ ...inputStyle, flex: 2 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="Cidade"
              value={cidade}
              onChange={e => setCidade(e.target.value)}
              style={{ ...inputStyle, flex: 2 }}
            />
            <input
              type="text"
              placeholder="UF"
              value={estado}
              maxLength={2}
              onChange={e => setEstado(e.target.value.toUpperCase().slice(0, 2))}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Descrição */}
        <div style={sectionStyle}>
          <label style={labelStyle}>DESCRIÇÃO</label>
          <textarea
            placeholder="Descreva o evento, atrações, informações importantes..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ ...inputStyle, height: 100, resize: 'none' }}
          />
        </div>

        {/* Classificação etária */}
        <div style={sectionStyle}>
          <label style={labelStyle}>CLASSIFICAÇÃO ETÁRIA</label>
          <div style={{ display: 'flex', background: '#F0F0F0', borderRadius: 10, padding: 3 }}>
            {AGE_RATINGS.map(opt => (
              <button
                key={opt}
                onClick={() => setAgeRating(opt)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 8,
                  background: ageRating === opt ? '#fff' : 'transparent',
                  boxShadow: ageRating === opt ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  color: '#1A1A1A',
                }}
              >
                {opt === '+18 anos' ? '+18' : opt}
              </button>
            ))}
          </div>
        </div>

        {/* Políticas */}
        <div style={sectionStyle}>
          <label style={labelStyle}>POLÍTICAS DO EVENTO</label>
          <span style={{ fontSize: 12, color: '#6E6E73', marginBottom: 8 }}>
            Ex: Lotação controlada, Proibido reentrada
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {policies.map((policy, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Ex: Proibido reentrada"
                  value={policy}
                  onChange={e => setPolicies(prev => prev.map((p, j) => j === i ? e.target.value : p))}
                  style={{ ...inputStyle, flex: 1, padding: '10px 12px' }}
                />
                {policies.length > 1 && (
                  <button
                    onClick={() => setPolicies(prev => prev.filter((_, j) => j !== i))}
                    style={{
                      width: 24,
                      height: 24,
                      background: '#F5F5F5',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6E6E73',
                      fontSize: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setPolicies(prev => [...prev, ''])}
            style={{
              width: '100%',
              height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 12px',
              borderRadius: 10,
              border: '1.5px dashed #0EA5A0',
              background: 'transparent',
              color: '#0EA5A0',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              marginTop: 8,
            }}
          >
            + Adicionar política
          </button>
        </div>

        {/* Vagas */}
        <div style={sectionStyle}>
          <label style={labelStyle}>VAGAS</label>
          <div style={{ display: 'flex', background: '#F0F0F0', borderRadius: 10, padding: 3 }}>
            {[{ label: 'Com limite de vagas', value: false }, { label: 'Ilimitado', value: true }].map(opt => (
              <button
                key={opt.label}
                onClick={() => setIsUnlimited(opt.value)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 8,
                  background: isUnlimited === opt.value ? '#fff' : 'transparent',
                  boxShadow: isUnlimited === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  color: '#1A1A1A',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Termos */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 8, marginBottom: 4 }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, margin: -1, overflow: 'hidden' }}
          />
          <span style={{
            marginTop: 2, width: 16, height: 16, flexShrink: 0, borderRadius: 4,
            border: termsAccepted ? 'none' : '1.5px solid #C8C8C8',
            background: termsAccepted ? '#0EA5A0' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {termsAccepted && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          <span style={{ fontSize: 12, color: '#6E6E73', lineHeight: 1.5 }}>
            Declaro que as informações estão corretas e estou de acordo com os{' '}
            <a href="/termos" onClick={e => { e.preventDefault(); router.push('/termos') }} style={{ color: '#0EA5A0', textDecoration: 'none', cursor: 'pointer' }}>Termos de Uso</a>
            {' '}e a{' '}
            <a href="/privacidade" onClick={e => { e.preventDefault(); router.push('/privacidade') }} style={{ color: '#0EA5A0', textDecoration: 'none', cursor: 'pointer' }}>Política de Privacidade</a>
            {' '}do Roleon.
          </span>
        </label>
      </div>

      {/* Rodapé fixo */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 20px',
        background: '#fff',
        borderTop: '1px solid #E8E8E8',
        zIndex: 100,
      }}>
        {error && (
          <div style={{
            background: '#FFF0F0',
            border: '1px solid #FFD0D0',
            borderRadius: 10,
            padding: '12px 14px',
            color: '#C0392B',
            fontSize: 14,
            marginBottom: 10,
          }}>
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || uploading}
          style={{
            width: '100%',
            height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 15px',
            borderRadius: 14,
            background: loading || uploading ? '#7DCFCC' : '#0EA5A0',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: loading || uploading ? 'default' : 'pointer',
            opacity: !termsAccepted ? 0.6 : 1,
          }}
        >
          {uploading ? 'Enviando capa...' : loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {showSuccessToast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: '#1A1A1A', color: '#fff',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          zIndex: 999, fontFamily: "'Noto Sans', sans-serif",
          maxWidth: 340, width: 'calc(100% - 40px)',
          animation: 'fadeInUp 0.25s ease',
        }}>
          <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="9" stroke="#0EA5A0" strokeWidth="1.8"/>
            <path d="M7.5 11l2.5 2.5 4.5-4.5" stroke="#0EA5A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Evento atualizado!</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Redirecionando...</div>
          </div>
        </div>
      )}
    </div>
  )
}
