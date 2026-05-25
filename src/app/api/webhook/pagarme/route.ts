import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { notifyWaitlist } from '../../../../lib/notifyWaitlist';
import { randomBytes } from 'crypto';
import { generateTicketPDF } from '../../../../lib/generateTicketPDF';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function logAudit(
  ticketId: string,
  oldStatus: string,
  newStatus: string,
  metadata: object
) {
  await supabaseAdmin.from('ticket_audit_log').insert({
    ticket_id: ticketId,
    old_status: oldStatus,
    new_status: newStatus,
    triggered_by: 'webhook',
    metadata,
  });
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const rawBody = await req.text();

  const authHeader = req.headers.get('authorization') || '';
  const base64 = authHeader.replace('Basic ', '');
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  const [user, pass] = decoded.split(':');

  const expectedUser = process.env.PAGARME_WEBHOOK_USER || '';
  const expectedPass = process.env.PAGARME_WEBHOOK_SECRET || '';

  if (user !== expectedUser || pass !== expectedPass) {
    console.error('[Webhook] Autenticação inválida');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventType = payload?.type || 'unknown';
  const pagarmeEventId = payload?.id || null;
  const orderId = payload?.data?.id || payload?.data?.order?.id || null;

  // Idempotência: se já processamos esse evento, ignora
  if (pagarmeEventId) {
    const { data: existing } = await supabaseAdmin
      .from('webhook_logs')
      .select('id, status')
      .eq('pagarme_event_id', pagarmeEventId)
      .maybeSingle();

    if (existing) {
      console.log('[Webhook] Evento já processado, ignorando:', pagarmeEventId);
      await supabaseAdmin.from('webhook_logs').insert({
        pagarme_event_id: pagarmeEventId + '_duplicate_' + Date.now(),
        event_type: eventType,
        order_id: orderId,
        status: 'ignored',
        error_message: 'Duplicate event',
        raw_payload: payload,
      });
      return NextResponse.json({ ok: true });
    }
  }

  console.log('[Webhook] Evento recebido:', eventType, pagarmeEventId);

  if (eventType === 'order.paid' || eventType === 'charge.paid') {
    if (!orderId) {
      await supabaseAdmin.from('webhook_logs').insert({
        pagarme_event_id: pagarmeEventId,
        event_type: eventType,
        order_id: null,
        status: 'error',
        error_message: 'order_id ausente no payload',
        raw_payload: payload,
      });
      return NextResponse.json({ ok: true });
    }

    const { data: tickets, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('id, status, recipient_email')
      .eq('order_id', orderId);

    if (fetchError || !tickets || tickets.length === 0) {
      await supabaseAdmin.from('webhook_logs').insert({
        pagarme_event_id: pagarmeEventId,
        event_type: eventType,
        order_id: orderId,
        status: 'error',
        error_message: 'Ticket não encontrado',
        raw_payload: payload,
      });
      return NextResponse.json({ ok: true });
    }

    // Passo 1: atualizar todos os tickets pending para paid
    const updatedTicketIds: string[] = [];
    for (const ticket of tickets) {
      if (ticket.status !== 'pending') continue;

      const { error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({ status: 'paid', checkin_token: randomBytes(32).toString('hex') })
        .eq('id', ticket.id);

      if (updateError) {
        console.error('[Webhook] Erro ao atualizar ticket:', ticket.id, updateError.message);
        continue;
      }

      updatedTicketIds.push(ticket.id);
      console.log('[Webhook] Ticket atualizado para paid:', ticket.id);
    }

    const anyProcessed = updatedTicketIds.length > 0;

    if (anyProcessed) {
      // Passo 2: buscar todos os tickets atualizados de uma vez
      const { data: ticketsCompletos } = await supabaseAdmin
        .from('tickets')
        .select(`
          id, qr_code, checkin_token, ticket_type_name, price_paid,
          payment_method, recipient_email, user_id,
          event:event_id (title, event_date, location_name)
        `)
        .in('id', updatedTicketIds) as { data: any[] | null };

      if (ticketsCompletos && ticketsCompletos.length > 0) {
        // Audit log para todos
        for (const tc of ticketsCompletos) {
          logAudit(tc.id, 'pending', 'paid', {
            price_paid: tc.price_paid,
            payment_method: tc.payment_method,
            order_id: orderId,
          }).catch(() => {});
        }

        // Passo 3: resolver e-mail de destino pelo primeiro ticket
        const firstTicket = ticketsCompletos[0];
        let emailDestino = firstTicket.recipient_email;
        if (!emailDestino && firstTicket.user_id) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('email, name')
            .eq('id', firstTicket.user_id)
            .single();
          emailDestino = profile?.email;
        }

        if (emailDestino) {
          const evento = firstTicket.event as any;
          const dateObj = new Date(evento.event_date.replace(' ', 'T'));
          const dataEvento = dateObj.toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            timeZone: 'America/Sao_Paulo',
          });
          const horaEvento = dateObj.toLocaleTimeString('pt-BR', {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          });
          const dataCapitalizada = dataEvento.charAt(0).toUpperCase() + dataEvento.slice(1);
          const eventDateForPDF = `${dataCapitalizada} - ${horaEvento}`;

          const slugTitle = (evento.title as string)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');

          // Passo 4: gerar PDFs de todos os tickets
          const pdfAttachments: { filename: string; content: Buffer }[] = [];
          for (let i = 0; i < ticketsCompletos.length; i++) {
            const tc = ticketsCompletos[i];
            try {
              const ticketNumber = tc.id.slice(-4).toUpperCase();
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tc.checkin_token ?? tc.id)}`;
              const pdfBuffer = await generateTicketPDF({
                eventTitle: evento.title,
                eventDate: eventDateForPDF,
                locationName: evento.location_name,
                ticketTypeName: tc.ticket_type_name ?? '',
                pricePaid: tc.price_paid ?? 0,
                ticketNumber,
                qrCodeUrl,
              });
              pdfAttachments.push({
                filename: `ingresso-${i + 1}-${slugTitle}.pdf`,
                content: pdfBuffer,
              });
            } catch (pdfError) {
              console.error('[Webhook] Erro ao gerar PDF para ticket', tc.id,
                pdfError instanceof Error ? pdfError.message : String(pdfError));
            }
          }

          // Passo 5: enviar um único e-mail com todos os PDFs
          const qty = ticketsCompletos.length;
          const subject = qty === 1
            ? `Seu ingresso para ${evento.title} está confirmado`
            : `Seus ${qty} ingressos para ${evento.title} estão confirmados`;
          const bodyText = qty === 1
            ? `Olá! Seu ingresso para <strong>${evento.title}</strong> foi confirmado.`
            : `Olá! Seus ${qty} ingressos para <strong>${evento.title}</strong> foram confirmados.`;
          const attachmentText = qty === 1
            ? 'Seu ingresso está em anexo neste e-mail em formato PDF.<br>Salve o arquivo para acessar offline no dia do evento.'
            : `Seus ${qty} ingressos estão em anexo neste e-mail em formato PDF.<br>Salve os arquivos para acessar offline no dia do evento.`;

          try {
            console.log('[Webhook] Enviando e-mail unificado para:', emailDestino, '| ingressos:', pdfAttachments.length);
            await resend.emails.send({
              from: 'Roleon <noreply@roleon.com.br>',
              to: emailDestino,
              subject,
              html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9F9F9;font-family:'Noto Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F9F9;padding:32px 16px;">
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
              ${bodyText}
            </p>
            <p style="margin:0 0 24px;color:#6E6E73;font-size:14px;line-height:1.6;">
              ${attachmentText}
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
              ...(pdfAttachments.length > 0 ? { attachments: pdfAttachments } : {}),
            });
            console.log('[Webhook] E-mail unificado enviado para:', emailDestino);
          } catch (emailError) {
            console.error('[Webhook] Erro ao enviar e-mail:',
              emailError instanceof Error ? emailError.message : String(emailError));
            console.error('[Webhook] Stack:',
              emailError instanceof Error ? emailError.stack : 'no stack');
          }
        }
      }
    }

    await supabaseAdmin.from('webhook_logs').insert({
      pagarme_event_id: pagarmeEventId,
      event_type: eventType,
      order_id: orderId,
      status: anyProcessed ? 'processed' : 'ignored',
      error_message: anyProcessed ? null : 'Tickets já estavam pagos',
      raw_payload: payload,
    });
  } else if (eventType === 'order.chargedback' || eventType === 'charge.refunded') {
    if (!orderId) {
      await supabaseAdmin.from('webhook_logs').insert({
        pagarme_event_id: pagarmeEventId,
        event_type: eventType,
        order_id: null,
        status: 'error',
        error_message: 'order_id ausente no payload',
        raw_payload: payload,
      });
      return NextResponse.json({ ok: true });
    }

    const newStatus = eventType === 'order.chargedback' ? 'chargebacked' : 'refunded';

    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('id, status, event_id, ticket_type_id, price_paid, payment_method')
      .eq('order_id', orderId)
      .maybeSingle();

    if (fetchError || !ticket) {
      await supabaseAdmin.from('webhook_logs').insert({
        pagarme_event_id: pagarmeEventId,
        event_type: eventType,
        order_id: orderId,
        status: 'error',
        error_message: 'Ticket não encontrado',
        raw_payload: payload,
      });
      return NextResponse.json({ ok: true });
    }

    await supabaseAdmin
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticket.id);

    logAudit(ticket.id, 'paid', newStatus, {
      price_paid: (ticket as any).price_paid,
      payment_method: (ticket as any).payment_method,
      order_id: orderId,
    }).catch(() => {});

    notifyWaitlist({
      eventId: String((ticket as any).event_id),
      ticketTypeId: (ticket as any).ticket_type_id ? String((ticket as any).ticket_type_id) : null,
    }).catch(err => console.error('[Webhook] notifyWaitlist erro:', err));

    await supabaseAdmin.from('webhook_logs').insert({
      pagarme_event_id: pagarmeEventId,
      event_type: eventType,
      order_id: orderId,
      status: 'processed',
      error_message: null,
      raw_payload: payload,
    });

    console.log(`[Webhook] Ticket atualizado para ${newStatus}:`, ticket.id);
    return NextResponse.json({ ok: true });
  } else {
    await supabaseAdmin.from('webhook_logs').insert({
      pagarme_event_id: pagarmeEventId,
      event_type: eventType,
      order_id: orderId,
      status: 'ignored',
      error_message: 'Tipo de evento não tratado',
      raw_payload: payload,
    });
  }

  return NextResponse.json({ ok: true });
}
