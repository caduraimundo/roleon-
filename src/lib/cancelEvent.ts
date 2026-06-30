import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { performRefund } from '@/lib/refund'
import * as Sentry from '@sentry/nextjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type CancelEventResult =
  | {
      success: true
      event: { id: string; title: string }
      refunded: number
      cancelled: number
      failed: number
      errors: string[]
    }
  | { success: false; error: string; status: number }

export async function cancelEventAndProcessTickets({
  event_id,
  triggered_by,
}: {
  event_id: string
  triggered_by: 'producer' | 'admin'
}): Promise<CancelEventResult> {
  const { data: eventCheck } = await supabaseAdmin
    .from('events')
    .select('status, event_date, title')
    .eq('id', event_id)
    .single()

  if (!eventCheck) return { success: false, error: 'Evento não encontrado', status: 404 }
  if (eventCheck.status !== 'active') return { success: false, error: 'Evento não está ativo', status: 400 }
  if (eventCheck.event_date && new Date((eventCheck.event_date as string).replace(' ', 'T')) < new Date()) {
    return { success: false, error: 'Evento já encerrado, não pode ser cancelado', status: 400 }
  }

  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', event_id)
    .eq('status', 'active')
    .select('id')

  if (claimError) {
    return { success: false, error: 'Erro ao cancelar evento', status: 500 }
  }
  if (!claimed || claimed.length === 0) {
    return { success: false, error: 'Evento já foi cancelado ou não está mais ativo.', status: 409 }
  }

  const { data: tickets, error } = await supabaseAdmin
    .from('tickets')
    .select('id, order_id, status, recipient_email')
    .eq('event_id', event_id)
    .in('status', ['paid', 'valid', 'confirmed'])

  if (error) {
    return { success: false, error: 'Erro ao buscar ingressos', status: 500 }
  }

  const results = { refunded: 0, cancelled: 0, failed: 0, errors: [] as string[] }

  for (const ticket of tickets ?? []) {
    if (ticket.status === 'confirmed') {
      const { error: updateErr } = await supabaseAdmin
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('id', ticket.id)

      if (!updateErr) {
        await supabaseAdmin.from('ticket_audit_log').insert({
          ticket_id: ticket.id,
          old_status: ticket.status,
          new_status: 'cancelled',
          triggered_by,
          metadata: { reason: 'cancelamento', payment_method: 'free' },
        })
        results.cancelled++

        if (ticket.recipient_email) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY)
            const { error: resendError } = await resend.emails.send({
              from: 'Roleon <noreply@roleon.com.br>',
              to: [ticket.recipient_email],
              subject: `Evento cancelado - ${eventCheck.title}`,
              html: `<div style="font-family:'Noto Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;"><div style="font-size:22px;font-weight:700;color:#0EA5A0;margin-bottom:24px;">Roleon</div><h2 style="font-size:18px;font-weight:700;margin:0 0 12px;">O evento foi cancelado</h2><p style="font-size:14px;color:#6E6E73;margin:0 0 16px;line-height:1.6;">O evento <strong style="color:#1A1A1A;">${eventCheck.title}</strong>, no qual você havia confirmado presença, foi cancelado pelo organizador.</p><p style="font-size:14px;color:#6E6E73;margin:0 0 16px;line-height:1.6;">Como era um evento gratuito, não há nada pendente da sua parte.</p><p style="font-size:12px;color:#9A9A9A;margin:24px 0 0;line-height:1.5;">Dúvidas? Fale com a gente em <a href="mailto:contato@roleon.com.br" style="color:#0EA5A0;">contato@roleon.com.br</a></p></div>`,
            })
            if (resendError) {
              console.error('[cancelEvent] Resend retornou erro (cancelamento gratuito):', resendError)
              Sentry.captureException(new Error(`Resend falhou ao notificar cancelamento gratuito: ${resendError.message}`), {
                extra: { eventId: event_id, ticketId: ticket.id, recipientEmail: ticket.recipient_email },
                tags: { fluxo: 'cancel-event-gratuito' },
              })
            }
          } catch (err) {
            console.error('[cancelEvent] erro ao enviar e-mail de cancelamento gratuito:', err)
            Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
              extra: { eventId: event_id, ticketId: ticket.id, recipientEmail: ticket.recipient_email },
              tags: { fluxo: 'cancel-event-gratuito' },
            })
          }
        }
      } else {
        results.failed++
        results.errors.push(ticket.id)
      }
      continue
    }

    if (ticket.status === 'valid' && !ticket.order_id) {
      const { error: updateErr } = await supabaseAdmin
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('id', ticket.id)

      if (!updateErr) {
        await supabaseAdmin.from('ticket_audit_log').insert({
          ticket_id: ticket.id,
          old_status: ticket.status,
          new_status: 'cancelled',
          triggered_by,
          metadata: { reason: 'cancelamento', payment_method: 'free' },
        })
        results.cancelled++
      } else {
        results.failed++
        results.errors.push(ticket.id)
      }
      continue
    }

    const result = await performRefund({
      ticket_id: ticket.id,
      reason: 'cancelamento',
      triggered_by,
      send_email: true,
    })

    if (result.success) {
      results.refunded++
    } else {
      results.failed++
      results.errors.push(ticket.id)
      console.error(`[cancelEvent] falhou ticket ${ticket.id}:`, result.error)
    }
  }

  return {
    success: true,
    event: { id: event_id, title: eventCheck.title },
    refunded: results.refunded,
    cancelled: results.cancelled,
    failed: results.failed,
    errors: results.errors,
  }
}
