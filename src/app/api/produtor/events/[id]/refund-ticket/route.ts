import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { performRefund } from '@/lib/refund'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthProducer(req: NextRequest, event_id: string) {
  const bearerToken = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(bearerToken)
  if (!user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'producer' && profile?.role !== 'admin') return null
  if (profile?.role === 'producer') {
    const { data: evento } = await supabaseAdmin
      .from('events').select('id').eq('id', event_id).eq('producer_id', user.id).maybeSingle()
    if (!evento) return null
  }
  return user
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: event_id } = await params
    const user = await getAuthProducer(req, event_id)
    if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { ticket_id } = await req.json()
    if (!ticket_id) {
      return NextResponse.json({ error: 'ticket_id obrigatório' }, { status: 400 })
    }

    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, event_id, order_id, status')
      .eq('id', ticket_id)
      .maybeSingle()

    if (!ticket || ticket.event_id !== event_id) {
      return NextResponse.json({ error: 'Ingresso não pertence a este evento' }, { status: 400 })
    }

    if (ticket.status === 'valid' && !ticket.order_id) {
      await supabaseAdmin
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('id', ticket_id)

      await supabaseAdmin.from('ticket_audit_log').insert({
        ticket_id,
        old_status: ticket.status,
        new_status: 'cancelled',
        triggered_by: 'producer',
        metadata: { reason: 'cancelamento', payment_method: 'free' },
      })

      return NextResponse.json({ success: true, ticket_id, refund_amount: 0 })
    }

    const result = await performRefund({
      ticket_id,
      reason: 'cancelamento',
      triggered_by: 'producer',
      send_email: true,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      ticket_id: result.ticket_id,
      refund_amount: result.refund_amount,
    })
  } catch (err) {
    console.error('[refund-ticket POST] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
