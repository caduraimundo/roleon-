'use client'

import { useEffect, useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function statusLabel(status: string) {
  if (status === 'pending') return { text: 'Aguardando aprovação', color: '#F59E0B', bg: '#FFFBEB' }
  if (status === 'active') return { text: 'Publicado', color: '#10B981', bg: '#ECFDF5' }
  if (status === 'rejected') return { text: 'Recusado', color: '#EF4444', bg: '#FEF2F2' }
  return { text: 'Encerrado', color: '#6E6E73', bg: '#F5F5F5' }
}

function formatDate(event_date: string) {
  return new Date(event_date.replace(' ', 'T')).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function isFuturo(event_date: string) {
  return new Date(event_date.replace(' ', 'T')) > new Date()
}

const CARD_COLORS = ['#7B5E57', '#556B5D', '#6B5E7A', '#8A6F4A', '#5B6E8A']
function cardColor(id: string) {
  let n = 0
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) >>> 0
  return CARD_COLORS[n % CARD_COLORS.length]
}

const FILTERS = [
  { id: 'active',   label: 'Ativos'    },
  { id: 'pending',  label: 'Pendentes' },
  { id: 'rejected', label: 'Recusados' },
]

export default function EventosPage() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/produtor'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'producer') { router.replace('/produtor/cadastro'); return }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/produtor/events', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setEvents(data.events ?? [])
      setLoading(false)
    }
    init()
  }, [router])

  const filtered = events.filter((e: any) => e.status === filter)

  const sortedFuture = filtered
    .filter((e: any) => isFuturo(e.event_date))
    .sort((a: any, b: any) =>
      new Date(a.event_date.replace(' ', 'T')).getTime() -
      new Date(b.event_date.replace(' ', 'T')).getTime()
    )
  const sortedPast = filtered
    .filter((e: any) => !isFuturo(e.event_date))
    .sort((a: any, b: any) =>
      new Date(b.event_date.replace(' ', 'T')).getTime() -
      new Date(a.event_date.replace(' ', 'T')).getTime()
    )
  const displayEvents = [...sortedFuture, ...sortedPast]

  return (
    <div style={{
      minHeight: '100vh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Título da página */}
        <div style={{
          padding: '24px 20px 0',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 700,
            color: '#1A1A1A', letterSpacing: -0.5,
          }}>Meus eventos</h1>
          <a href="/produtor/eventos/novo" style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#fff', color: '#0EA5A0',
            border: '1.5px solid #0EA5A0',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', textDecoration: 'none',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </a>
        </div>

        {/* Chips de filtro */}
        <div style={{
          overflowX: 'auto', padding: '16px 20px 4px',
          whiteSpace: 'nowrap', scrollbarWidth: 'none' as const,
        }}>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            {FILTERS.map(f => {
              const active = f.id === filter
              return (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{
                  padding: '8px 16px', borderRadius: 999,
                  border: active ? '1px solid #0EA5A0' : '1px solid #E8E8E8',
                  background: active ? '#0EA5A0' : '#fff',
                  color: active ? '#fff' : '#1A1A1A',
                  fontFamily: "'Noto Sans', sans-serif",
                  fontSize: 13, fontWeight: active ? 700 : 600,
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'background 160ms, color 160ms',
                }}>{f.label}</button>
              )
            })}
          </div>
        </div>

        {/* Lista */}
        <div style={{ padding: '12px 20px 100px',
          display: 'flex', flexDirection: 'column', gap: 12 }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0',
              color: '#9A9A9A', fontSize: 14 }}>Carregando...</div>
          )}

          {!loading && displayEvents.length === 0 && (
            <div style={{
              marginTop: 48, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 14, textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: '#fff', border: '0.5px solid #E8E8E8',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#9A9A9A',
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <rect x="3.5" y="5" width="17" height="15" rx="2.2"
                    stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M3.5 10h17M8 2.5v4M16 2.5v4"
                    stroke="currentColor" strokeWidth="1.6"
                    strokeLinecap="round"/>
                  <path d="M9 15h6" stroke="currentColor"
                    strokeWidth="1.6" strokeLinecap="round" opacity="0.5"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700,
                  color: '#1A1A1A' }}>Nenhum evento aqui</div>
                <div style={{ fontSize: 13, color: '#6E6E73',
                  fontWeight: 500, marginTop: 4 }}>
                  Tente outro filtro ou crie um novo evento.
                </div>
              </div>
            </div>
          )}

          {!loading && displayEvents.map((ev: any, idx: number) => {
            const badge = statusLabel(ev.status)
            const isPast = !isFuturo(ev.event_date)
            const prevIsFuture = idx > 0 && isFuturo(displayEvents[idx - 1].event_date)
            const showSeparator = filter === 'active' && isPast && (idx === 0 || prevIsFuture)
            return (
              <Fragment key={ev.id}>
                {showSeparator && (
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                    textTransform: 'uppercase' as const, color: '#9A9A9A',
                    marginTop: sortedFuture.length > 0 ? 8 : 0, marginBottom: 4,
                  }}>Encerrados</div>
                )}
                <div style={{
                  background: '#fff', border: '0.5px solid #E8E8E8',
                borderRadius: 14, padding: 14,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {/* Linha: thumb + info + status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 10,
                    background: cardColor(ev.id), flexShrink: 0,
                    overflow: 'hidden', position: 'relative',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {ev.cover_image ? (
                      <img src={ev.cover_image} alt={ev.title} style={{
                        position: 'absolute',
                        top: 0, right: 0, bottom: 0, left: 0,
                        width: '100%', height: '100%', objectFit: 'cover',
                      }}/>
                    ) : (
                      <span style={{ color: '#fff', fontSize: 22,
                        fontWeight: 700, opacity: 0.9 }}>♪</span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: '#1A1A1A',
                      letterSpacing: -0.2, lineHeight: 1.25,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{ev.title}</div>
                    <div style={{
                      marginTop: 3, fontSize: 12.5,
                      color: '#6E6E73', fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {formatDate(ev.event_date)}
                    </div>
                  </div>

                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    padding: '3px 8px', borderRadius: 20,
                    color: badge.color, background: badge.bg,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {badge.text}
                  </span>
                </div>

                {/* Contagem de ingressos */}
                <div style={{ fontSize: 12.5, color: '#6E6E73', fontWeight: 500,
                  display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>
                    {ev.sold} {ev.sold === 1 ? 'ingresso vendido' : 'ingressos vendidos'}
                  </span>
                  {ev.revenue > 0 && (
                    <span style={{ color: '#0EA5A0', fontWeight: 500 }}>
                      {formatCurrency(ev.revenue)}
                    </span>
                  )}
                  {ev.is_free && ev.sold === 0 && (
                    <span>Gratuito</span>
                  )}
                </div>

                {/* Botões */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <a href={`/produtor/eventos/${ev.id}/editar`} style={{
                      padding: '9px 10px', borderRadius: 10,
                      border: '1px solid #E8E8E8',
                      background: '#fff', color: '#1A1A1A',
                      fontFamily: "'Noto Sans', sans-serif",
                      fontSize: 13, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6,
                      textDecoration: 'none',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M2.5 12.5l1-3 7-7 2 2-7 7-3 1zM10 3l2 2"
                          stroke="currentColor" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Editar
                    </a>
                    <a href={`/produtor/eventos/${ev.id}/portaria`} style={{
                      padding: '9px 10px', borderRadius: 10,
                      border: '1px solid #0EA5A0',
                      background: '#fff', color: '#0EA5A0',
                      fontFamily: "'Noto Sans', sans-serif",
                      fontSize: 13, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6,
                      textDecoration: 'none',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5L6.5 12 13 5" stroke="currentColor"
                          strokeWidth="1.8" strokeLinecap="round"
                          strokeLinejoin="round"/>
                      </svg>
                      Portaria
                    </a>
                  </div>
                  {ev.sold > 0 && (
                    <a href={`/produtor/eventos/${ev.id}/participantes`} style={{
                      padding: '9px 10px', borderRadius: 10,
                      border: '1px solid #E8E8E8',
                      background: '#fff', color: '#1A1A1A',
                      fontFamily: "'Noto Sans', sans-serif",
                      fontSize: 13, fontWeight: 600,
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6,
                      textDecoration: 'none',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Participantes ({ev.sold})
                    </a>
                  )}
                </div>
              </div>
              </Fragment>
            )
          })}
        </div>

      </div>
    </div>
  )
}
