import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import webpush from 'web-push'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        id,
        recipient_email,
        ticket_type_name,
        user_id,
        events!inner (
          id,
          title,
          event_date,
          location_name
        )
      `)
      .eq('status', 'active')
      .gte('events.event_date', in23h.toISOString())
      .lte('events.event_date', in25h.toISOString())

    if (error) throw error
    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    let emailsSent = 0
    let pushSent = 0

    for (const ticket of tickets) {
      const event = ticket.events as any

      try {
        await resend.emails.send({
          from: 'Roleon <noreply@roleon.com.br>',
          to: ticket.recipient_email,
          subject: `Lembrete: ${event.title} é amanhã`,
          html: `
            <div style="font-family: 'Noto Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1A1A1A;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 28px; font-weight: 800; color: #0EA5A0;">Roleon</span>
              </div>
              <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Seu evento é amanhã</h2>
              <p style="color: #6E6E73; margin-bottom: 20px;">Nao esquece que voce tem ingresso para:</p>
              <div style="background: #F9F9F9; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="font-size: 17px; font-weight: 700; margin-bottom: 4px;">${event.title}</div>
                <div style="color: #6E6E73; font-size: 14px;">${event.location_name || ''}</div>
                <div style="color: #6E6E73; font-size: 14px; margin-top: 4px;">
                  ${new Date(event.event_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                </div>
                ${ticket.ticket_type_name ? `<div style="margin-top: 8px; display: inline-block; background: #E6F7F6; color: #0EA5A0; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px;">${ticket.ticket_type_name}</div>` : ''}
              </div>
              <a href="https://www.roleon.com.br/ingresso/${ticket.id}"
                style="display: block; text-align: center; background: #0EA5A0; color: #fff; font-weight: 700; font-size: 15px; padding: 14px; border-radius: 12px; text-decoration: none;">
                Ver meu ingresso
              </a>
              <p style="color: #6E6E73; font-size: 12px; text-align: center; margin-top: 20px;">
                Roleon - Ouro Preto e Mariana
              </p>
            </div>
          `,
        })
        emailsSent++
      } catch (emailErr) {
        console.error('Erro ao enviar email de lembrete:', emailErr)
      }

      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('notifications_reminders')
          .eq('id', ticket.user_id)
          .single()

        if (profile?.notifications_reminders) {
          const { data: sub } = await supabaseAdmin
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', ticket.user_id)
            .single()

          if (sub?.subscription) {
            webpush.setVapidDetails(
              'mailto:contato@roleon.com.br',
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
              process.env.VAPID_PRIVATE_KEY!
            )
            await webpush.sendNotification(
              sub.subscription as any,
              JSON.stringify({
                title: 'Lembrete de ingresso',
                body: `${event.title} é amanhã`,
                url: `/ingresso/${ticket.id}`,
              })
            )
            pushSent++
          }
        }
      } catch (pushErr) {
        console.error('Erro ao enviar push de lembrete:', pushErr)
      }
    }

    return NextResponse.json({ ok: true, emailsSent, pushSent })
  } catch (err) {
    console.error('cron/reminder erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
