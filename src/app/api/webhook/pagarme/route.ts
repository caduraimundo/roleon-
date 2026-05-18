import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get('x-hub-signature') || '';
  const secret = process.env.PAGARME_WEBHOOK_SECRET || '';

  const expectedSignature =
    'sha1=' +
    crypto.createHmac('sha1', secret).update(rawBody).digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  const isValid =
    sigBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(sigBuffer, expectedBuffer);

  if (!isValid) {
    console.error('[Webhook] Assinatura HMAC inválida');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventType = payload?.type;

  console.log('[Webhook] Evento recebido:', eventType);

  if (eventType === 'order.paid' || eventType === 'charge.paid') {
    const orderId = payload?.data?.id || payload?.data?.order?.id;

    if (!orderId) {
      console.error('[Webhook] order_id não encontrado no payload');
      return NextResponse.json({ ok: true });
    }

    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('id, status')
      .eq('order_id', orderId)
      .single();

    if (fetchError || !ticket) {
      console.error('[Webhook] Ticket não encontrado para order_id:', orderId);
      return NextResponse.json({ ok: true });
    }

    if (ticket.status === 'pending') {
      const { error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({ status: 'paid' })
        .eq('id', ticket.id);

      if (updateError) {
        console.error('[Webhook] Erro ao atualizar ticket:', updateError);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }

      console.log('[Webhook] Ticket atualizado para paid:', ticket.id);
    }
  }

  return NextResponse.json({ ok: true });
}
