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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, producer_id, status')
    .eq('id', id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  if (event.producer_id !== user.id) {
    return NextResponse.json({ error: 'Você não tem permissão para editar este evento' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title,
    description,
    event_date,
    location_name,
    location_lat,
    location_lng,
    genre,
    is_free,
    is_unlimited,
    cover_image,
    policies,
    ticket_types,
  } = body

  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = title
  if (description !== undefined) update.description = description
  if (event_date !== undefined) update.event_date = event_date
  if (location_name !== undefined) update.location_name = location_name
  if (location_lat !== undefined) update.location_lat = location_lat
  if (location_lng !== undefined) update.location_lng = location_lng
  if (genre !== undefined) update.genre = genre
  if (is_free !== undefined) update.is_free = is_free
  if (is_unlimited !== undefined) update.is_unlimited = is_unlimited
  if (cover_image !== undefined) update.cover_image = cover_image
  if (policies !== undefined) update.policies = policies

  // Recalcula price com base nos ticket_types enviados
  if (is_free !== undefined || ticket_types !== undefined) {
    const isFreeVal = is_free ?? false
    const tickets = Array.isArray(ticket_types) ? ticket_types as { price: number }[] : []
    const validPrices = tickets.map(t => Number(t.price) || 0).filter(p => p > 0)
    update.price = isFreeVal ? 0 : validPrices.length > 0 ? Math.min(...validPrices) : 0
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabaseAdmin
      .from('events')
      .update(update)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar evento' }, { status: 500 })
    }
  }

  if (Array.isArray(ticket_types) && ticket_types.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from('ticket_types')
      .delete()
      .eq('event_id', id)

    if (deleteError) {
      return NextResponse.json({ error: 'Erro ao atualizar tipos de ingresso' }, { status: 500 })
    }

    const rows = (ticket_types as { name: string; price: number; quantity: number | null }[]).map(t => ({
      event_id: id,
      name: t.name,
      price: t.price,
      quantity: t.quantity ?? null,
    }))

    const { error: insertError } = await supabaseAdmin.from('ticket_types').insert(rows)
    if (insertError) {
      return NextResponse.json({ error: 'Erro ao salvar tipos de ingresso' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
