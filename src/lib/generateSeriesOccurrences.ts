function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00-03:00`).getDay()
}

export function computeOccurrenceDates(series: {
  recurrence_day_of_week: number
  recurrence_frequency: 'weekly' | 'biweekly'
  initial_batch_size: number
}): string[] {
  // Calcula as datas das ocorrências iniciais
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  let firstOccurrence = addDays(todayStr, 1) // nunca gera pra hoje
  while (weekdayOf(firstOccurrence) !== series.recurrence_day_of_week) {
    firstOccurrence = addDays(firstOccurrence, 1)
  }

  const step = series.recurrence_frequency === 'biweekly' ? 14 : 7
  const occurrenceDates: string[] = []
  let candidate = firstOccurrence
  while (occurrenceDates.length < series.initial_batch_size) {
    occurrenceDates.push(candidate)
    candidate = addDays(candidate, step)
  }

  return occurrenceDates
}

export function buildOccurrenceRows(series: {
  id: string
  slug: string
  title: string
  description: string | null
  genre: string[] | null
  age_rating: string
  location_name: string
  location_lat: number | null
  location_lng: number | null
  cover_image: string | null
  additional_info: string[] | null
  is_free: boolean
  is_unlimited: boolean
  display_organizer_name: string | null
  producer_id: string | null
  event_start_time: string
  event_end_time: string
  ticket_types_template: { name: string; price: number; quantity: number | null }[]
}, dates: string[]) {
  const crossesMidnight = series.event_end_time < series.event_start_time

  const ticketTemplate = Array.isArray(series.ticket_types_template) ? series.ticket_types_template : []
  const price = series.is_free
    ? 0
    : ticketTemplate.length > 0
      ? Math.min(...(ticketTemplate as { price: number }[]).map(t => Number(t.price) || 0).filter(p => p > 0))
      : 0

  const eventRows = dates.map((D) => {
    const endDateBase = crossesMidnight ? addDays(D, 1) : D
    const startTimeHM = series.event_start_time.slice(0, 5)
    const endTimeHM = series.event_end_time.slice(0, 5)
    return {
      title: series.title,
      slug: `${series.slug}-${D}`,
      description: series.description,
      event_date: `${D}T${startTimeHM}:00-03:00`,
      event_end_date: `${endDateBase}T${endTimeHM}:00-03:00`,
      location_name: series.location_name,
      location_lat: series.location_lat,
      location_lng: series.location_lng,
      genre: series.genre,
      age_rating: series.age_rating,
      additional_info: series.additional_info,
      cover_image: series.cover_image,
      display_organizer_name: series.display_organizer_name,
      attraction: null,
      is_free: series.is_free,
      is_unlimited: series.is_unlimited,
      series_id: series.id,
      producer_id: series.producer_id,
      status: 'active',
      price,
    }
  })

  const ticketTemplatesByIndex = dates.map(() => ticketTemplate)

  return { eventRows, ticketTemplatesByIndex }
}
