import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { cancelEventAndProcessTickets } from '@/lib/cancelEvent'
import * as Sentry from '@sentry/nextjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const body = await req.json()
    const { motivo } = body
    if (!motivo?.trim()) return NextResponse.json({ error: 'Motivo é obrigatório' }, { status: 400 })

    const { data: eventInfo } = await supabaseAdmin
      .from('events')
      .select('id, title, producer_id, profiles!producer_id(name, email)')
      .eq('id', eventId)
      .single()

    if (!eventInfo) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

    const result = await cancelEventAndProcessTickets({ event_id: eventId, triggered_by: 'admin' })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const producer = (eventInfo as any).profiles
    if (producer?.email) {
      try {
        const { error: resendError } = await resend.emails.send({
          from: 'Roleon <noreply@roleon.com.br>',
          to: producer.email,
          subject: 'Seu evento foi cancelado',
          html: `
            <div style="font-family:'Noto Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;color:#1A1A1A;">
              <div style="font-size:22px;font-weight:700;color:#0EA5A0;margin-bottom:24px;">Roleon</div>
              <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;">Evento cancelado</h2>
              <p style="font-size:14px;color:#6E6E73;margin:0 0 16px;line-height:1.6;">Olá, ${producer.name ?? 'produtor'}.</p>
              <p style="font-size:14px;color:#6E6E73;margin:0 0 16px;line-height:1.6;">Seu evento <strong style="color:#1A1A1A;">${result.event.title}</strong> foi cancelado pelo time Roleon.</p>
              <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 16px;margin:0 0 16px;">
                <p style="font-size:12px;font-weight:600;color:#991B1B;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px">Motivo</p>
                <p style="font-size:14px;color:#1A1A1A;margin:0">${motivo}</p>
              </div>
              <p style="font-size:12px;color:#9A9A9A;margin:24px 0 0;line-height:1.5;">Dúvidas? Fale com a gente em <a href="mailto:contato@roleon.com.br" style="color:#0EA5A0;">contato@roleon.com.br</a></p>
            </div>`,
        })
        if (resendError) {
          console.error('[admin cancel] Resend retornou erro:', resendError)
          Sentry.captureException(new Error(`Resend falhou ao notificar cancelamento admin: ${resendError.message}`), {
            extra: { eventId, recipientEmail: producer.email, motivo },
            tags: { fluxo: 'admin-cancel-event' },
          })
          await Sentry.flush(2000)
        }
      } catch (emailErr) {
        console.error('[admin cancel] erro ao enviar e-mail de cancelamento:', emailErr)
        Sentry.captureException(emailErr instanceof Error ? emailErr : new Error(String(emailErr)), {
          extra: { eventId, recipientEmail: producer.email, motivo },
          tags: { fluxo: 'admin-cancel-event' },
        })
        await Sentry.flush(2000)
      }
    }

    return NextResponse.json({
      ok: true,
      refunded: result.refunded,
      cancelled: result.cancelled,
      failed: result.failed,
      errors: result.errors,
    })
  } catch (err) {
    console.error('[cancel] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
