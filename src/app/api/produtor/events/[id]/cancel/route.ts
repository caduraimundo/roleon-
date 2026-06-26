import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { performRefund } from '@/lib/refund'
import { Resend } from 'resend'

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

    const { data: eventCheck } = await supabaseAdmin
      .from('events')
      .select('status, event_date, title')
      .eq('id', event_id)
      .single()

    if (!eventCheck) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    if (eventCheck.status !== 'active') return NextResponse.json({ error: 'Evento não está ativo' }, { status: 400 })
    if (eventCheck.event_date && new Date((eventCheck.event_date as string).replace(' ', 'T')) < new Date()) {
      return NextResponse.json({ error: 'Evento já encerrado, não pode ser cancelado' }, { status: 400 })
    }

    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('events')
      .update({ status: 'cancelled' })
      .eq('id', event_id)
      .eq('status', 'active')
      .select('id')

    if (claimError) {
      return NextResponse.json({ error: 'Erro ao cancelar evento' }, { status: 500 })
    }
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: 'Evento já foi cancelado ou não está mais ativo.' }, { status: 409 })
    }

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('id, order_id, status, recipient_email')
      .eq('event_id', event_id)
      .in('status', ['paid', 'valid', 'confirmed'])

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar ingressos' }, { status: 500 })
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
            triggered_by: 'producer',
            metadata: { reason: 'cancelamento', payment_method: 'free' },
          })
          results.cancelled++

          if (ticket.recipient_email) {
            ;(async () => {
              try {
                const resend = new Resend(process.env.RESEND_API_KEY)
                await resend.emails.send({
                  from: 'Roleon <noreply@roleon.com.br>',
                  to: [ticket.recipient_email],
                  subject: `Evento cancelado - ${eventCheck.title}`,
                  html: `<div style="font-family:'Noto Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;"><div style="font-size:22px;font-weight:700;color:#0EA5A0;margin-bottom:24px;">Roleon</div><h2 style="font-size:18px;font-weight:700;margin:0 0 12px;">O evento foi cancelado</h2><p style="font-size:14px;color:#6E6E73;margin:0 0 16px;line-height:1.6;">O evento <strong style="color:#1A1A1A;">${eventCheck.title}</strong>, no qual você havia confirmado presença, foi cancelado pelo organizador.</p><p style="font-size:14px;color:#6E6E73;margin:0 0 16px;line-height:1.6;">Como era um evento gratuito, não há nada pendente da sua parte.</p><p style="font-size:12px;color:#9A9A9A;margin:24px 0 0;line-height:1.5;">Dúvidas? Fale com a gente em <a href="mailto:contato@roleon.com.br" style="color:#0EA5A0;">contato@roleon.com.br</a></p></div>`,
                })
              } catch (err) {
                console.error('[cancel-event] erro ao enviar e-mail de cancelamento gratuito:', err)
              }
            })()
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
            triggered_by: 'producer',
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
        triggered_by: 'producer',
        send_email: true,
      })

      if (result.success) {
        results.refunded++
      } else {
        results.failed++
        results.errors.push(ticket.id)
        console.error(`[cancel-event] falhou ticket ${ticket.id}:`, result.error)
      }
    }

    return NextResponse.json({
      success: results.failed === 0,
      event_id,
      refunded: results.refunded,
      cancelled: results.cancelled,
      failed: results.failed,
      errors: results.errors,
    })
  } catch (err) {
    console.error('[cancel-event POST] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
