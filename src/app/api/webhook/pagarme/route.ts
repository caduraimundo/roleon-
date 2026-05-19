import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('id, status')
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

    if (ticket.status === 'pending') {
      const { error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({ status: 'paid' })
        .eq('id', ticket.id);

      if (updateError) {
        await supabaseAdmin.from('webhook_logs').insert({
          pagarme_event_id: pagarmeEventId,
          event_type: eventType,
          order_id: orderId,
          status: 'error',
          error_message: updateError.message,
          raw_payload: payload,
        });
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }

      console.log('[Webhook] Ticket atualizado para paid:', ticket.id);

      // Buscar dados do ticket + evento + usuário para o e-mail
      const { data: ticketCompleto } = await supabaseAdmin
        .from('tickets')
        .select(`
          id, qr_code, ticket_type_name, price_paid, payment_method,
          event:event_id (title, event_date, location_name),
          user:user_id (email, name)
        `)
        .eq('id', ticket.id)
        .single() as { data: any };

      if (ticketCompleto?.user?.email) {
        const evento = ticketCompleto.event as any;
        const usuario = ticketCompleto.user as any;
        const dataEvento = new Date(evento.event_date).toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        const horaEvento = new Date(evento.event_date).toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit'
        });
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketCompleto.qr_code)}`;
        const numeroIngresso = ticketCompleto.qr_code.replace('ROLEON-', '#');

        await resend.emails.send({
          from: 'Roleon <noreply@roleon.com.br>',
          to: usuario.email,
          subject: `Seu ingresso para ${evento.title} está confirmado`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9F9F9;font-family:'Noto Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F9F9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0EA5A0;padding:24px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">ROLEON</p>
          </td>
        </tr>

        <!-- Título -->
        <tr>
          <td style="padding:32px 24px 8px;text-align:center;">
            <p style="margin:0 0 8px;color:#6E6E73;font-size:14px;">Ingresso confirmado</p>
            <h1 style="margin:0;color:#1A1A1A;font-size:22px;font-weight:700;">${evento.title}</h1>
          </td>
        </tr>

        <!-- Detalhes -->
        <tr>
          <td style="padding:16px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #F0F0F0;">
                  <span style="color:#6E6E73;font-size:13px;">Data</span><br>
                  <span style="color:#1A1A1A;font-size:15px;font-weight:600;">${dataEvento}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #F0F0F0;">
                  <span style="color:#6E6E73;font-size:13px;">Horario</span><br>
                  <span style="color:#1A1A1A;font-size:15px;font-weight:600;">${horaEvento}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #F0F0F0;">
                  <span style="color:#6E6E73;font-size:13px;">Local</span><br>
                  <span style="color:#1A1A1A;font-size:15px;font-weight:600;">${evento.location_name}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #F0F0F0;">
                  <span style="color:#6E6E73;font-size:13px;">Tipo</span><br>
                  <span style="color:#1A1A1A;font-size:15px;font-weight:600;">${ticketCompleto.ticket_type_name || 'Pista'}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;">
                  <span style="color:#6E6E73;font-size:13px;">Valor pago</span><br>
                  <span style="color:#1A1A1A;font-size:15px;font-weight:600;">R$ ${Number(ticketCompleto.price_paid).toFixed(2).replace('.', ',')}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- QR Code -->
        <tr>
          <td style="padding:24px;text-align:center;border-top:2px dashed #E5E5E5;">
            <p style="margin:0 0 16px;color:#6E6E73;font-size:13px;">Apresente este QR Code na entrada</p>
            <img src="${qrUrl}" width="160" height="160" alt="QR Code" style="border-radius:8px;">
            <p style="margin:12px 0 0;color:#1A1A1A;font-size:16px;font-weight:700;letter-spacing:2px;">${numeroIngresso}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px;text-align:center;background:#F9F9F9;">
            <p style="margin:0;color:#6E6E73;font-size:12px;">Roleon - Ouro Preto e Mariana</p>
            <p style="margin:4px 0 0;color:#6E6E73;font-size:12px;">Em caso de duvidas, responda este e-mail.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
          `
        });

        console.log('[Webhook] E-mail enviado para:', usuario.email);
      }
    }

    await supabaseAdmin.from('webhook_logs').insert({
      pagarme_event_id: pagarmeEventId,
      event_type: eventType,
      order_id: orderId,
      status: ticket.status === 'pending' ? 'processed' : 'ignored',
      error_message: ticket.status !== 'pending' ? `Ticket já estava ${ticket.status}` : null,
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
      .select('id, status')
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
