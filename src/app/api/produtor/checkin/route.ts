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

async function getTicketCounts(event_id: string) {
  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('status')
    .eq('event_id', event_id)
    .in('status', ['paid', 'used', 'confirmed'])

  const total_sold = tickets?.length ?? 0
  const total_checkins = tickets?.filter(t => t.status === 'used').length ?? 0
  return { total_sold, total_checkins }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const event_id = req.nextUrl.searchParams.get('event_id') ?? ''

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'producer') {
      const { data: evento } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('id', event_id)
        .eq('producer_id', user.id)
        .maybeSingle()

      if (!evento) {
        return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
      }
    }

    const { total_sold, total_checkins } = await getTicketCounts(event_id)
    return NextResponse.json({ total_sold, total_checkins })
  } catch (err) {
    console.error('[checkin GET] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'producer' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { token, event_id } = await req.json()

    if (profile?.role === 'producer') {
      const { data: evento } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('id', event_id)
        .eq('producer_id', user.id)
        .maybeSingle()

      if (!evento) {
        return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
      }
    }

    const query = supabaseAdmin
      .from('tickets')
      .select('id, status, event_id, ticket_type_name, checkin_token')

    const { data: ticket } = await (
      token.length <= 6
        ? query.ilike('checkin_token', token + '%')
        : query.eq('checkin_token', token)
    ).maybeSingle()

    if (!ticket) {
      return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 })
    }

    if (ticket.event_id !== event_id) {
      return NextResponse.json({ error: 'Ingresso não é deste evento' }, { status: 400 })
    }

    if (ticket.status === 'used') {
      return NextResponse.json({ error: 'Ingresso já utilizado' }, { status: 409 })
    }

    if (ticket.status !== 'paid' && ticket.status !== 'confirmed') {
      return NextResponse.json({ error: 'Ingresso inválido' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'used', checked_in_at: new Date().toISOString() })
      .eq('id', ticket.id)
      .eq('status', ticket.status)
      .select('id')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Ingresso já utilizado' }, { status: 409 })
    }

    await supabaseAdmin.from('ticket_audit_log').insert({
      ticket_id: ticket.id,
      old_status: ticket.status,
      new_status: 'used',
      triggered_by: 'checkin',
      metadata: { source: 'produtor_checkin' },
    })

    const { total_sold, total_checkins } = await getTicketCounts(event_id)
    return NextResponse.json({
      success: true,
      ticket_type: ticket.ticket_type_name ?? 'Ingresso',
      total_sold,
      total_checkins,
    })
  } catch (err) {
    console.error('[checkin POST] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
