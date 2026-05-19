import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
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
