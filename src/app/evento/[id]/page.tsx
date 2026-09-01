import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { fromSupabase } from './eventTransform'
import EventoClient from './EventoClient'

const getEventRow = cache(async (id: string, isUUID: boolean) => {
  const { data } = await supabase
    .from('events')
    .select('id, slug, title, genre, price, location_name, event_date, event_end_date, is_free, description, additional_info, cover_image, location_lat, location_lng, producer_id, display_organizer_name, age_rating, status')
    .eq(isUUID ? 'id' : 'slug', id)
    .single()

  return data
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const data = await getEventRow(id, isUUID)

  if (!data) {
    return { title: 'Evento nao encontrado' }
  }

  const title = data.title ?? 'Evento'
  const description = data.description ? data.description.slice(0, 160) : 'Confira este evento no Roleon.'
  const image = data.cover_image ?? '/og-image.png'
  const canonicalUrl = `https://www.roleon.com.br/evento/${data.slug ?? id}`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      images: [{ url: image }],
      url: canonicalUrl,
      type: 'website',
    },
  }
}

async function getEventJsonLd(id: string, isUUID: boolean) {
  const data = await getEventRow(id, isUUID)

  if (!data) {
    return null
  }

  const canonicalUrl = `https://www.roleon.com.br/evento/${data.slug ?? id}`
  const image = data.cover_image ?? 'https://www.roleon.com.br/og-image.png'

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: data.title,
    description: data.description,
    startDate: new Date(data.event_date).toISOString(),
    eventStatus: data.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: data.location_name,
      ...(data.location_lat != null && data.location_lng != null ? {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: data.location_lat,
          longitude: data.location_lng,
        },
      } : {}),
    },
    image: [image],
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      price: data.is_free ? '0' : Number(data.price).toFixed(2),
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
    },
  }

  if (data.event_end_date) {
    jsonLd.endDate = new Date(data.event_end_date).toISOString()
  }

  if (data.display_organizer_name) {
    jsonLd.organizer = {
      '@type': 'Organization',
      name: data.display_organizer_name,
    }
  }

  return jsonLd
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const jsonLd = await getEventJsonLd(id, isUUID)
  const data = await getEventRow(id, isUUID)
  const initialEvent = data ? fromSupabase(data as Record<string, unknown>) : null

  if (!initialEvent) {
    notFound()
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <EventoClient initialEvent={initialEvent} />
    </>
  )
}
