import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token: string | undefined = body?.token;

  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });
  }

  const { data: ticket, error: fetchError } = await supabaseAdmin
    .from('tickets')
    .select('id, status')
    .eq('checkin_token', token)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  if (!ticket) {
    return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 });
  }

  if (ticket.status === 'used') {
    return NextResponse.json({ error: 'Ingresso já utilizado' }, { status: 409 });
  }

  if (ticket.status !== 'paid' && ticket.status !== 'valid') {
    return NextResponse.json({ error: 'Ingresso inválido' }, { status: 400 });
  }

  // Update atômico: só atualiza se ainda estiver paid/valid
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('tickets')
    .update({ status: 'used' })
    .eq('checkin_token', token)
    .in('status', ['paid', 'valid'])
    .select()
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Ingresso já utilizado' }, { status: 409 });
  }

  supabaseAdmin.from('ticket_audit_log').insert({
    ticket_id: updated.id,
    old_status: ticket.status,
    new_status: 'used',
    triggered_by: 'checkin',
    metadata: { payment_method: (updated as any).payment_method, price_paid: (updated as any).price_paid },
  }).catch(() => {});

  return NextResponse.json({ ok: true, ticket: updated }, { status: 200 });
}
