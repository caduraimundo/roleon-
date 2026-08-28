import { calcFees } from '../../../lib/pricing'

const GENRE_COLORS: Record<string, string> = {
  'Samba/Pagode': '#7B5E57',
  'MPB':          '#556B5D',
  'República':    '#6B5E7A',
  'Funk':         '#8A6F4A',
  'Forró':        '#7A6550',
  'Rock':         '#4A6B6F',
}
const DEFAULT_COLOR = '#0EA5A0'

export interface FullEvent {
  id: string; slug: string; title: string; genre: string; genres: string[]; price: number
  isFree: boolean; fee: number; venue: string
  dateStr: string | null; timeStr: string | null; yearStr: string | null
  endDateStr: string | null; endTimeStr: string | null; endYearStr: string | null
  heroColor: string
  description?: string | null; additionalInfo?: string[] | null
  cover_image?: string | null
  location_lat?: number | null
  location_lng?: number | null
  displayOrganizerName?: string | null
  ageRating?: string | null
}

export function fromSupabase(row: Record<string, unknown>): FullEvent {
  const d = row.event_date ? new Date(row.event_date as string) : null
  const dEnd = row.event_end_date ? new Date(row.event_end_date as string) : null
  const price = Number(row.price) || 0
  const isFree = !!(row.is_free) || price === 0
  return {
    id: String(row.id), slug: (row.slug as string) ?? '', title: (row.title as string) ?? '',
    genre: Array.isArray(row.genre)
      ? (row.genre as string[])[0] ?? ''
      : (row.genre as string) ?? '',
    genres: Array.isArray(row.genre) && (row.genre as string[]).length > 0
      ? (row.genre as string[])
      : [(row.genre as string)].filter(Boolean),
    price, isFree,
    fee: isFree ? 0 : (() => { const f = calcFees(price, 1, 'pix'); return f.roleonFee + f.pagarmeFee })(),
    venue: ((row.location_name as string) ?? '').replace(/, CEP \d{5}-\d{3}$/, ''),
    dateStr: d ? d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }).replace(/^./, c => c.toUpperCase()) : null,
    timeStr: d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : null,
    yearStr: d ? d.toLocaleDateString('pt-BR', { year: 'numeric', timeZone: 'America/Sao_Paulo' }) : null,
    endDateStr: dEnd ? dEnd.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }).replace(/^./, c => c.toUpperCase()) : null,
    endTimeStr: dEnd ? dEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : null,
    endYearStr: dEnd ? dEnd.toLocaleDateString('pt-BR', { year: 'numeric', timeZone: 'America/Sao_Paulo' }) : null,
    ageRating: (row.age_rating as string | null) ?? null,
    heroColor: GENRE_COLORS[Array.isArray(row.genre)
      ? (row.genre as string[])[0] ?? ''
      : (row.genre as string) ?? ''] ?? DEFAULT_COLOR,
    description: (row.description as string | null) ?? null,
    additionalInfo: Array.isArray(row.additional_info) ? (row.additional_info as string[]) : null,
    cover_image: (row.cover_image as string | null) ?? null,
    location_lat: (row.location_lat as number | null) ?? null,
    location_lng: (row.location_lng as number | null) ?? null,
    displayOrganizerName: (row.display_organizer_name as string | null) ?? null,
  }
}
