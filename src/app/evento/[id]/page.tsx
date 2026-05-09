'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import HeroActions from './HeroActions'
import EventoCTA from './EventoCTA'
import type { RoleonEvent } from '../../../components/EventBottomSheet'

const GENRE_COLORS: Record<string, string> = {
  'Samba/Pagode': '#7B5E57',
  'MPB':          '#556B5D',
  'República':    '#6B5E7A',
  'Funk':         '#8A6F4A',
  'Forró':        '#7A6550',
  'Rock':         '#4A6B6F',
}
const DEFAULT_COLOR = '#0EA5A0'

interface FullEvent {
  id: string
  title: string
  genre: string
  price: number
  isFree: boolean
  fee: number
  venue: string
  dateStr: string | null
  timeStr: string | null
  yearStr: string | null
  heroColor: string
  likes: number
  description?: string | null
  policies?: string[] | null
}

function fromCache(cached: RoleonEvent): FullEvent {
  return {
    id:        cached.id,
    title:     cached.title,
    genre:     cached.genre,
    price:     cached.price,
    isFree:    cached.price === 0,
    fee:       cached.fee,
    venue:     cached.venue,
    dateStr:   cached.date || null,
    timeStr:   cached.time || null,
    yearStr:   null,
    heroColor: GENRE_COLORS[cached.genre] ?? DEFAULT_COLOR,
    likes:     cached.likes,
    description: cached.description ?? null,
    policies:  null,
  }
}

function fromSupabase(row: Record<string, unknown>): FullEvent {
  const d       = row.event_date ? new Date(row.event_date as string) : null
  const price   = Number(row.price) || 0
  const isFree  = !!(row.is_free) || price === 0
  return {
    id:        String(row.id),
    title:     (row.title as string) ?? '',
    genre:     (row.genre as string) ?? '',
    price,
    isFree,
    fee:       isFree ? 0 : Math.round(price * 0.05 * 100) / 100,
    venue:     (row.location_name as string) ?? '',
    dateStr:   d ? d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : null,
    timeStr:   d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null,
    yearStr:   d ? d.toLocaleDateString('pt-BR', { year: 'numeric' }) : null,
    heroColor: GENRE_COLORS[(row.genre as string)] ?? DEFAULT_COLOR,
    likes:     (row.likes_count as number) ?? 0,
    description: (row.description as string | null) ?? null,
    policies:    Array.isArray(row.policies) ? (row.policies as string[]) : null,
  }
}

// ── Ícones SVG ───────────────────────────────────────────────────────────────

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="3.5" width="13" height="11" rx="2" stroke="#0EA5A0" strokeWidth="1.4"/>
      <path d="M1.5 7h13M5 1.5v4M11 1.5v4" stroke="#0EA5A0" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 1.5C5.79 1.5 4 3.29 4 5.5c0 3.25 4 9 4 9s4-5.75 4-9c0-2.21-1.79-4-4-4z"
        stroke="#0EA5A0" strokeWidth="1.4" fill="none"/>
      <circle cx="8" cy="5.5" r="1.5" fill="#0EA5A0"/>
    </svg>
  )
}

function IconHeart() {
  return (
    <svg width="13" height="13" viewBox="0 0 22 22" fill="#E26A6A">
      <path d="M11 18.5s-6.5-4-6.5-9a3.8 3.8 0 016.5-2.7A3.8 3.8 0 0117.5 9.5c0 5-6.5 9-6.5 9z"
        stroke="#E26A6A" strokeWidth="1.9" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EventoPage() {
  const params = useParams()
  const id     = String(params.id)

  const [ev,       setEv]       = useState<FullEvent | null>(null)
  const [missing,  setMissing]  = useState(false)

  useEffect(() => {
    // 1. Lê do sessionStorage para exibição imediata
    try {
      const raw = sessionStorage.getItem(`evento-${id}`)
      if (raw) setEv(fromCache(JSON.parse(raw) as RoleonEvent))
    } catch {}

    // 2. Busca do Supabase em paralelo para dados completos e frescos
    supabase
      .from('events')
      .select('id, title, genre, price, location_name, event_date, is_free, description, likes_count, policies')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) { setMissing(true); return }
        const full = fromSupabase(data as Record<string, unknown>)
        setEv(full)
        try { sessionStorage.setItem(`evento-${id}`, JSON.stringify(full)) } catch {}
      })
  }, [id])

  if (missing) notFound()

  if (!ev) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F9F9F9' }}>
        <div style={{ height: 260, background: DEFAULT_COLOR, opacity: 0.6 }} />
      </div>
    )
  }

  const dateLabel = [ev.dateStr, ev.yearStr].filter(Boolean).join(', ') + (ev.timeStr ? ` · ${ev.timeStr}` : '')

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)',
    }}>

      {/* ── HERO ── */}
      <div style={{ height: 260, background: ev.heroColor, position: 'relative', flexShrink: 0, overflow: 'hidden' }}>

        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 100,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 100%)',
          zIndex: 1,
        }} />

        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}>
          <g stroke="#fff" strokeWidth="0.5" fill="none">
            <path d="M0 20 L100 20 M0 40 L100 40 M0 60 L100 60 M0 80 L100 80"/>
            <path d="M20 0 L20 100 M40 0 L40 100 M60 0 L60 100 M80 0 L80 100"/>
          </g>
        </svg>

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(to top, rgba(0,0,0,0.48) 0%, transparent 100%)',
          zIndex: 1,
        }} />

        <div style={{
          position: 'absolute', bottom: 16, left: 18, zIndex: 2,
          color: '#fff', opacity: 0.85,
          fontFamily: "'JetBrains Mono', 'Courier New', ui-monospace, monospace",
          fontSize: 10, fontWeight: 500, letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}>
          {ev.genre} · FOTO DO EVENTO
        </div>

        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <HeroActions title={ev.title} eventId={ev.id} />
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{ flex: 1, padding: '22px 20px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Genre pill + likes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            background: '#E6F7F6', color: '#0EA5A0',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.7,
            textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999,
          }}>
            {ev.genre}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6E6E73', fontWeight: 600 }}>
            <IconHeart />
            {ev.likes}
          </div>
        </div>

        {/* Título */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: -6 }}>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 800,
            color: '#1A1A1A', lineHeight: 1.2, letterSpacing: -0.5,
          }}>
            {ev.title}
          </h1>
          {ev.venue && (
            <div style={{ fontSize: 13.5, color: '#8A8A8A', fontWeight: 500 }}>
              por {ev.venue}
            </div>
          )}
        </div>

        {/* Card data + local */}
        <div style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #EFEFEF',
          overflow: 'hidden',
        }}>
          {ev.dateStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <IconCalendar />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  Data
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                  {dateLabel}
                </div>
              </div>
            </div>
          )}

          {ev.dateStr && ev.venue && (
            <div style={{ height: 1, background: '#F2F2F2', margin: '0 16px' }} />
          )}

          {ev.venue && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
              <div style={{ marginTop: 2 }}><IconPin /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 2 }}>
                  {ev.venue}
                </div>
                <div style={{ fontSize: 12.5, color: '#9A9A9A' }}>
                  Ouro Preto, MG
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão "Como chegar" */}
        {ev.venue && (
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'transparent',
            border: '1.5px solid #0EA5A0',
            borderRadius: 10, padding: '11px 18px',
            color: '#0EA5A0', fontSize: 14, fontWeight: 600,
            fontFamily: "'Noto Sans', sans-serif",
            cursor: 'pointer', width: '100%',
          }}>
            <IconPin />
            Como chegar
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 2 }}>
              <path d="M3 11L11 3M11 3H6M11 3v5" stroke="#0EA5A0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Seção descrição */}
        {ev.description && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#9A9A9A',
              textTransform: 'uppercase', letterSpacing: 0.8,
            }}>
              O Ambiente
            </div>
            <p style={{ margin: 0, fontSize: 14.5, color: '#3A3A3A', lineHeight: 1.7 }}>
              {ev.description}
            </p>
          </div>
        )}

        {/* Seção políticas */}
        {ev.policies && ev.policies.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#9A9A9A',
              textTransform: 'uppercase', letterSpacing: 0.8,
            }}>
              Políticas do evento
            </div>
            <div style={{
              background: '#fff',
              border: '1px solid #EFEFEF',
              borderRadius: 14,
              overflow: 'hidden',
            }}>
              {ev.policies.map((policy, i) => (
                <div key={i}>
                  {i > 0 && <div style={{ height: '0.5px', background: '#EFEFEF', margin: '0 14px' }} />}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="7" cy="7" r="6.2" stroke="#0EA5A0" strokeWidth="1.3"/>
                      <path d="M7 6.2v4" stroke="#0EA5A0" strokeWidth="1.4" strokeLinecap="round"/>
                      <circle cx="7" cy="4.2" r="0.7" fill="#0EA5A0"/>
                    </svg>
                    <span style={{
                      fontSize: 13.5, color: '#1A1A1A', lineHeight: 1.55,
                      fontFamily: "'Noto Sans', sans-serif",
                    }}>
                      {policy}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <EventoCTA isFree={ev.isFree} price={ev.price} fee={ev.fee} />
    </div>
  )
}
