'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const T = {
  primary: '#0EA5A0', primarySoft: '#E6F7F6',
  text: '#1A1A1A', textDim: '#6E6E73', textMute: '#9A9A9A',
  border: '#E8E8E8',
}

const PERIODS = [
  { id: '7d',   label: 'Últimos 7 dias' },
  { id: '30d',  label: 'Este mês'       },
  { id: 'year', label: 'Este ano'       },
]

type ChartBar  = { label: string; tickets: number; revenue: number }
type EventItem = { id: string; title: string; event_date: string; tickets: number; revenue: number }
type Analytics = {
  totals: { revenue: number; tickets: number; avgTicket: number }
  chart:  ChartBar[]
  events: EventItem[]
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(event_date: string) {
  const d = new Date(event_date.replace(' ', 'T'))
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

function isPast(event_date: string) {
  return new Date(event_date.replace(' ', 'T')) < new Date()
}

export default function AnalisesPage() {
  const router = useRouter()
  const [period, setPeriod]   = useState('30d')
  const [data, setData]       = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const res = await fetch(`/api/produtor/analytics?period=${period}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) setData(await res.json())
      } catch {
        // silencioso — mostra estado vazio
      }
      setLoading(false)
    }
    load()
  }, [period])

  const bars = data?.chart ?? []
  const maxV = Math.max(1, ...bars.map(b => b.tickets))
  const barH = 80

  return (
    <div style={{
      minHeight: '100vh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      paddingBottom: 100,
    }}>

      {/* Título */}
      <div style={{ padding: '24px 20px 0' }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700,
          color: T.text, letterSpacing: -0.5,
        }}>Análises</h1>
      </div>

      {/* Chips de período */}
      <div style={{
        overflowX: 'auto', padding: '16px 20px 4px',
        whiteSpace: 'nowrap', scrollbarWidth: 'none' as const,
      }}>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          {PERIODS.map(p => {
            const active = period === p.id
            return (
              <button key={p.id} onClick={() => setPeriod(p.id)} style={{
                padding: '8px 16px', borderRadius: 999,
                border: active ? `1px solid ${T.primary}` : '1px solid #E8E8E8',
                background: active ? T.primary : '#fff',
                color: active ? '#fff' : T.text,
                fontFamily: "'Noto Sans', sans-serif",
                fontSize: 13, fontWeight: active ? 700 : 600,
                cursor: 'pointer', flexShrink: 0,
                transition: 'background 160ms, color 160ms',
                opacity: loading ? 0.6 : 1,
              }}>{p.label}</button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Cards de métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          <div style={{
            background: '#fff', border: `0.5px solid ${T.border}`,
            borderRadius: 14, padding: 14,
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: T.textMute, marginBottom: 6,
            }}>Faturamento</div>
            <div style={{
              fontSize: loading ? 13 : 20, fontWeight: 800, color: T.text,
              letterSpacing: -0.5, lineHeight: 1.1,
            }}>
              {loading ? 'Carregando...' : fmt(data?.totals.revenue ?? 0)}
            </div>
            <div style={{ fontSize: 10.5, color: T.textMute, marginTop: 4, fontWeight: 500 }}>
              líquido após taxas
            </div>
          </div>

          <div style={{
            background: '#fff', border: `0.5px solid ${T.border}`,
            borderRadius: 14, padding: 14,
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: T.textMute, marginBottom: 6,
            }}>Ingressos</div>
            <div style={{
              fontSize: loading ? 13 : 28, fontWeight: 800, color: T.text,
              letterSpacing: -0.5, lineHeight: 1.1,
            }}>
              {loading ? '...' : (data?.totals.tickets ?? 0)}
            </div>
            <div style={{ fontSize: 10.5, color: T.textMute, marginTop: 4, fontWeight: 500 }}>
              vendidos no período
            </div>
          </div>


        </div>

        {/* Gráfico */}
        {!loading && bars.some(b => b.tickets > 0) && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: T.textMute,
              marginBottom: 10,
            }}>Vendas por período</div>
            <div style={{
              background: '#fff', border: `0.5px solid ${T.border}`,
              borderRadius: 14, padding: '18px 14px 14px',
              position: 'relative' as const,
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-end',
                gap: period === '7d' ? 5 : 10,
                height: barH + 32,
                justifyContent: period === 'year' ? 'flex-start' : 'space-between',
                overflowX: period === 'year' ? 'auto' : 'visible',
                scrollbarWidth: 'none' as const,
                WebkitOverflowScrolling: 'touch' as const,
              }}>
                {bars.map((b, i) => {
                  const h = maxV > 0
                    ? Math.max(b.tickets > 0 ? 6 : 0, Math.round((b.tickets / maxV) * barH))
                    : 0
                  return (
                    <div key={i} style={{
                      flex: period === 'year' ? '0 0 42px' : 1,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                    }}>
                      {b.tickets > 0 && (
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: T.text,
                        }}>{b.tickets}</div>
                      )}
                      <div style={{
                        width: '100%',
                        height: h > 0 ? h : 3,
                        background: b.tickets > 0 ? T.primary : '#F0F0F0',
                        borderRadius: '4px 4px 0 0',
                      }} />
                      <div style={{
                        fontSize: period === '7d' ? 9 : 10.5,
                        color: T.textDim, fontWeight: 500,
                        whiteSpace: 'nowrap' as const,
                      }}>{b.label}</div>
                    </div>
                  )
                })}
              </div>
              {period === 'year' && (
                <div style={{
                  position: 'absolute' as const,
                  right: 0, top: 0, bottom: 0, width: 40,
                  background: 'linear-gradient(to right, transparent, #fff)',
                  borderRadius: '0 14px 14px 0',
                  pointerEvents: 'none' as const,
                }} />
              )}
            </div>
          </div>
        )}

        {/* Ranking de eventos */}
        {!loading && (data?.events ?? []).length > 0 && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: T.textMute,
              marginBottom: 10,
            }}>Seus eventos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data?.events ?? []).map((ev, i) => {
                const past   = isPast(ev.event_date)
                return (
                  <button key={ev.id}
                    onClick={() => router.push(`/produtor/analises/${ev.id}`)}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: '#fff', border: `0.5px solid ${T.border}`,
                      borderRadius: 14, padding: 14,
                      display: 'flex', flexDirection: 'column',
                      cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif",
                    }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: T.primarySoft, color: T.primary,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13, fontWeight: 800, flexShrink: 0,
                      }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14.5, fontWeight: 700, color: T.text,
                          letterSpacing: -0.2, lineHeight: 1.2,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>{ev.title}</div>
                        <div style={{
                          fontSize: 12.5, color: T.textDim,
                          fontWeight: 500, marginTop: 2,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <span style={{ fontWeight: 700, color: T.text }}>{fmt(ev.revenue)}</span>
                          <span style={{ width: 3, height: 3, borderRadius: 999, background: '#D0D0D0' }} />
                          <span>{ev.tickets} {ev.tickets === 1 ? 'ingresso' : 'ingressos'}</span>
                        </div>
                      </div>
                      {past ? (
                        <span style={{
                          fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
                          textTransform: 'uppercase' as const,
                          color: T.textDim, background: '#F1F1F1',
                          padding: '3px 7px', borderRadius: 999,
                          lineHeight: 1, flexShrink: 0,
                        }}>Encerrado</span>
                      ) : (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: T.textMute, flexShrink: 0,
                        }}>{fmtDate(ev.event_date)}</span>
                      )}
                    </div>

                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!loading && (data?.totals.tickets ?? 0) === 0 && (data?.events ?? []).length === 0 && (
          <div style={{
            textAlign: 'center' as const, padding: '40px 20px',
            color: T.textMute, fontSize: 14, fontWeight: 500,
          }}>
            Nenhuma venda registrada ainda.
          </div>
        )}

      </div>
    </div>
  )
}
