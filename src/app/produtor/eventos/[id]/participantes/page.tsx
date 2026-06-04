'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function statusBadge(status: string) {
  if (status === 'paid')      return { text: 'Pago',      color: '#10B981', bg: '#ECFDF5' }
  if (status === 'valid')     return { text: 'Confirmado',color: '#10B981', bg: '#ECFDF5' }
  if (status === 'used')      return { text: 'Utilizado', color: '#6E6E73', bg: '#F5F5F5' }
  if (status === 'refunded')  return { text: 'Estornado', color: '#3B82F6', bg: '#EFF6FF' }
  if (status === 'cancelled') return { text: 'Cancelado', color: '#EF4444', bg: '#FEF2F2' }
  return { text: status, color: '#6E6E73', bg: '#F5F5F5' }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Ticket = {
  id: string
  buyer_name: string
  buyer_email: string
  ticket_type_name: string
  status: string
  price_paid: number
  payment_method: string
  created_at: string
}

export default function ParticipantesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [eventId, setEventId] = useState('')
  const [token, setToken] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelEventConfirm, setCancelEventConfirm] = useState(false)
  const [cancelEventLoading, setCancelEventLoading] = useState(false)
  const [eventCancelled, setEventCancelled] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { id } = await params
      setEventId(id)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/produtor'); return }

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token ?? ''
      setToken(accessToken)

      const res = await fetch(`/api/produtor/events/${id}/participantes`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets ?? [])
      }
      setLoading(false)
    }
    init()
  }, [])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCancelTicket = async (ticket_id: string) => {
    setCancellingId(ticket_id)
    try {
      const res = await fetch(`/api/produtor/events/${eventId}/refund-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticket_id }),
      })
      const json = await res.json()
      if (res.ok) {
        setTickets(prev => prev.map(t =>
          t.id === ticket_id ? { ...t, status: 'refunded' } : t
        ))
        showToast('Ingresso cancelado e comprador notificado.', true)
      } else {
        showToast(json.error ?? 'Erro ao cancelar ingresso.', false)
      }
    } catch {
      showToast('Erro ao cancelar ingresso.', false)
    } finally {
      setCancellingId(null)
    }
  }

  const handleCancelEvent = async () => {
    setCancelEventLoading(true)
    try {
      const res = await fetch(`/api/produtor/events/${eventId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok) {
        setEventCancelled(true)
        setTickets(prev => prev.map(t =>
          t.status === 'paid' || t.status === 'valid'
            ? { ...t, status: t.price_paid === 0 ? 'cancelled' : 'refunded' }
            : t
        ))
        showToast(`Evento cancelado. ${json.refunded} estorno(s) processado(s).`, true)
      } else {
        showToast(json.error ?? 'Erro ao cancelar evento.', false)
      }
    } catch {
      showToast('Erro ao cancelar evento.', false)
    } finally {
      setCancelEventLoading(false)
      setCancelEventConfirm(false)
    }
  }

  const activeTickets = tickets.filter(t => t.status === 'paid' || t.status === 'valid')
  const totalSold = tickets.length
  const totalUsed = tickets.filter(t => t.status === 'used').length
  const totalRefunded = tickets.filter(t => t.status === 'refunded' || t.status === 'cancelled').length

  return (
    <div style={{ minHeight: '100vh', background: '#F9F9F9', fontFamily: "'Noto Sans', sans-serif" }}>

      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 20px', borderRadius: 10,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{
        position: 'sticky', top: 0, zIndex: 100, height: 56,
        background: '#fff', borderBottom: '1px solid #E8E8E8',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
      }}>
        <button onClick={() => router.back()} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#F2F2F2', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="#1A1A1A" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>Participantes</span>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px 100px' }}>

        {!loading && tickets.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 14, border: '0.5px solid #E8E8E8',
            padding: 16, display: 'flex', gap: 0, marginBottom: 16,
          }}>
            {[
              { label: 'Total', value: totalSold },
              { label: 'Utilizados', value: totalUsed },
              { label: 'Estornados', value: totalRefunded },
            ].map((item, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i < 2 ? '1px solid #F0F0F0' : undefined,
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A' }}>{item.value}</div>
                <div style={{ fontSize: 11, color: '#9A9A9A', fontWeight: 500 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {eventCancelled && (
          <div style={{
            background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA',
            padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.8"/>
              <path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>
              Evento cancelado - ingressos estornados.
            </span>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9A9A9A', fontSize: 14 }}>
            Carregando...
          </div>
        )}

        {!loading && tickets.length === 0 && (
          <div style={{
            marginTop: 48, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 14, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: '#fff', border: '0.5px solid #E8E8E8',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9A9A',
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>Nenhum ingresso vendido</div>
              <div style={{ fontSize: 13, color: '#6E6E73', fontWeight: 500, marginTop: 4 }}>
                Os participantes aparecerão aqui quando houver vendas.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!loading && tickets.map(ticket => {
            const badge = statusBadge(ticket.status)
            const canCancel = (ticket.status === 'paid' || ticket.status === 'valid') && !eventCancelled
            return (
              <div key={ticket.id} style={{
                background: '#fff', borderRadius: 14,
                border: '0.5px solid #E8E8E8', padding: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: '#1A1A1A',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ticket.buyer_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 2 }}>
                      {ticket.ticket_type_name}
                      {ticket.price_paid > 0 && (
                        <span style={{ marginLeft: 6 }}>{formatCurrency(ticket.price_paid)}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 2 }}>
                      {formatDate(ticket.created_at)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                    color: badge.color, background: badge.bg,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {badge.text}
                  </span>
                </div>

                {canCancel && (
                  confirmingId === ticket.id ? (
                    <div style={{
                      marginTop: 12, background: '#FEF2F2', borderRadius: 10,
                      border: '1px solid #FECACA', padding: '12px 14px',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', marginBottom: 8 }}>
                        Cancelar ingresso de {ticket.buyer_name}?
                      </div>
                      <div style={{ fontSize: 12, color: '#6E6E73', marginBottom: 12, lineHeight: 1.5 }}>
                        O comprador será notificado por e-mail e o valor estornado.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setConfirmingId(null)}
                          style={{
                            flex: 1, padding: '9px 0', borderRadius: 10,
                            border: '1px solid #E8E8E8', background: '#fff', color: '#1A1A1A',
                            fontFamily: "'Noto Sans', sans-serif", fontSize: 13, fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Voltar
                        </button>
                        <button
                          onClick={() => { handleCancelTicket(ticket.id); setConfirmingId(null) }}
                          disabled={cancellingId === ticket.id}
                          style={{
                            flex: 2, padding: '9px 0', borderRadius: 10,
                            border: 'none', background: '#DC2626', color: '#fff',
                            fontFamily: "'Noto Sans', sans-serif", fontSize: 13, fontWeight: 700,
                            cursor: cancellingId === ticket.id ? 'not-allowed' : 'pointer',
                            opacity: cancellingId === ticket.id ? 0.6 : 1,
                          }}
                        >
                          {cancellingId === ticket.id ? 'Cancelando...' : 'Sim, cancelar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(ticket.id)}
                      style={{
                        marginTop: 12, width: '100%', padding: '9px 0', borderRadius: 10,
                        border: '1px solid #E8E8E8', background: '#fff', color: '#DC2626',
                        fontFamily: "'Noto Sans', sans-serif", fontSize: 13, fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar ingresso
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>

        {!loading && !eventCancelled && (
          <div style={{ marginTop: 32 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              textTransform: 'uppercase' as const, color: '#9A9A9A',
              marginBottom: 10,
            }}>
              Zona de risco
            </div>
            {!cancelEventConfirm ? (
              <button
                onClick={() => setCancelEventConfirm(true)}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 10,
                  border: '1px solid #FECACA', background: '#fff', color: '#DC2626',
                  fontFamily: "'Noto Sans', sans-serif", fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar evento
              </button>
            ) : (
              <div style={{
                background: '#FEF2F2', borderRadius: 14,
                border: '1px solid #FECACA', padding: 16,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
                  Tem certeza?
                </div>
                <div style={{ fontSize: 13, color: '#6E6E73', marginBottom: 16, lineHeight: 1.5 }}>
                  {activeTickets.length > 0
                    ? `Todos os ${activeTickets.length} ingressos ativos serão estornados e os compradores serão notificados por e-mail. Esta ação não pode ser desfeita.`
                    : 'Nenhum ingresso vendido. O evento será marcado como cancelado. Esta ação não pode ser desfeita.'
                  }
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setCancelEventConfirm(false)}
                    style={{
                      flex: 1, padding: '11px 0', borderRadius: 10,
                      border: '1px solid #E8E8E8', background: '#fff', color: '#1A1A1A',
                      fontFamily: "'Noto Sans', sans-serif", fontSize: 13, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCancelEvent}
                    disabled={cancelEventLoading}
                    style={{
                      flex: 2, padding: '11px 0', borderRadius: 10,
                      border: 'none', background: '#DC2626', color: '#fff',
                      fontFamily: "'Noto Sans', sans-serif", fontSize: 13, fontWeight: 700,
                      cursor: cancelEventLoading ? 'not-allowed' : 'pointer',
                      opacity: cancelEventLoading ? 0.6 : 1,
                    }}
                  >
                    {cancelEventLoading ? 'Cancelando...' : 'Sim, cancelar evento'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
