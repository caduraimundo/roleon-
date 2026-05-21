import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyWaitlist } from '../../../../lib/notifyWaitlist'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')

  if (!token || token !== process.env.PAGARME_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { ticket_id } = body

  if (!ticket_id) {
    return NextResponse.json({ error: 'ticket_id obrigatório' }, { status: 400 })
  }

  const { data: ticket, error: fetchError } = await supabaseAdmin
    .from('tickets')
    .select('id, status, order_id, event_id, ticket_type_id, price_paid, payment_method')
    .eq('id', ticket_id)
    .maybeSingle()

  if (fetchError || !ticket) {
    return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 400 })
  }

  if (ticket.status !== 'paid' && ticket.status !== 'valid') {
    return NextResponse.json({ error: 'Ticket não pode ser estornado (status inválido)' }, { status: 400 })
  }

  const orderId = ticket.order_id
  const pagarmeAuth = `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`

  const orderRes = await fetch(`https://api.pagar.me/core/v5/orders/${orderId}`, {
    headers: { Authorization: pagarmeAuth },
  })

  if (!orderRes.ok) {
    const err = await orderRes.json().catch(() => ({}))
    console.error('[admin/refund] erro ao buscar pedido Pagar.me:', err)
    return NextResponse.json({ error: 'Erro ao buscar pedido no Pagar.me', detail: err }, { status: 502 })
  }

  const order = await orderRes.json()
  const chargeId: string | undefined = order.charges?.[0]?.id

  if (!chargeId) {
    return NextResponse.json({ error: 'charge_id não encontrado no pedido' }, { status: 502 })
  }

  const cancelRes = await fetch(`https://api.pagar.me/core/v5/charges/${chargeId}`, {
    method: 'DELETE',
    headers: { Authorization: pagarmeAuth },
  })

  if (!cancelRes.ok) {
    const err = await cancelRes.json().catch(() => ({}))
    console.error('[admin/refund] erro ao estornar charge Pagar.me:', err)
    return NextResponse.json({ error: 'Erro ao estornar no Pagar.me', detail: err }, { status: 502 })
  }

  await supabaseAdmin
    .from('tickets')
    .update({ status: 'refunded' })
    .eq('id', ticket_id)

  ;(async () => {
    await supabaseAdmin.from('ticket_audit_log').insert({
      ticket_id,
      old_status: ticket.status,
      new_status: 'refunded',
      triggered_by: 'system',
      metadata: {
        price_paid: ticket.price_paid,
        payment_method: ticket.payment_method,
        order_id: orderId,
        reason: 'admin_refund',
      },
    })
  })().catch(() => {})

  notifyWaitlist({
    eventId: String(ticket.event_id),
    ticketTypeId: ticket.ticket_type_id ? String(ticket.ticket_type_id) : null,
  }).catch(err => console.error('[admin/refund] notifyWaitlist erro:', err))

  return NextResponse.json({ success: true, ticket_id, order_id: orderId })
}
