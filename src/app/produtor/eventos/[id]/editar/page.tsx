'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabase'

const GENRES = ['Samba/Pagode', 'MPB', 'Rock', 'Funk', 'Sertanejo', 'Forró', 'Rap', 'Eletrônico', 'Piseiro', 'Reggae', 'Axé', 'República']

type TicketType = { name: string; price: string; quantity: string }

export default function EditarEventoPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [isUnlimited, setIsUnlimited] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([{ name: 'Pista', price: '', quantity: '' }])
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
  const [eventStatus, setEventStatus] = useState('')
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showError(msg: string) {
    setError(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    if (msg) {
      errorTimerRef.current = setTimeout(() => setError(''), 5000)
    }
  }

  // Limpa rascunho de criação caso exista
  useEffect(() => {
    localStorage.removeItem('roleon_novo_evento_draft')
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/produtor'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'producer') { router.replace('/produtor/cadastro'); return }

      const { data: ev } = await supabase
        .from('events')
        .select('id, title, description, genre, event_date, location_name, location_lat, location_lng, price, is_free, is_unlimited, cover_image, producer_id, status, policies, age_rating, event_type, created_at')
        .eq('id', eventId)
        .single()

      if (!ev) { router.replace('/produtor/painel'); return }
      if (ev.producer_id !== user.id) { router.replace('/produtor/painel'); return }

      setTitle(ev.title || '')
      setDescription(ev.description || '')
      setGenres(ev.genre || [])
      const dateNorm = ev.event_date ? ev.event_date.replace(' ', 'T') : ''
      setEventDate(dateNorm ? dateNorm.split('T')[0] : '')
      setEventTime(dateNorm ? (dateNorm.split('T')[1]?.slice(0, 5) || '') : '')
      setIsFree(ev.is_free || false)
      setIsUnlimited(ev.is_unlimited || false)
      setPolicies(ev.policies?.length ? ev.policies : [''])
      setExistingCoverUrl(ev.cover_image || null)
      setEventStatus(ev.status || '')

      const locationStr = ev.location_name || ''
      const cepMatch = locationStr.match(/CEP\s*([\d-]{8,9})/)
      setCep(cepMatch ? cepMatch[1] : '')
      const withoutCep = locationStr.replace(/,?\s*CEP\s*[\d-]+/, '').trim()
      const parts = withoutCep.split(', ')
      if (parts.length >= 4) {
        // Formato novo: rua, numero, bairro, cidade - estado
        setRua(parts[0] || '')
        setNumero(parts[1] || '')
        setBairro(parts[2] || '')
        const cidadeEstado = (parts[3] || '').split(' - ')
        setCidade(cidadeEstado[0] || '')
        setEstado(cidadeEstado[1] || '')
      } else if (parts.length === 3) {
        // Formato antigo: rua, numero - bairro, cidade - estado
        setRua(parts[0] || '')
        const numeroBairro = (parts[1] || '').split(' - ')
        setNumero(numeroBairro[0] || '')
        setBairro(numeroBairro[1] || '')
        const cidadeEstado = (parts[2] || '').split(' - ')
        setCidade(cidadeEstado[0] || '')
        setEstado(cidadeEstado[1] || '')
      } else {
        setRua(parts[0] || '')
        setNumero(parts[1] || '')
      }

      const { data: tipos } = await supabase
        .from('ticket_types')
        .select('name, price, quantity')
        .eq('event_id', eventId)

      if (tipos?.length) {
        setTicketTypes(tipos.map(t => ({
          name: t.name,
          price: t.price?.toString() || '',
          quantity: t.quantity?.toString() || '',
        })))
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

  const updateTicket = (index: number, field: keyof TicketType, value: string) => {
    setTicketTypes(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const removeTicket = (index: number) => {
    setTicketTypes(prev => prev.filter((_, i) => i !== index))
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

  const handleCancelEvent = async () => {
    setCancelLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/produtor/events/${eventId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        router.replace('/produtor/eventos')
      } else {
        const json = await res.json()
        showError(json.error ?? 'Erro ao cancelar evento.')
      }
    } catch {
      showError('Erro ao cancelar evento.')
    } finally {
      setCancelLoading(false)
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
    if (!isFree) {
      const valid = ticketTypes.some(t => t.name && parseFloat(t.price) > 0)
      if (!valid) { showError('Adicione ao menos um tipo de ingresso com nome e preço'); return }
    }

    setLoading(true)
    let coverImageUrl: string | null = null

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (coverFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', coverFile)
        const uploadRes = await fetch('/api/produtor/upload-cover', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: fd,
        })
        const uploadData = await uploadRes.json()
        setUploading(false)
        if (!uploadRes.ok) { showError(uploadData.error || 'Erro ao fazer upload da capa'); return }
        coverImageUrl = uploadData.url
      }

      const event_date = `${eventDate}T${eventTime}:00-03:00`
      const res = await fetch(`/api/produtor/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title,
          description,
          genre: genres,
          event_date,
          location_name: `${rua}, ${numero}${bairro ? ', ' + bairro : ''}, ${cidade} - ${estado}, CEP ${cep}`,
          location_lat: null,
          location_lng: null,
          is_free: isFree,
          is_unlimited: isUnlimited,
          cover_image: coverImageUrl ?? existingCoverUrl ?? null,
          policies: policies.filter(p => p.trim() !== ''),
          ticket_types: isFree
            ? []
            : ticketTypes.map(t => ({
                name: t.name,
                price: parseFloat(t.price),
                quantity: t.quantity ? parseInt(t.quantity) : null,
              })),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        router.replace('/produtor/painel')
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
        {eventStatus === 'active' ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: menuOpen ? '#F7F7F7' : 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="18" height="4" viewBox="0 0 18 4" fill="none">
                <circle cx="2" cy="2" r="2" fill="#1A1A1A"/>
                <circle cx="9" cy="2" r="2" fill="#1A1A1A"/>
                <circle cx="16" cy="2" r="2" fill="#1A1A1A"/>
              </svg>
            </button>
            {menuOpen && (
              <>
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                />
                <div style={{
                  position: 'absolute', top: 42, right: 0,
                  background: '#fff', borderRadius: 12,
                  border: '0.5px solid #E8E8E8',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 200, minWidth: 180, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => { setMenuOpen(false); setCancelConfirm(true) }}
                    style={{
                      width: '100%', padding: '14px 16px',
                      background: 'none', border: 'none',
                      textAlign: 'left' as const, fontSize: 14, fontWeight: 600,
                      color: '#DC2626', cursor: 'pointer',
                      fontFamily: "'Noto Sans', sans-serif",
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth="1.8"/>
                      <path d="M12 8v4M12 16h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Cancelar evento
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ width: 36 }} />
        )}
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
          ) : existingCoverUrl ? (
            <div>
              <img
                src={existingCoverUrl}
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
                  onClick={() => { setExistingCoverUrl(null); setCoverFile(null); setCoverPreview(null) }}
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

        {/* Políticas */}
        <div style={sectionStyle}>
          <label style={labelStyle}>POLÍTICAS DO EVENTO</label>
          <span style={{ fontSize: 12, color: '#6E6E73', marginBottom: 8 }}>
            Ex: +18 anos, Lotação controlada, Proibido reentrada
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {policies.map((policy, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Ex: +18 anos"
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

        {/* Ingressos */}
        <div style={sectionStyle}>
          <label style={labelStyle}>INGRESSOS</label>

          {/* Toggle Pago / Gratuito */}
          <div style={{ display: 'flex', background: '#F0F0F0', borderRadius: 10, padding: 3, marginBottom: 16 }}>
            {[{ label: 'Pago', value: false }, { label: 'Gratuito', value: true }].map(opt => (
              <button
                key={opt.label}
                onClick={() => setIsFree(opt.value)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 8,
                  background: isFree === opt.value ? '#fff' : 'transparent',
                  boxShadow: isFree === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  color: '#1A1A1A',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {!isFree ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ticketTypes.map((ticket, i) => (
                <div key={i} style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  border: '1px solid #E8E8E8',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  <input
                    type="text"
                    placeholder="Nome do tipo (ex: Pista, Camarote)"
                    value={ticket.name}
                    onChange={e => updateTicket(i, 'name', e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#6E6E73', fontFamily: "'Noto Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 0.4 }}>Preço</span>
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#6E6E73', fontFamily: "'Noto Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 0.4 }}>Quantidade</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{
                          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 14, fontWeight: 400, color: '#1A1A1A',
                          fontFamily: "'Noto Sans', sans-serif", pointerEvents: 'none',
                        }}>R$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={ticket.price}
                          onChange={e => updateTicket(i, 'price', e.target.value)}
                          style={{ ...inputStyle, width: '100%', paddingLeft: 34 }}
                        />
                      </div>
                      <input
                        type="number"
                        placeholder="∞ ilimitado"
                        value={ticket.quantity}
                        onChange={e => updateTicket(i, 'quantity', e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  </div>
                  {ticketTypes.length > 1 && (
                    <button
                      onClick={() => removeTicket(i)}
                      style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: 0 }}
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setTicketTypes(prev => [...prev, { name: '', price: '', quantity: '' }])}
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
                }}
              >
                + Adicionar tipo de ingresso
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              {!isUnlimited && (
                <input
                  type="number"
                  placeholder="Quantidade de vagas"
                  style={inputStyle}
                />
              )}
            </div>
          )}
        </div>

        {/* Termos */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 8, marginBottom: 4 }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => {
              setTermsAccepted(e.target.checked)
              if (e.target.checked) setError('')
            }}
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

      {/* Modal de confirmação de cancelamento */}
      {cancelConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '24px 20px 40px', width: '100%', maxWidth: 480,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
              Cancelar evento?
            </div>
            <div style={{ fontSize: 14, color: '#6E6E73', marginBottom: 24, lineHeight: 1.6 }}>
              O evento será cancelado e todos os ingressos ativos serão estornados. Os compradores serão notificados por e-mail. Esta ação não pode ser desfeita.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCancelConfirm(false)}
                style={{
                  flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0', borderRadius: 10,
                  border: '1px solid #E8E8E8', background: '#fff', color: '#1A1A1A',
                  fontFamily: "'Noto Sans', sans-serif", fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>
              <button
                onClick={handleCancelEvent}
                disabled={cancelLoading}
                style={{
                  flex: 2, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0', borderRadius: 10,
                  border: 'none', background: '#DC2626', color: '#fff',
                  fontFamily: "'Noto Sans', sans-serif", fontSize: 14, fontWeight: 700,
                  cursor: cancelLoading ? 'not-allowed' : 'pointer',
                  opacity: cancelLoading ? 0.6 : 1,
                }}
              >
                {cancelLoading ? 'Cancelando...' : 'Sim, cancelar evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé fixo — acima da nav bar */}
      <div style={{
        position: 'fixed',
        bottom: 72,
        left: 0,
        right: 0,
        padding: '16px 20px',
        background: '#fff',
        borderTop: '1px solid #E8E8E8',
        zIndex: 100,
      }}>
        {error && (
          <div style={{
            background: '#FFF0F0', border: '1px solid #FFD0D0',
            borderRadius: 10, padding: '12px 14px',
            color: '#C0392B', fontSize: 14, marginBottom: 10,
          }}>
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || uploading}
          style={{
            width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 15px', borderRadius: 14,
            background: loading || uploading ? '#7DCFCC' : '#0EA5A0',
            color: '#fff', fontWeight: 700, fontSize: 15,
            fontFamily: "'Noto Sans', sans-serif",
            border: 'none', cursor: loading || uploading ? 'default' : 'pointer',
            opacity: !termsAccepted ? 0.6 : 1,
          }}
        >
          {uploading ? 'Enviando capa...' : loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

    </div>
  )
}
