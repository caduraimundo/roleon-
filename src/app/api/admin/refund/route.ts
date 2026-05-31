import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyWaitlist } from '../../../../lib/notifyWaitlist'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RefundReason = 'arrependimento' | 'cancelamento' | 'adiamento'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')

  if (!token || token !== process.env.PAGARME_WEBHOOK_SECRET) {
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

  const { data: ticket, error: fetchError } = await supabaseAdmin
    .from('tickets')
    .select('id, status, order_id, event_id, ticket_type_id, price_paid, payment_method, created_at')
    .eq('id', ticket_id)
    .maybeSingle()

  if (fetchError || !ticket) {
    return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 400 })
  }

  if (ticket.status !== 'paid' && ticket.status !== 'valid') {
    return NextResponse.json({ error: 'Ticket não pode ser estornado (status inválido)' }, { status: 400 })
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, event_date, price')
    .eq('id', ticket.event_id)
    .maybeSingle()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 400 })
  }

  const now = new Date()

  if (reason === 'arrependimento') {
    const purchasedAt = new Date(ticket.created_at)
    const daysSincePurchase = (now.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSincePurchase > 7) {
      return NextResponse.json(
        { error: 'Prazo de arrependimento de 7 dias expirado' },
        { status: 400 }
      )
    }

    const eventDate = new Date(event.event_date.replace(' ', 'T'))
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilEvent < 48) {
      return NextResponse.json(
        { error: 'Evento em menos de 48h — arrependimento indisponível' },
        { status: 400 }
      )
    }
  }

  const refundAmount = Number(event.price)
  const refundAmountCents = Math.round(refundAmount * 100)

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
    headers: {
      Authorization: pagarmeAuth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: refundAmountCents }),
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
      triggered_by: 'admin',
      metadata: {
        reason,
        price_paid: ticket.price_paid,
        refund_amount: refundAmount,
        roleon_fee_retained: Number(ticket.price_paid) - refundAmount,
        payment_method: ticket.payment_method,
        order_id: orderId,
        charge_id: chargeId,
      },
    })
  })().catch(() => {})

  notifyWaitlist({
    eventId: String(ticket.event_id),
    ticketTypeId: ticket.ticket_type_id ? String(ticket.ticket_type_id) : null,
  }).catch(err => console.error('[admin/refund] notifyWaitlist erro:', err))

  return NextResponse.json({
    success: true,
    ticket_id,
    order_id: orderId,
    reason,
    refund_amount: refundAmount,
  })
}
