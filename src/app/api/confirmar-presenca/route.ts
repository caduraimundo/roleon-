import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { notifyWaitlist } from '../../../lib/notifyWaitlist'

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
    return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
  }

  const { event_id, ticket_type_id } = await req.json()
  if (!event_id || !ticket_type_id) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes: event_id, ticket_type_id' }, { status: 400 })
  }

  const { data: tt, error: ttError } = await supabaseAdmin
    .from('ticket_types')
    .select('id, name, price, event_id')
    .eq('id', ticket_type_id)
    .single()

  if (ttError || !tt) {
    return NextResponse.json({ error: 'Tipo de ingresso não encontrado' }, { status: 404 })
  }
  if (tt.event_id !== event_id) {
    return NextResponse.json({ error: 'Tipo de ingresso não pertence a este evento' }, { status: 400 })
  }
  if (Number(tt.price) > 0) {
    return NextResponse.json({ error: 'Este tipo de ingresso não é gratuito' }, { status: 400 })
  }

  const { data: reserved, error: reserveError } = await supabaseAdmin
    .rpc('reserve_ticket_stock', { p_ticket_type_id: ticket_type_id })

  if (reserveError || !reserved) {
    return NextResponse.json({ error: 'Vagas esgotadas para este evento.' }, { status: 409 })
  }

  const checkinToken = randomBytes(32).toString('hex')

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .insert({
      event_id,
      ticket_type_id,
      ticket_type_name: tt.name,
      price_paid: 0,
      producer_amount: 0,
      status: 'confirmed',
      payment_method: 'free',
      user_id: user.id,
      recipient_email: user.email,
      checkin_token: checkinToken,
      qr_code: `free_${ticket_type_id}_${Date.now()}`,
    })
    .select('id')
    .single()

  if (ticketError || !ticket) {
    await supabaseAdmin.rpc('release_ticket_stock', { p_ticket_type_id: ticket_type_id })
    return NextResponse.json({ error: 'Falha ao confirmar presença', detail: ticketError?.message }, { status: 500 })
  }

  await supabaseAdmin.from('ticket_audit_log').insert({
    ticket_id: ticket.id,
    old_status: null,
    new_status: 'confirmed',
    triggered_by: 'checkout',
    metadata: { source: 'confirmar_presenca' },
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, ticket_id: ticket.id })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
  }

  const { event_id } = await req.json()
  if (!event_id) {
    return NextResponse.json({ error: 'Campo obrigatório ausente: event_id' }, { status: 400 })
  }

  const { data: ticket, error: findError } = await supabaseAdmin
    .from('tickets')
    .select('id, ticket_type_id')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (findError || !ticket) {
    return NextResponse.json({ error: 'Confirmação de presença não encontrada' }, { status: 404 })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('tickets')
    .delete()
    .eq('id', ticket.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Falha ao cancelar presença' }, { status: 500 })
  }

  if (ticket.ticket_type_id) {
    await supabaseAdmin.rpc('release_ticket_stock', { p_ticket_type_id: ticket.ticket_type_id })
    notifyWaitlist({ eventId: event_id, ticketTypeId: ticket.ticket_type_id }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
