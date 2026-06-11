import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ event_id: string }> }
) {
  try {
    const { event_id } = await params
    const { access_token, checkin_token } = await req.json()

    if (!access_token || !checkin_token) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    const { data: evento } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('id', event_id)
      .eq('checkin_access_token', access_token)
      .maybeSingle()

    if (!evento) {
      return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 403 })
    }

    const query = supabaseAdmin
      .from('tickets')
      .select('id, status, event_id, ticket_type_name, checkin_token, user_id, recipient_email, checked_in_at')

    const { data: ticket } = await (
      checkin_token.length <= 6
        ? query.ilike('checkin_token', checkin_token + '%')
        : query.eq('checkin_token', checkin_token)
    ).maybeSingle()

    if (!ticket) {
      return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 })
    }
    if (ticket.event_id !== event_id) {
      return NextResponse.json({ error: 'Ingresso não é deste evento' }, { status: 400 })
    }
    if (ticket.status === 'used') {
      return NextResponse.json({
        error: 'Ingresso já utilizado',
        checked_in_at: (ticket as any).checked_in_at ?? null,
      }, { status: 409 })
    }
    if (ticket.status !== 'paid' && ticket.status !== 'valid') {
      return NextResponse.json({ error: 'Ingresso inválido' }, { status: 400 })
    }

    let buyer_name: string | null = null
    if ((ticket as any).user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('id', (ticket as any).user_id)
        .maybeSingle()
      buyer_name = profile?.name ?? null
    }
    if (!buyer_name && (ticket as any).recipient_email) {
      buyer_name = (ticket as any).recipient_email
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

    const { data: allTickets } = await supabaseAdmin
      .from('tickets')
      .select('status')
      .eq('event_id', event_id)
      .in('status', ['paid', 'used'])

    const total_sold = allTickets?.length ?? 0
    const total_checkins = allTickets?.filter(t => t.status === 'used').length ?? 0

    return NextResponse.json({
      success: true,
      ticket_type: ticket.ticket_type_name ?? 'Ingresso',
      buyer_name,
      total_sold,
      total_checkins,
    })
  } catch (err) {
    console.error('[portaria scan POST] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
