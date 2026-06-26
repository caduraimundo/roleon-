import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function notifyWaitlist({ eventId, ticketTypeId }: { eventId: string; ticketTypeId: string | null }) {
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('title')
    .eq('id', eventId)
    .single()

  if (!event) return

  let query = supabaseAdmin
    .from('waitlist')
    .select('id, email')
    .eq('event_id', eventId)
    .is('notified_at', null)

  if (ticketTypeId) {
    query = query.eq('ticket_type_id', ticketTypeId)
  } else {
    query = query.is('ticket_type_id', null)
  }

  const { data: entries } = await query

  if (!entries || entries.length === 0) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const eventUrl = `https://www.roleon.com.br/evento/${eventId}`
  const notifiedIds: string[] = []

  for (const entry of entries) {
    if (!entry.email) continue
    try {
      const { error: resendError } = await resend.emails.send({
        from: 'Roleon <noreply@roleon.com.br>',
        to: entry.email,
        subject: `Abriu uma vaga! - ${(event as any).title}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F7;font-family:'Noto Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0EA5A0;padding:24px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">ROLEON</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 24px;">
            <p style="margin:0 0 16px;color:#1A1A1A;font-size:15px;line-height:1.6;">
              Boa noticia! Uma vaga abriu para <strong>${(event as any).title}</strong>.
            </p>
            <p style="margin:0 0 24px;color:#6E6E73;font-size:14px;line-height:1.6;">
              Corra para garantir seu ingresso antes que esgote novamente.
            </p>
            <a href="${eventUrl}" style="display:inline-block;background:#0EA5A0;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">
              Ver ingresso
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
        `,
      })
      if (resendError) {
        console.error('[notifyWaitlist] Resend retornou erro para', entry.email, resendError)
      } else {
        notifiedIds.push(entry.id)
      }
    } catch (err) {
      console.error('[notifyWaitlist] erro ao enviar e-mail para', entry.email, err)
    }
  }

  if (notifiedIds.length > 0) {
    await supabaseAdmin
      .from('waitlist')
      .update({ notified_at: new Date().toISOString() })
      .in('id', notifiedIds)
  }
}
