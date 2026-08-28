import type { Metadata } from 'next'
import { supabase } from '../../../lib/supabase'
import EventoClient from './EventoClient'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const { data } = await supabase
    .from('events')
    .select('title, description, cover_image')
    .eq(isUUID ? 'id' : 'slug', id)
    .single()

  if (!data) {
    return { title: 'Evento nao encontrado' }
  }

  const title = data.title ?? 'Evento'
  const description = data.description ? data.description.slice(0, 160) : 'Confira este evento no Roleon.'
  const image = data.cover_image ?? '/logo/roleon-logo.png'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image }],
      url: `https://www.roleon.com.br/evento/${id}`,
      type: 'website',
    },
  }
}

export default function Page() {
  return <EventoClient />
}
