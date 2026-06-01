'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function statusLabel(status: string) {
  if (status === 'pending') return { text: 'Aguardando aprovação', color: '#F59E0B', bg: '#FFFBEB' }
  if (status === 'active') return { text: 'No ar', color: '#10B981', bg: '#ECFDF5' }
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

export default function PainelPage() {
  const router = useRouter()
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

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

      setUserName(profile?.name ?? '')

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

  const futuros = eventos.filter(e => isFuturo(e.event_date))
  const passados = eventos.filter(e => !isFuturo(e.event_date))

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
    <div style={{ minHeight: 'calc(100vh - 56px)', background: '#F9F9F9', padding: '24px 20px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A' }}>Meus eventos</span>
          <button style={btnPrimary} onClick={() => router.push('/produtor/eventos/novo')}>
            + Novo evento
          </button>
        </div>

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
                <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', letterSpacing: 0.5, marginBottom: 12, marginTop: 20 }}>
                  PRÓXIMOS EVENTOS
                </p>
                {futuros.map(e => <EventCard key={e.id} e={e} router={router} />)}
              </>
            )}
            {passados.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', letterSpacing: 0.5, marginBottom: 12, marginTop: 20 }}>
                  EVENTOS PASSADOS
                </p>
                {passados.map(e => <EventCard key={e.id} e={e} router={router} />)}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}

function EventCard({ e, router }: { e: any; router: ReturnType<typeof useRouter> }) {
  const badge = statusLabel(e.status)

  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #F0F0F0',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <div style={{ width: 72, height: 72, borderRadius: 10, flexShrink: 0, overflow: 'hidden' }}>
        {e.cover_image ? (
          <img
            src={e.cover_image}
            width={72}
            height={72}
            style={{ objectFit: 'cover', borderRadius: 10, display: 'block' }}
            alt=""
          />
        ) : (
          <div style={{
            width: 72, height: 72, background: '#F0F7F7', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4" width="16" height="14" rx="2" stroke="#0EA5A0" strokeWidth="1.5"/>
              <path d="M2 8h16M6 2v4M14 2v4" stroke="#0EA5A0" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>{e.title}</span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            padding: '3px 8px', borderRadius: 20,
            color: badge.color, background: badge.bg,
            whiteSpace: 'nowrap',
          }}>
            {badge.text}
          </span>
        </div>

        <span style={{ fontSize: 13, color: '#6E6E73' }}>{formatDate(e.event_date)}</span>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#6E6E73' }}>
            {e.sold} {e.sold === 1 ? 'ingresso vendido' : 'ingressos vendidos'}
          </span>
          {e.revenue > 0 && (
            <span style={{ fontSize: 13, color: '#0EA5A0', fontWeight: 500 }}>
              {formatCurrency(e.revenue)}
            </span>
          )}
          {e.is_free && e.sold === 0 && (
            <span style={{ fontSize: 13, color: '#6E6E73' }}>Gratuito</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={() => router.push(`/produtor/eventos/${e.id}/editar`)}
            style={{
              padding: '7px 12px', borderRadius: 8,
              border: '1px solid #E8E8E8',
              background: '#fff', color: '#1A1A1A',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}
