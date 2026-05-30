'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSmartBack } from '../../hooks/useSmartBack'
import { supabase } from '../../lib/supabase'
import AuthSheet from '../../components/AuthSheet'

interface InterestEvent {
  savedId: string
  eventId: string
  title: string
  genre: string
  price: number
  isFree: boolean
  dateStr: string | null
  coverUrl: string | null
}

function IconArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12 4L7 10l5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconStarEmpty() {
  return (
    <svg width="48" height="48" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2l2.4 4.9 5.4.8-3.9 3.8.9 5.3L10 14.3l-4.8 2.5.9-5.3L2.2 7.7l5.4-.8L10 2z"
        stroke="#C8C8C8" strokeWidth="1.2" strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="3.5" width="13" height="11" rx="2" stroke="#9A9A9A" strokeWidth="1.4"/>
      <path d="M1.5 7h13M5 1.5v4M11 1.5v4" stroke="#9A9A9A" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

export default function InteressesPage() {
  const router = useRouter()
  const goBack = useSmartBack('/')
  const [authed,   setAuthed]   = useState<boolean | null>(null)
  const [events,   setEvents]   = useState<InterestEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) { setAuthed(false); setLoading(false); return }
      setAuthed(true)

      const { data: rows, error } = await supabase
        .from('saved_events')
        .select(`
          id,
          event_id,
          events (
            id, title, genre, price, is_free, event_date, location_name, cover_image
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      console.log('INTERESSES DATA:', rows)
      console.log('INTERESSES ERROR:', error)

      if (rows) {
        setEvents(rows.map((row: any) => {
          const ev = row.events
          const d = ev?.event_date ? new Date(ev.event_date) : null
          const price = ev?.is_free ? 0 : (Number(ev?.price) || 0)
          return {
            savedId: row.id,
            eventId: String(ev?.id ?? row.event_id),
            title: String(ev?.title ?? ''),
            genre: String(ev?.genre ?? ''),
            price,
            isFree: !!(ev?.is_free) || price === 0,
            dateStr: d ? d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) : null,
            coverUrl: ev?.cover_image ?? null,
          }
        }))
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setAuthed(true); setShowAuth(false) }
      else setAuthed(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 16, paddingRight: 16,
        background: '#fff', borderBottom: '0.5px solid #EFEFEF',
        position: 'relative',
      }}>
        <button
          onClick={goBack}
          aria-label="Voltar"
          style={{
            width: 36, height: 36, borderRadius: 999,
            background: '#F2F2F2', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1A1A1A', flexShrink: 0,
          }}
        >
          <IconArrowLeft />
        </button>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 700, color: '#1A1A1A',
        }}>
          Meus interesses
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 14, color: '#9A9A9A' }}>Carregando...</div>
        </div>
      ) : !authed ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '72px 32px 0', gap: 16, textAlign: 'center',
        }}>
          <IconStarEmpty />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>
              Entre pra ver seus interesses
            </div>
            <div style={{ fontSize: 14, color: '#8A8A8A', lineHeight: 1.5 }}>
              Marque interesse nos eventos e acesse aqui
            </div>
          </div>
          <button
            onClick={() => setShowAuth(true)}
            style={{
              marginTop: 8, background: '#0EA5A0', color: '#fff',
              border: 0, borderRadius: 12, cursor: 'pointer',
              padding: '13px 36px', fontSize: 15, fontWeight: 700,
              fontFamily: "'Noto Sans', sans-serif",
              boxShadow: '0 6px 16px rgba(14,165,160,0.25)',
            }}
          >
            Entrar
          </button>
        </div>
      ) : events.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '72px 32px 0', gap: 12, textAlign: 'center',
        }}>
          <IconStarEmpty />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>
              Nenhum interesse ainda
            </div>
            <div style={{ fontSize: 14, color: '#8A8A8A', lineHeight: 1.5 }}>
              Explore e marque os rolês que curtir
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 16px 0' }}>
          {events.map((ev) => (
            <div key={ev.savedId} style={{
              background: '#fff', borderRadius: 14,
              border: '1px solid #EFEFEF', overflow: 'hidden',
            }}>
              {ev.coverUrl ? (
                <img src={ev.coverUrl} alt={ev.title} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: 140, background: '#E6F7F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#0EA5A0', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {ev.genre}
                  </span>
                </div>
              )}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>
                    {ev.title}
                  </div>
                  {ev.dateStr && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#8A8A8A' }}>
                      <IconCalendar />
                      {ev.dateStr}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ev.isFree ? '#0EA5A0' : '#1A1A1A' }}>
                    {ev.isFree ? 'Gratuito' : `R$ ${ev.price.toFixed(2).replace('.', ',')}`}
                  </div>
                  <button
                    onClick={() => router.push(`/evento/${ev.eventId}`)}
                    style={{
                      background: '#0EA5A0', color: '#fff',
                      border: 0, borderRadius: 8, cursor: 'pointer',
                      padding: '8px 16px', fontSize: 13, fontWeight: 600,
                      fontFamily: "'Noto Sans', sans-serif",
                    }}
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
