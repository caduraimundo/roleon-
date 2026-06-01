import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'producer') {
    return NextResponse.json({ error: 'Apenas produtores podem criar eventos' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title,
    description,
    event_date,
    location_name,
    location_lat,
    location_lng,
    genres,
    age_rating,
    policies,
    is_free,
    is_unlimited,
    cover_image,
    ticket_types,
  } = body

  for (const campo of ['title', 'event_date', 'location_name']) {
    if (!body[campo]) {
      return NextResponse.json({ error: `Campo obrigatório: ${campo}` }, { status: 400 })
    }
  }

  if (!Array.isArray(genres) || genres.length < 1) {
    return NextResponse.json({ error: 'Selecione pelo menos um gênero' }, { status: 400 })
  }

  if (!is_free) {
    const hasValidTicket = Array.isArray(ticket_types) &&
      ticket_types.some((t: { price: number }) => t.price > 0)
    if (!hasValidTicket) {
      return NextResponse.json(
        { error: 'Eventos pagos precisam de ao menos um tipo de ingresso com preço maior que zero' },
        { status: 400 }
      )
    }
  }

  const price = is_free
    ? 0
    : ticket_types.length > 0
      ? Math.min(...(ticket_types as { price: number }[]).map(t => Number(t.price) || 0).filter(p => p > 0))
      : 0

  const { data: evento, error: eventError } = await supabaseAdmin
    .from('events')
    .insert({
      title,
      description,
      event_date,
      location_name,
      location_lat,
      location_lng,
      genres,
      age_rating: age_rating ?? 'Livre',
      policies: Array.isArray(policies) ? policies : [],
      is_free,
      is_unlimited: is_free ? is_unlimited : false,
      cover_image: cover_image ?? null,
      producer_id: user.id,
      status: 'pending',
      price,
    })
    .select('id')
    .single()

  if (eventError || !evento) {
    return NextResponse.json({ error: 'Erro ao criar evento' }, { status: 500 })
  }

  if (Array.isArray(ticket_types) && ticket_types.length > 0 && !is_free) {
    const rows = (ticket_types as { name: string; price: number; quantity: number | null }[]).map(t => ({
      event_id: evento.id,
      name: t.name,
      price: t.price,
      quantity: t.quantity ?? null,
    }))

    const { error: ticketError } = await supabaseAdmin.from('ticket_types').insert(rows)
    if (ticketError) {
      return NextResponse.json({ error: 'Evento criado, mas erro ao salvar tipos de ingresso' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, event_id: evento.id }, { status: 200 })
}
