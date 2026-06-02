'use client'
import { useState } from 'react'

const T = {
  primary: '#0EA5A0', primarySoft: '#E6F7F6',
  text: '#1A1A1A', textDim: '#6E6E73', textMute: '#9A9A9A',
  border: '#E8E8E8', green: '#16A34A', greenSoft: '#E7F6EC',
}

const PERIODS = [
  { id: '7d',  label: 'Últimos 7 dias' },
  { id: 'mes', label: 'Este mês'       },
  { id: 'ano', label: 'Este ano'       },
]

const OVERVIEW: Record<string, {revenue: string; tickets: string; delta: string}> = {
  '7d':  { revenue: 'R$ 940',  tickets: '32',  delta: '+18%' },
  'mes': { revenue: 'R$ 2.840', tickets: '94',  delta: '+12%' },
  'ano': { revenue: 'R$ 8.420', tickets: '287', delta: '+24%' },
}

const BARS: Record<string, {d: string; v: number}[]> = {
  '7d':  [{d:'Seg',v:8},{d:'Ter',v:12},{d:'Qua',v:6},{d:'Qui',v:18},{d:'Sex',v:22},{d:'Sáb',v:25},{d:'Dom',v:3}],
  'mes': [{d:'Sem 1',v:14},{d:'Sem 2',v:22},{d:'Sem 3',v:18},{d:'Sem 4',v:28},{d:'Sem 5',v:12}],
  'ano': [{d:'Jan',v:32},{d:'Fev',v:28},{d:'Mar',v:45},{d:'Abr',v:94},{d:'Mai',v:0},{d:'Jun',v:0}],
}

const TOP_EVENTS = [
  { id: 'e1', title: 'Samba da Meia-Noite', revenue: 'R$ 1.680', tickets: 48, status: 'ativo'    },
  { id: 'e2', title: 'Pagode do Largo',     revenue: 'R$ 1.160', tickets: 75, status: 'encerrado'},
]

const TOP_GENRES = [
  { name: 'Samba/Pagode', count: 123, max: 123 },
  { name: 'MPB',          count: 48,  max: 123 },
  { name: 'Funk',         count: 15,  max: 123 },
]

export default function AnalisesPage() {
  const [period, setPeriod] = useState('mes')
  const ov   = OVERVIEW[period]
  const bars = BARS[period]
  const maxV = Math.max(1, ...bars.map(b => b.v))

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
              }}>{p.label}</button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 20px 0',
        display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Cards de visão geral */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Faturamento', value: ov.revenue, delta: ov.delta },
            { label: 'Ingressos',   value: ov.tickets, delta: ov.delta },
          ].map((c, i) => (
            <div key={i} style={{
              flex: 1, background: '#fff',
              border: `0.5px solid ${T.border}`,
              borderRadius: 14, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                textTransform: 'uppercase' as const, color: T.textMute,
              }}>{c.label}</div>
              <div style={{
                fontSize: 22, fontWeight: 700, color: T.text,
                letterSpacing: -0.6, lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums' as const,
              }}>{c.value}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 700, color: T.green,
              }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 7.5L6 4l3.5 3.5" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round"
                    strokeLinejoin="round"/>
                </svg>
                {c.delta}
                <span style={{ color: T.textDim, fontWeight: 500,
                  marginLeft: 2 }}>vs anterior</span>
              </div>
            </div>
          ))}
        </div>

        {/* Gráfico de barras */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
            textTransform: 'uppercase' as const, color: T.textMute,
            marginBottom: 10,
          }}>Vendas por período</div>
          <div style={{
            background: '#fff', border: `0.5px solid ${T.border}`,
            borderRadius: 14, padding: '14px 8px 10px',
            overflow: 'hidden',
          }}>
            <svg viewBox="0 0 340 180" width="100%" height={180}
              style={{ display: 'block', overflow: 'visible' }}>
              {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
                <line key={i} x1={12} x2={328}
                  y1={26 + 126 * g} y2={26 + 126 * g}
                  stroke="#EFEFEF" strokeWidth="1"
                  strokeDasharray={i === 4 ? '0' : '2 3'}/>
              ))}
              {bars.map((b, i) => {
                const n = bars.length
                const bW = (316 - 8*(n-1)) / n
                const x  = 12 + i*(bW+8)
                const h  = maxV > 0 ? (b.v/maxV)*126 : 0
                const y  = 26 + 126 - h
                const empty = b.v === 0
                return (
                  <g key={i}>
                    <text x={x+bW/2} y={y-6}
                      textAnchor="middle"
                      fontFamily="'Noto Sans', sans-serif"
                      fontSize="10.5" fontWeight="700"
                      fill={empty ? '#C8C8C8' : T.text}>
                      {b.v}
                    </text>
                    <rect x={x} y={y}
                      width={bW}
                      height={Math.max(empty ? 0 : 3, h)}
                      rx="5"
                      fill={empty ? '#EAEAEA' : T.primary}
                      opacity={empty ? 0.6 : 1}/>
                    <text x={x+bW/2} y={26+126+18}
                      textAnchor="middle"
                      fontFamily="'Noto Sans', sans-serif"
                      fontSize="10.5" fontWeight="600"
                      fill={T.textDim}>
                      {b.d}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Top eventos */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
            textTransform: 'uppercase' as const, color: T.textMute,
            marginBottom: 10,
          }}>Seus eventos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TOP_EVENTS.map((ev, i) => {
              const maxRev = 1680
              const pct = Math.round((parseInt(ev.revenue.replace(/\D/g,'')) / maxRev) * 100)
              return (
                <div key={ev.id} style={{
                  background: '#fff', border: `0.5px solid ${T.border}`,
                  borderRadius: 14, padding: 14,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9,
                      background: i === 0 ? T.primarySoft : '#F3F3F3',
                      color: i === 0 ? T.primary : T.textDim,
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, flexShrink: 0,
                    }}>{i+1}</div>
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
                        <span style={{ fontWeight: 700,
                          color: T.text }}>{ev.revenue}</span>
                        <span style={{ width: 3, height: 3,
                          borderRadius: 999, background: '#D0D0D0' }}/>
                        <span>{ev.tickets} ingressos</span>
                      </div>
                    </div>
                    {ev.status === 'encerrado' && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
                        textTransform: 'uppercase' as const,
                        color: T.textDim, background: '#F1F1F1',
                        padding: '3px 7px', borderRadius: 999,
                        lineHeight: 1, flexShrink: 0,
                      }}>Encerrado</span>
                    )}
                  </div>
                  <div style={{ height: 6, borderRadius: 999,
                    background: '#F0F0F0', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: pct + '%',
                      background: T.primary, borderRadius: 999,
                    }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gêneros */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
            textTransform: 'uppercase' as const, color: T.textMute,
            marginBottom: 10,
          }}>Gênero mais vendido</div>
          <div style={{
            background: '#fff', border: `0.5px solid ${T.border}`,
            borderRadius: 14, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {TOP_GENRES.map(g => {
              const pct = Math.round((g.count / g.max) * 100)
              return (
                <div key={g.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: T.primarySoft, color: T.primary,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                    fontSize: 18, fontWeight: 700,
                  }}>♪</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'baseline',
                      justifyContent: 'space-between', gap: 8, marginBottom: 6,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700,
                        color: T.text }}>{g.name}</div>
                      <div style={{ fontSize: 12.5, color: T.textDim,
                        fontWeight: 500, whiteSpace: 'nowrap' as const }}>
                        <span style={{ fontWeight: 700,
                          color: T.text }}>{g.count}</span> ingressos
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 999,
                      background: '#F0F0F0', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: pct + '%',
                        background: T.primary, borderRadius: 999,
                      }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
