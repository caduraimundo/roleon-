import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import BackButton from './BackButton'

const GENRE_COLORS: Record<string, string> = {
  'Samba/Pagode': '#C8956C', 'MPB': '#7C9E87', 'Rock': '#7B7FA8',
  'Funk': '#C97B8A', 'Sertanejo': '#C4A35A', 'Forró': '#D4845A',
  'Rap': '#6E7D8C', 'Eletrônico': '#6B8FBF', 'Piseiro': '#C97B72',
  'Reggae': '#7CA87C', 'Indie': '#9E8AB4', 'Axé': '#D4A644', 'República': '#A07850',
}

export default async function EventoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: ev } = await supabase
    .from('events')
    .select('id, title, genre, price, location_lat, location_lng, location_name, event_date, is_free, status, description')
    .eq('id', id)
    .single()

  if (!ev) notFound()

  const d = ev.event_date ? new Date(ev.event_date) : null
  const dateStr = d
    ? d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : null
  const timeStr = d
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  const heroColor = GENRE_COLORS[ev.genre] ?? '#9E9E9E'
  const isFree = ev.is_free || ev.price === 0

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Hero */}
      <div style={{
        height: 260,
        background: heroColor,
        position: 'relative',
        flexShrink: 0,
      }}>
        {/* Grid sutil */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
          <g stroke="#fff" strokeWidth="0.8" fill="none">
            <path d="M0 25 L100 25 M0 50 L100 50 M0 75 L100 75"/>
            <path d="M25 0 L25 100 M50 0 L50 100 M75 0 L75 100"/>
          </g>
        </svg>

        {/* Botão voltar */}
        <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: 16 }}>
          <BackButton />
        </div>

        {/* Gênero */}
        <div style={{
          position: 'absolute', bottom: 20, left: 20,
          color: '#fff', opacity: 0.9,
          fontFamily: "'Noto Sans', sans-serif",
          fontSize: 12, fontWeight: 700,
          letterSpacing: 1.5, textTransform: 'uppercase',
        }}>
          {ev.genre}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Título + pill gênero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            display: 'inline-flex', alignSelf: 'flex-start',
            background: '#E6F7F6', color: '#0EA5A0',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
            textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999,
          }}>
            {ev.genre}
          </div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 800,
            color: '#1A1A1A', lineHeight: 1.2, letterSpacing: -0.4,
          }}>
            {ev.title}
          </h1>
        </div>

        {/* Infos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dateStr && (
            <InfoRow icon="📅" label={`${dateStr}${timeStr ? ` · ${timeStr}` : ''}`} />
          )}
          {ev.location_name && (
            <InfoRow icon="📍" label={ev.location_name} />
          )}
          {isFree ? (
            <InfoRow icon="🎟️" label="Entrada gratuita" />
          ) : (
            <InfoRow icon="🎟️" label={`R$ ${Number(ev.price).toFixed(2).replace('.', ',')}`} />
          )}
        </div>

        {/* Descrição */}
        {ev.description && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.7 }}>
              Sobre o evento
            </div>
            <p style={{ margin: 0, fontSize: 15, color: '#3A3A3A', lineHeight: 1.65 }}>
              {ev.description}
            </p>
          </div>
        )}
      </div>

      {/* CTA fixo no rodapé */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: '#F9F9F9',
        borderTop: '0.5px solid #E8E8E8',
        padding: '14px 20px calc(env(safe-area-inset-bottom, 0px) + 14px)',
      }}>
        <button style={{
          width: '100%',
          background: isFree ? '#22C55E' : '#0EA5A0',
          color: '#fff',
          border: 0, cursor: 'pointer',
          padding: '16px 20px',
          borderRadius: 14,
          fontSize: 16, fontWeight: 700,
          fontFamily: "'Noto Sans', sans-serif",
          boxShadow: isFree
            ? '0 6px 20px rgba(34,197,94,0.30)'
            : '0 6px 20px rgba(14,165,160,0.30)',
          letterSpacing: -0.1,
        }}>
          {isFree
            ? 'Participar'
            : `Comprar ingresso · R$ ${Number(ev.price).toFixed(2).replace('.', ',')}`}
        </button>
      </div>
    </div>
  )
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 14.5, color: '#3A3A3A', lineHeight: 1.5 }}>{label}</span>
    </div>
  )
}
