import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { notifyWaitlist } from '../../../lib/notifyWaitlist'
import { generateTicketPDF } from '../../../lib/generateTicketPDF'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
  }

  const { event_id, ticket_type_id } = await req.json()
  if (!event_id || !ticket_type_id) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes: event_id, ticket_type_id' }, { status: 400 })
  }

  const { data: tt, error: ttError } = await supabaseAdmin
    .from('ticket_types')
    .select('id, name, price, event_id')
    .eq('id', ticket_type_id)
    .single()

  if (ttError || !tt) {
    return NextResponse.json({ error: 'Tipo de ingresso não encontrado' }, { status: 404 })
  }
  if (tt.event_id !== event_id) {
    return NextResponse.json({ error: 'Tipo de ingresso não pertence a este evento' }, { status: 400 })
  }
  if (Number(tt.price) > 0) {
    return NextResponse.json({ error: 'Este tipo de ingresso não é gratuito' }, { status: 400 })
  }

  const { data: reserved, error: reserveError } = await supabaseAdmin
    .rpc('reserve_ticket_stock', { p_ticket_type_id: ticket_type_id })

  if (reserveError || !reserved) {
    return NextResponse.json({ error: 'Vagas esgotadas para este evento.' }, { status: 409 })
  }

  const checkinToken = randomBytes(32).toString('hex')

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .insert({
      event_id,
      ticket_type_id,
      ticket_type_name: tt.name,
      price_paid: 0,
      producer_amount: 0,
      status: 'confirmed',
      payment_method: 'free',
      user_id: user.id,
      recipient_email: user.email,
      checkin_token: checkinToken,
      qr_code: `free_${ticket_type_id}_${Date.now()}`,
    })
    .select('id')
    .single()

  if (ticketError || !ticket) {
    await supabaseAdmin.rpc('release_ticket_stock', { p_ticket_type_id: ticket_type_id })
    return NextResponse.json({ error: 'Falha ao confirmar presença', detail: ticketError?.message }, { status: 500 })
  }

  await supabaseAdmin.from('ticket_audit_log').insert({
    ticket_id: ticket.id,
    old_status: null,
    new_status: 'confirmed',
    triggered_by: 'checkout',
    metadata: { source: 'confirmar_presenca' },
  }).then(() => {}, () => {})

  try {
    const { data: evento } = await supabaseAdmin
      .from('events')
      .select('title, event_date, location_name')
      .eq('id', event_id)
      .single()

    if (evento && user.email) {
      const dateObj = new Date(evento.event_date.replace(' ', 'T'))
      const dataEvento = dateObj.toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      })
      const horaEvento = dateObj.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })
      const dataCapitalizada = dataEvento.charAt(0).toUpperCase() + dataEvento.slice(1)
      const eventDateForPDF = `${dataCapitalizada} - ${horaEvento}`
      const ticketNumber = checkinToken.slice(0, 6).toUpperCase()
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinToken)}`

      const pdfBuffer = await generateTicketPDF({
        eventTitle: evento.title,
        eventDate: eventDateForPDF,
        locationName: evento.location_name,
        ticketTypeName: tt.name,
        pricePaid: 0,
        ticketNumber,
        qrCodeUrl,
      })

      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error: resendError } = await resend.emails.send({
        from: 'Roleon <noreply@roleon.com.br>',
        to: user.email,
        subject: `Sua presença em ${evento.title} está confirmada`,
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
            <p style="margin:0 0 20px;color:#1A1A1A;font-size:15px;line-height:1.6;">
              Olá! Sua presença em <strong>${evento.title}</strong> foi confirmada.
            </p>
            <p style="margin:0 0 24px;color:#6E6E73;font-size:14px;line-height:1.6;">
              Seu ingresso está em anexo neste e-mail em formato PDF.<br>Salve o arquivo para acessar offline no dia do evento.
            </p>
            <div style="background:#F5F5F5;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;color:#1A1A1A;font-size:16px;font-weight:700;">${evento.title}</p>
              <p style="margin:0 0 4px;color:#6E6E73;font-size:14px;">${dataCapitalizada} - ${horaEvento}</p>
              <p style="margin:0;color:#6E6E73;font-size:14px;">${evento.location_name}</p>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
        `,
        attachments: [{ filename: 'ingresso.pdf', content: pdfBuffer }],
      })
      if (resendError) {
        console.error('[confirmar-presenca] Resend retornou erro:', resendError)
      }
    }
  } catch (emailError) {
    console.error('[confirmar-presenca] erro ao enviar e-mail:', emailError instanceof Error ? emailError.message : String(emailError))
  }

  return NextResponse.json({ ok: true, ticket_id: ticket.id })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
  }

  const { event_id } = await req.json()
  if (!event_id) {
    return NextResponse.json({ error: 'Campo obrigatório ausente: event_id' }, { status: 400 })
  }

  const { data: ticket, error: findError } = await supabaseAdmin
    .from('tickets')
    .select('id, ticket_type_id')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (findError || !ticket) {
    return NextResponse.json({ error: 'Confirmação de presença não encontrada' }, { status: 404 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('id', ticket.id)

  if (updateError) {
    return NextResponse.json({ error: 'Falha ao cancelar presença' }, { status: 500 })
  }

  await supabaseAdmin.from('ticket_audit_log').insert({
    ticket_id: ticket.id,
    old_status: 'confirmed',
    new_status: 'cancelled',
    triggered_by: 'system',
    metadata: { source: 'cancelar_presenca' },
  })

  if (ticket.ticket_type_id) {
    await supabaseAdmin.rpc('release_ticket_stock', { p_ticket_type_id: ticket.ticket_type_id })
    notifyWaitlist({ eventId: event_id, ticketTypeId: ticket.ticket_type_id }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
