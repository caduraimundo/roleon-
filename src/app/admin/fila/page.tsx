'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function FilaAdminPage() {
  const router = useRouter()
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acaoId, setAcaoId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [showRejeitar, setShowRejeitar] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') { router.replace('/'); return }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/fila', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setEventos(data.events ?? [])
      setLoading(false)
    }
    init()
  }, [router])

  async function aprovar(eventId: string) {
    setAcaoId(eventId)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/events/${eventId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const data = await res.json()
    if (res.ok) {
      setEventos(prev => prev.filter(e => e.id !== eventId))
      setFeedback({ tipo: 'ok', msg: 'Evento aprovado e produtor notificado.' })
    } else {
      setFeedback({ tipo: 'erro', msg: data.error || 'Erro ao aprovar.' })
    }
    setAcaoId(null)
  }

  async function rejeitar(eventId: string) {
    if (motivo.trim() === '') return
    setAcaoId(eventId)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/events/${eventId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ motivo }),
    })
    const data = await res.json()
    if (res.ok) {
      setEventos(prev => prev.filter(e => e.id !== eventId))
      setShowRejeitar(null)
      setMotivo('')
      setFeedback({ tipo: 'ok', msg: 'Evento recusado e produtor notificado.' })
    } else {
      setFeedback({ tipo: 'erro', msg: data.error || 'Erro ao rejeitar.' })
    }
    setAcaoId(null)
  }

  return (
    <div style={{ fontFamily: 'Noto Sans, sans-serif', minHeight: '100vh', background: '#F2F2F2' }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #E8E8E8',
        height: 56,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0EA5A0' }}>Roleon</span>
          <span style={{ width: 1, height: 18, background: '#E8E8E8', margin: '0 12px' }} />
          <span style={{ fontSize: 13, color: '#6E6E73' }}>Painel Admin</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.replace('/'))}
          style={{
            border: '1px solid #E8E8E8',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 13,
            color: '#6E6E73',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0, marginBottom: 8 }}>
          Fila de aprovação
        </p>
        <p style={{ fontSize: 14, color: '#6E6E73', margin: 0, marginBottom: 24 }}>
          {eventos.length} evento{eventos.length !== 1 ? 's' : ''} aguardando
        </p>

        {feedback && (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: feedback.tipo === 'ok' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${feedback.tipo === 'ok' ? '#6EE7B7' : '#FCA5A5'}`,
            color: feedback.tipo === 'ok' ? '#065F46' : '#991B1B',
          }}>
            <span style={{ fontSize: 14 }}>{feedback.msg}</span>
            <button
              onClick={() => setFeedback(null)}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'inherit', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <p style={{ color: '#6E6E73', fontSize: 14 }}>Carregando...</p>
          </div>
        )}

        {!loading && eventos.length === 0 && (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <p style={{ fontSize: 15, color: '#6E6E73', margin: 0 }}>
              Nenhum evento aguardando aprovação.
            </p>
          </div>
        )}

        {!loading && eventos.map(e => (
          <div key={e.id} style={{
            background: '#fff',
            borderRadius: 14,
            padding: 20,
            marginBottom: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #F0F0F0',
          }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0 }}>
                {e.cover_image ? (
                  <img
                    src={e.cover_image}
                    width={80}
                    height={80}
                    alt=""
                    style={{ objectFit: 'cover', borderRadius: 10, display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: 80, height: 80, background: '#F0F7F7', borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="2" y="4" width="16" height="14" rx="2" stroke="#0EA5A0" strokeWidth="1.5"/>
                      <path d="M2 8h16M6 2v4M14 2v4" stroke="#0EA5A0" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0, marginBottom: 4 }}>
                  {e.title}
                </p>
                <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>
                  Produtor: {e.producer_name}
                </p>
                <p style={{ fontSize: 13, color: '#6E6E73', margin: 0, marginTop: 2 }}>
                  {new Date(e.event_date.replace(' ', 'T')).toLocaleString('pt-BR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <p style={{
                  fontSize: 13, color: '#6E6E73', margin: 0, marginTop: 2,
                }}>
                  {e.location_name}
                </p>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(e.genre ?? []).map((g: string) => (
                <span key={g} style={{
                  background: '#F0F7F7', color: '#0EA5A0',
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 20,
                }}>
                  {g}
                </span>
              ))}
              <span style={{
                background: '#F5F5F5', color: '#6E6E73',
                fontSize: 11, padding: '3px 8px', borderRadius: 20,
              }}>
                {e.is_free ? 'Gratuito' : `A partir de R$ ${Number(e.price).toFixed(2).replace('.', ',')}`}
              </span>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, width: '100%' }}>
              <button
                onClick={() => aprovar(e.id)}
                disabled={acaoId === e.id}
                style={{
                  background: '#0EA5A0', color: '#fff',
                  border: 'none', borderRadius: 10,
                  padding: '12px 0', flex: 1, fontSize: 15, fontWeight: 600,
                  cursor: acaoId === e.id ? 'not-allowed' : 'pointer',
                  opacity: acaoId === e.id ? 0.7 : 1,
                }}
              >
                {acaoId === e.id ? 'Aprovando...' : 'Aprovar'}
              </button>
              <button
                onClick={() => { setShowRejeitar(e.id); setMotivo('') }}
                disabled={acaoId === e.id}
                style={{
                  background: '#fff', color: '#EF4444',
                  border: '1px solid #FCA5A5', borderRadius: 10,
                  padding: '12px 0', flex: 1, fontSize: 15, fontWeight: 600,
                  cursor: acaoId === e.id ? 'not-allowed' : 'pointer',
                  opacity: acaoId === e.id ? 0.7 : 1,
                }}
              >
                Recusar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de rejeição */}
      {showRejeitar !== null && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          boxSizing: 'border-box',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 440,
            maxHeight: '90vh',
            overflowY: 'auto' as const,
            boxSizing: 'border-box' as const,
          }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0, marginBottom: 8 }}>
              Motivo da recusa
            </p>
            <p style={{ fontSize: 13, color: '#6E6E73', margin: 0, marginBottom: 16 }}>
              Esse motivo será enviado por e-mail ao produtor.
            </p>
            <textarea
              value={motivo}
              onChange={ev => setMotivo(ev.target.value)}
              placeholder="Descreva o motivo..."
              style={{
                width: '100%', height: 100,
                padding: '12px 14px',
                border: '1px solid #E8E8E8', borderRadius: 10,
                fontSize: 14, resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'Noto Sans, sans-serif',
                color: '#1A1A1A',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'stretch', flexWrap: 'wrap', width: '100%' }}>
              <button
                onClick={() => { setShowRejeitar(null); setMotivo('') }}
                style={{
                  border: '1px solid #E8E8E8', background: '#fff', color: '#6E6E73',
                  borderRadius: 10, padding: '12px 0', fontSize: 14, cursor: 'pointer', flex: 1,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => rejeitar(showRejeitar!)}
                disabled={motivo.trim() === '' || acaoId !== null}
                style={{
                  background: '#EF4444', color: '#fff',
                  border: 'none', borderRadius: 10,
                  padding: '12px 0', fontSize: 14, fontWeight: 600, flex: 1,
                  cursor: motivo.trim() === '' || acaoId !== null ? 'not-allowed' : 'pointer',
                  opacity: motivo.trim() === '' || acaoId !== null ? 0.6 : 1,
                }}
              >
                {acaoId !== null ? 'Enviando...' : 'Confirmar recusa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
