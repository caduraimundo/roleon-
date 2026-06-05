'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function statusLabel(status: string) {
  if (status === 'pending') return { text: 'Aguardando aprovação', color: '#F59E0B', bg: '#FFFBEB' }
  if (status === 'active') return { text: 'Publicado', color: '#10B981', bg: '#ECFDF5' }
  if (status === 'rejected') return { text: 'Recusado', color: '#EF4444', bg: '#FEF2F2' }
  return { text: 'Encerrado', color: '#6E6E73', bg: '#F5F5F5' }
}

function isFuturo(event_date: string) {
  return new Date(event_date.replace(' ', 'T')) > new Date()
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

const CARD_COLORS = ['#7B5E57', '#556B5D', '#6B5E7A', '#8A6F4A', '#5B6E8A']
function cardColor(id: string) {
  let n = 0
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) >>> 0
  return CARD_COLORS[n % CARD_COLORS.length]
}

export default function PainelPage() {
  const router = useRouter()
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [producerName, setProducerName] = useState('')

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

      if (profile?.name) setProducerName(profile.name)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/produtor/events', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setEventos(data.events ?? [])
      setLoading(false)
    }
    init()
  }, [router])

  const futuros = eventos
    .filter(e => isFuturo(e.event_date) && e.status !== 'rejected' && e.status !== 'cancelled')
    .sort((a, b) =>
      new Date(a.event_date.replace(' ', 'T')).getTime() -
      new Date(b.event_date.replace(' ', 'T')).getTime()
    )
  const passados = eventos
    .filter(e => !isFuturo(e.event_date) && e.status !== 'rejected' && e.status !== 'cancelled')
    .sort((a, b) =>
      new Date(b.event_date.replace(' ', 'T')).getTime() -
      new Date(a.event_date.replace(' ', 'T')).getTime()
    )

  const btnPrimary: React.CSSProperties = {
    background: '#0EA5A0',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: '#F9F9F9' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Saudação */}
        <div style={{
          padding: '24px 20px 8px',
          fontFamily: "'Noto Sans', sans-serif",
        }}>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 700,
            color: '#1A1A1A', letterSpacing: -0.5, lineHeight: 1.2,
          }}>
            {producerName ? `Olá, ${producerName}` : 'Olá'}
          </h1>
          <div style={{
            marginTop: 4, fontSize: 13.5,
            color: '#6E6E73', fontWeight: 500,
            fontFamily: "'Noto Sans', sans-serif",
          }}>Veja como seus eventos estão indo</div>
        </div>

        {/* Cards de resumo — 2x2 */}
        <div style={{
          padding: '8px 20px 4px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          {[
            { label: 'Total vendido',      value: 'R$ 0',  sub: 'Este mês' },
            { label: 'Ingressos vendidos', value: '0',     sub: 'Este mês' },
            { label: 'Eventos ativos',
              value: String(eventos.filter((e: any) => e.status === 'active').length),
              sub: 'Agora' },
            { label: 'Ticket médio',
              value: eventos.length > 0
                ? (() => {
                    const paid = eventos.reduce((sum: number, e: any) =>
                      sum + (e.sold || 0), 0)
                    const revenue = eventos.reduce((sum: number, e: any) =>
                      sum + (e.revenue || 0), 0)
                    return paid > 0
                      ? 'R$ ' + (revenue / paid).toFixed(0)
                      : 'R$ 0'
                  })()
                : 'R$ 0',
              sub: 'Por ingresso' },
          ].map((c, i) => (
            <div key={i} style={{
              background: '#fff',
              border: '0.5px solid #E8E8E8',
              borderRadius: 14, padding: 16,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                textTransform: 'uppercase' as const, color: '#9A9A9A',
                fontFamily: "'Noto Sans', sans-serif",
              }}>{c.sub}</div>
              <div style={{
                fontSize: 22, fontWeight: 700, color: '#1A1A1A',
                letterSpacing: -0.6, lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums' as const,
                fontFamily: "'Noto Sans', sans-serif",
              }}>{c.value}</div>
              <div style={{
                fontSize: 12, color: '#6E6E73', fontWeight: 500,
                fontFamily: "'Noto Sans', sans-serif",
              }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Cabeçalho "Seus eventos" + Ver todos */}
        <div style={{
          padding: '20px 20px 10px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 700,
            color: '#1A1A1A', letterSpacing: -0.3,
            fontFamily: "'Noto Sans', sans-serif",
          }}>Seus eventos</h2>
          <a href="/produtor/eventos" style={{
            color: '#0EA5A0', fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 2,
            fontFamily: "'Noto Sans', sans-serif",
          }}>
            Ver todos
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor"
                strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '0 20px' }}>
          {loading && (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <span style={{ color: '#6E6E73', fontSize: 14 }}>Carregando...</span>
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
                Você ainda não criou nenhum evento.
              </p>
              <button
                style={{ ...btnPrimary, marginTop: 16 }}
                onClick={() => router.push('/produtor/eventos/novo')}
              >
                Criar primeiro evento
              </button>
            </div>
          )}

          {!loading && eventos.length > 0 && (
            <>
              {futuros.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', letterSpacing: 0.5, marginBottom: 12, marginTop: 8 }}>
                    PRÓXIMOS EVENTOS
                  </p>
                  {futuros.map(e => (
                    <EventCard key={e.id} e={e} router={router} />
                  ))}
                </>
              )}
              {passados.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', letterSpacing: 0.5, marginBottom: 12, marginTop: 20 }}>
                    EVENTOS PASSADOS
                  </p>
                  {passados.map(e => (
                    <EventCard key={e.id} e={e} router={router} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* FAB criar evento */}
        <button
          onClick={() => router.push('/produtor/eventos/novo')}
          style={{
            position: 'fixed', right: 20, bottom: 88,
            width: 56, height: 56, borderRadius: 18,
            background: '#0EA5A0', color: '#fff',
            border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 24px rgba(14,165,160,0.4)',
            zIndex: 40,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </button>

      </div>
    </div>
  )
}

function EventCard({ e, router }: { e: any; router: ReturnType<typeof useRouter> }) {
  const badge = statusLabel(e.status)

  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid #E8E8E8',
      borderRadius: 14, padding: 16,
      marginBottom: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      {/* Linha: thumb + info + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

        {/* Thumb colorido */}
        <div style={{
          width: 52, height: 52, borderRadius: 10,
          background: cardColor(e.id),
          flexShrink: 0, overflow: 'hidden',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', position: 'relative',
        }}>
          {e.cover_image ? (
            <img src={e.cover_image} alt={e.title} style={{
              position: 'absolute',
              top: 0, right: 0, bottom: 0, left: 0,
              width: '100%', height: '100%', objectFit: 'cover',
            }}/>
          ) : (
            <span style={{ color: '#fff', fontSize: 22,
              fontWeight: 700, opacity: 0.9 }}>♪</span>
          )}
        </div>

        {/* Título + data */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#1A1A1A',
            letterSpacing: -0.2, lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{e.title}</div>
          <div style={{
            marginTop: 3, fontSize: 12.5,
            color: '#6E6E73', fontWeight: 500,
          }}>
            {formatDate(e.event_date)}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 3 }}>
            <span style={{ fontSize: 12.5, color: '#6E6E73' }}>
              {e.sold} {e.sold === 1 ? 'ingresso vendido' : 'ingressos vendidos'}
            </span>
            {e.revenue > 0 && (
              <span style={{ fontSize: 12.5, color: '#0EA5A0', fontWeight: 500 }}>
                {formatCurrency(e.revenue)}
              </span>
            )}
            {e.is_free && e.sold === 0 && (
              <span style={{ fontSize: 12.5, color: '#6E6E73' }}>Gratuito</span>
            )}
          </div>
        </div>

        {/* Badge de status */}
        <span style={{
          fontSize: 11, fontWeight: 600,
          padding: '3px 8px', borderRadius: 20,
          color: badge.color, background: badge.bg,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {badge.text}
        </span>

      </div>

      {/* Botões — Portaria primário | Editar secundário */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => router.push(`/produtor/eventos/${e.id}/portaria`)}
          style={{
            padding: '11px 12px', borderRadius: 10,
            border: 'none', background: '#0EA5A0', color: '#fff',
            fontFamily: "'Noto Sans', sans-serif",
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="4" y1="12" x2="20" y2="12"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Portaria
        </button>
        <button
          onClick={() => router.push(`/produtor/eventos/${e.id}/editar`)}
          style={{
            padding: '9px 12px', borderRadius: 10,
            border: '1px solid #E8E8E8',
            background: '#fff', color: '#1A1A1A',
            fontFamily: "'Noto Sans', sans-serif",
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 12.5l1-3 7-7 2 2-7 7-3 1zM10 3l2 2"
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Editar
        </button>
      </div>
    </div>
  )
}
