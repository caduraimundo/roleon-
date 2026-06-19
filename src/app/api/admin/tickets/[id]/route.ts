import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const { id } = await params

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        id, status, ticket_type_name, price_paid, checked_in_at, checkin_token,
        created_at, recipient_email, user_id, event_id, payment_method,
        coupon_code, discount_applied, customer_document, order_id,
        event:event_id (title, event_date, location_name),
        profiles:user_id (name, email)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!ticket) return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 })

    const { data: historico } = await supabaseAdmin
      .from('ticket_audit_log')
      .select('old_status, new_status, triggered_by, metadata, created_at')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    const t: any = ticket
    return NextResponse.json({
      id: t.id,
      codigo: (t.checkin_token ?? t.id).slice(0, 6).toUpperCase(),
      status: t.status,
      ticket_type_name: t.ticket_type_name,
      price_paid: t.price_paid,
      payment_method: t.payment_method,
      checked_in_at: t.checked_in_at,
      created_at: t.created_at,
      order_id: t.order_id,
      coupon_code: t.coupon_code,
      discount_applied: t.discount_applied,
      comprador_nome: t.profiles?.name ?? null,
      comprador_email: t.profiles?.email ?? t.recipient_email ?? null,
      comprador_cpf: t.customer_document ?? null,
      evento_titulo: t.event?.title ?? null,
      evento_data: t.event?.event_date ?? null,
      evento_local: t.event?.location_name ?? null,
      historico: historico ?? [],
    })
  } catch (e) {
    console.error('[admin/tickets/id] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
