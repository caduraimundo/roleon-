import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { notifyWaitlist } from './notifyWaitlist'
import * as Sentry from '@sentry/nextjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type RefundReason = 'arrependimento' | 'cancelamento' | 'adiamento'

export type RefundResult =
  | { success: true; ticket_id: string; order_id: string; refund_amount: number; charge_id: string }
  | { success: false; error: string; status: number }

export async function performRefund({
  ticket_id,
  reason,
  triggered_by,
  send_email = false,
}: {
  ticket_id: string
  reason: RefundReason
  triggered_by: 'admin' | 'producer' | 'webhook'
  send_email?: boolean
}): Promise<RefundResult> {
  const { data: ticket, error: fetchError } = await supabaseAdmin
    .from('tickets')
    .select('id, status, order_id, event_id, ticket_type_id, price_paid, producer_amount, discount_applied, payment_method, created_at, recipient_email')
    .eq('id', ticket_id)
    .maybeSingle()

  if (fetchError || !ticket) {
    return { success: false, error: 'Ingresso não encontrado', status: 404 }
  }

  if (ticket.status !== 'paid' && ticket.status !== 'valid') {
    return { success: false, error: 'Ingresso não pode ser estornado (status inválido)', status: 400 }
  }

  if (!ticket.order_id) {
    return { success: false, error: 'Pedido não encontrado no ingresso', status: 400 }
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, title, event_date, price')
    .eq('id', ticket.event_id)
    .maybeSingle()

  if (eventError || !event) {
    return { success: false, error: 'Evento não encontrado', status: 400 }
  }

  const refundAmount = Math.max(0, Number(ticket.producer_amount ?? ticket.price_paid))
  const refundAmountCents = Math.round(refundAmount * 100)
  const orderId = ticket.order_id
  const pagarmeAuth = `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`

  const orderRes = await fetch(`https://api.pagar.me/core/v5/orders/${orderId}`, {
    headers: { Authorization: pagarmeAuth },
  })

  if (!orderRes.ok) {
    const err = await orderRes.json().catch(() => ({}))
    console.error('[performRefund] erro ao buscar pedido Pagar.me:', err)
    return { success: false, error: 'Erro ao buscar pedido no Pagar.me', status: 502 }
  }

  const order = await orderRes.json()
  const chargeId: string | undefined = order.charges?.[0]?.id

  if (!chargeId) {
    return { success: false, error: 'charge_id não encontrado no pedido', status: 502 }
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
    console.error('[performRefund] erro ao estornar no Pagar.me:', err)
    return { success: false, error: 'Erro ao processar estorno no Pagar.me', status: 502 }
  }

  await supabaseAdmin
    .from('tickets')
    .update({ status: 'refunded' })
    .eq('id', ticket_id)

  await supabaseAdmin.from('ticket_audit_log').insert({
    ticket_id,
    old_status: ticket.status,
    new_status: 'refunded',
    triggered_by,
    metadata: {
      reason,
      price_paid: ticket.price_paid,
      refund_amount: refundAmount,
      roleon_fee_retained: Number(ticket.price_paid) - refundAmount,
      payment_method: ticket.payment_method,
      order_id: orderId,
      charge_id: chargeId,
    },
  }).then(({ error }) => {
    if (error) console.error('[performRefund] erro ao gravar audit log:', error)
  })

  notifyWaitlist({
    eventId: String(ticket.event_id),
    ticketTypeId: ticket.ticket_type_id ? String(ticket.ticket_type_id) : null,
  }).catch(err => console.error('[performRefund] notifyWaitlist erro:', err))

  if (send_email && ticket.recipient_email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const valorFormatado = refundAmount.toFixed(2).replace('.', ',')
      const { error: resendError } = await resend.emails.send({
        from: 'Roleon <noreply@roleon.com.br>',
        to: [ticket.recipient_email],
        subject: `Ingresso cancelado - ${event.title}`,
        html: `<div style="font-family:'Noto Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;"><div style="font-size:22px;font-weight:700;color:#0EA5A0;margin-bottom:24px;">Roleon</div><h2 style="font-size:18px;font-weight:700;margin:0 0 12px;">Seu ingresso foi cancelado</h2><p style="font-size:14px;color:#6E6E73;margin:0 0 16px;line-height:1.6;">Seu ingresso para <strong style="color:#1A1A1A;">${event.title}</strong> foi cancelado.</p><p style="font-size:14px;color:#6E6E73;margin:0 0 16px;line-height:1.6;">O valor de <strong style="color:#1A1A1A;">R$&nbsp;${valorFormatado}</strong> será estornado em até 7 dias úteis, dependendo da sua instituição financeira.</p><p style="font-size:12px;color:#9A9A9A;margin:24px 0 0;line-height:1.5;">Dúvidas? Fale com a gente em <a href="mailto:contato@roleon.com.br" style="color:#0EA5A0;">contato@roleon.com.br</a></p></div>`,
      })
      if (resendError) {
        console.error('[performRefund] Resend retornou erro:', resendError)
        Sentry.captureException(new Error(`Resend falhou ao enviar confirmação de estorno: ${resendError.message}`), {
          extra: { ticketId: ticket_id, orderId, recipientEmail: ticket.recipient_email },
          tags: { fluxo: 'refund-email' },
        })
      }
    } catch (err) {
      console.error('[performRefund] erro ao enviar e-mail de estorno:', err)
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
        extra: { ticketId: ticket_id, orderId, recipientEmail: ticket.recipient_email },
        tags: { fluxo: 'refund-email' },
      })
    }
  }

  return {
    success: true,
    ticket_id,
    order_id: orderId,
    refund_amount: refundAmount,
    charge_id: chargeId,
  }
}
