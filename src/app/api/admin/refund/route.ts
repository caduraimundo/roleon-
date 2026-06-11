import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { performRefund, RefundReason } from '../../../../lib/refund'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthAdmin(req: NextRequest) {
  const bearerToken = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!bearerToken) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(bearerToken)
  if (!user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function POST(req: NextRequest) {
  const user = await getAuthAdmin(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { ticket_id, reason } = body as { ticket_id: string; reason: RefundReason }

  if (!ticket_id) {
    return NextResponse.json({ error: 'ticket_id obrigatório' }, { status: 400 })
  }

  const validReasons: RefundReason[] = ['arrependimento', 'cancelamento', 'adiamento']
  if (!reason || !validReasons.includes(reason)) {
    return NextResponse.json(
      { error: 'reason obrigatório: arrependimento | cancelamento | adiamento' },
      { status: 400 }
    )
  }

  if (reason === 'arrependimento') {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('created_at, event_id')
      .eq('id', ticket_id)
      .maybeSingle()

    if (ticket) {
      const now = new Date()
      const daysSincePurchase =
        (now.getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24)

      if (daysSincePurchase > 7) {
        return NextResponse.json(
          { error: 'Prazo de arrependimento de 7 dias expirado' },
          { status: 400 }
        )
      }

      const { data: event } = await supabaseAdmin
        .from('events')
        .select('event_date')
        .eq('id', ticket.event_id)
        .maybeSingle()

      if (event) {
        const hoursUntilEvent =
          (new Date(event.event_date.replace(' ', 'T')).getTime() - now.getTime()) /
          (1000 * 60 * 60)

        if (hoursUntilEvent < 48) {
          return NextResponse.json(
            { error: 'Evento em menos de 48h — arrependimento indisponível' },
            { status: 400 }
          )
        }
      }
    }
  }

  const result = await performRefund({
    ticket_id,
    reason,
    triggered_by: 'admin',
    send_email: true,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    ticket_id: result.ticket_id,
    order_id: result.order_id,
    reason,
    refund_amount: result.refund_amount,
  })
}
