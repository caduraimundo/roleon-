'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

const T = {
  primary: '#0EA5A0', primarySoft: '#E6F7F6',
  text: '#1A1A1A', textDim: '#6E6E73', textMute: '#9A9A9A',
  border: '#E8E8E8',
}

type ByType = { name: string; tickets: number; revenue: number; pct: number }
type ChartBar = { label: string; tickets: number; revenue: number }
type Detail = {
  event: { title: string; event_date: string; location_name: string; status: string; is_free: boolean }
  totals: { revenue: number; tickets: number; checked_in: number }
  byType: ByType[]
  chart: ChartBar[]
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(event_date: string) {
  const d = new Date(event_date.replace(' ', 'T'))
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).replace('.', '')
}

export default function EventoAnalisesPage() {
  const { id } = useParams() as { id: string }
  const router  = useRouter()
  const [data, setData]       = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/produtor'); return }
      try {
        const res = await fetch(`/api/produtor/events/${id}/analytics`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) setData(await res.json())
      } catch { /* silencioso */ }
      setLoading(false)
    }
    load()
  }, [id])

  const bars = data?.chart ?? []
  const maxV = Math.max(1, ...bars.map(b => b.tickets))
  const barH = 72

  return (
    <div style={{
      minHeight: '100vh', background: '#F7F7F7',
      fontFamily: "'Noto Sans', sans-serif",
      paddingBottom: 100,
    }}>

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
          onClick={() => router.push('/produtor/analises')}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#F7F7F7', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 14L6 9L11 4" stroke="#1A1A1A" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{
          flex: 1, textAlign: 'center' as const,
          fontSize: 17, fontWeight: 700, color: '#1A1A1A',
        }}>
          Análises
        </span>
        <div style={{ width: 36 }} />
      </header>

      {/* Titulo do evento */}
      <div style={{ padding: '12px 20px 0' }}>
        <h1 style={{
          margin: 0, fontSize: 20, fontWeight: 700,
          color: T.text, letterSpacing: -0.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
        }}>
          {loading ? 'Carregando...' : (data?.event.title ?? '')}
        </h1>
        {!loading && data && (
          <div style={{
            marginTop: 4, fontSize: 13, color: T.textDim, fontWeight: 500,
          }}>
            {fmtDate(data.event.event_date)} · {data.event.location_name}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Cards de totais */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          <div style={{
            background: '#fff', border: `0.5px solid ${T.border}`,
            borderRadius: 14, padding: 14,
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: T.textMute, marginBottom: 6,
            }}>{data?.event.is_free ? 'Inscritos' : 'Faturamento'}</div>
            <div style={{
              fontSize: loading ? 13 : (data?.event.is_free ? 28 : 19), fontWeight: 800,
              color: T.text, letterSpacing: -0.5, lineHeight: 1.1,
            }}>
              {loading ? '...' : (data?.event.is_free ? (data?.totals.tickets ?? 0) : fmt(data?.totals.revenue ?? 0))}
            </div>
            <div style={{ fontSize: 10.5, color: T.textMute, marginTop: 4, fontWeight: 500 }}>
              {data?.event.is_free ? 'confirmados' : 'líquido após taxas'}
            </div>
          </div>

          <div style={{
            background: '#fff', border: `0.5px solid ${T.border}`,
            borderRadius: 14, padding: 14,
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: T.textMute, marginBottom: 6,
            }}>{data?.event.is_free ? 'Compareceram' : 'Ingressos'}</div>
            <div style={{
              fontSize: loading ? 13 : 28, fontWeight: 800,
              color: T.text, letterSpacing: -0.5, lineHeight: 1.1,
            }}>
              {loading ? '...' : (data?.event.is_free ? (data?.totals.checked_in ?? 0) : (data?.totals.tickets ?? 0))}
            </div>
            <div style={{ fontSize: 10.5, color: T.textMute, marginTop: 4, fontWeight: 500 }}>
              {data?.event.is_free ? 'check-in feito' : 'vendidos'}
            </div>
          </div>

        </div>

        {/* Por tipo de ingresso */}
        {!loading && (data?.byType ?? []).length > 0 && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: T.textMute,
              marginBottom: 10,
            }}>Por tipo de ingresso</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data?.byType ?? []).map((tipo, i) => (
                <div key={i} style={{
                  background: '#fff', border: `0.5px solid ${T.border}`,
                  borderRadius: 14, padding: 14,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 10,
                  }}>
                    <div>
                      <div style={{
                        fontSize: 14.5, fontWeight: 700,
                        color: T.text, letterSpacing: -0.2,
                      }}>{tipo.name}</div>
                      <div style={{
                        fontSize: 12.5, color: T.textDim,
                        fontWeight: 500, marginTop: 2,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {!data?.event.is_free && (
                          <>
                            <span style={{ fontWeight: 700, color: T.text }}>
                              {fmt(tipo.revenue)}
                            </span>
                            <span style={{
                              width: 3, height: 3, borderRadius: 999,
                              background: '#D0D0D0', display: 'inline-block',
                            }} />
                          </>
                        )}
                        <span>{tipo.tickets} {tipo.tickets === 1 ? 'ingresso' : 'ingressos'}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: T.primary,
                    }}>{tipo.pct}%</span>
                  </div>
                  <div style={{
                    height: 6, borderRadius: 999,
                    background: '#F0F0F0', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      background: T.primary,
                      width: `${tipo.pct}%`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grafico de vendas */}
        {!loading && bars.length > 1 && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: T.textMute,
              marginBottom: 10,
            }}>{data?.event.is_free ? 'Inscrições ao longo do tempo' : 'Vendas ao longo do tempo'}</div>
            <div style={{
              background: '#fff', border: `0.5px solid ${T.border}`,
              borderRadius: 14, padding: '18px 14px 14px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-end',
                gap: 8, height: barH + 28,
                justifyContent: 'space-between',
              }}>
                {bars.map((b, i) => {
                  const h = maxV > 0
                    ? Math.max(b.tickets > 0 ? 6 : 0, Math.round((b.tickets / maxV) * barH))
                    : 0
                  return (
                    <div key={i} style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                    }}>
                      {b.tickets > 0 && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text }}>
                          {b.tickets}
                        </div>
                      )}
                      <div style={{
                        width: '100%', height: h > 0 ? h : 3,
                        background: b.tickets > 0 ? T.primary : '#F0F0F0',
                        borderRadius: '4px 4px 0 0',
                      }} />
                      <div style={{
                        fontSize: 9.5, color: T.textDim, fontWeight: 500,
                        whiteSpace: 'nowrap' as const,
                      }}>{b.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!loading && (data?.totals.tickets ?? 0) === 0 && (
          <div style={{
            textAlign: 'center' as const, padding: '40px 20px',
            color: T.textMute, fontSize: 14, fontWeight: 500,
          }}>
            {data?.event.is_free ? 'Nenhuma inscrição neste evento ainda.' : 'Nenhuma venda para este evento ainda.'}
          </div>
        )}

      </div>
    </div>
  )
}
