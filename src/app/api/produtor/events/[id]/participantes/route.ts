import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthProducer(req: NextRequest, event_id: string) {
  const bearerToken = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(bearerToken)
  if (!user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'producer' && profile?.role !== 'admin') return null
  if (profile?.role === 'producer') {
    const { data: evento } = await supabaseAdmin
      .from('events').select('id').eq('id', event_id).eq('producer_id', user.id).maybeSingle()
    if (!evento) return null
  }
  return user
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: event_id } = await params
    const user = await getAuthProducer(req, event_id)
    if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('id, user_id, status, price_paid, payment_method, ticket_type_name, recipient_email, created_at, checkin_token')
      .eq('event_id', event_id)
      .in('status', ['paid', 'used', 'refunded', 'valid', 'cancelled'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[participantes GET] erro:', error)
      return NextResponse.json({ error: 'Erro ao buscar ingressos' }, { status: 500 })
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ tickets: [] })
    }

    const userIds = [...new Set(tickets.map(t => t.user_id).filter(Boolean))]

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .in('id', userIds)

    const profileMap: Record<string, string> = {}
    for (const p of profiles ?? []) {
      profileMap[p.id] = p.name ?? ''
    }

    const result = tickets.map(t => ({
      id: t.id,
      codigo: (t.checkin_token ?? t.id).slice(0, 6).toUpperCase(),
      buyer_name: profileMap[t.user_id] ?? 'Participante',
      buyer_email: t.recipient_email ?? '',
      ticket_type_name: t.ticket_type_name ?? 'Ingresso',
      status: t.status,
      price_paid: Number(t.price_paid ?? 0),
      payment_method: t.payment_method ?? '',
      created_at: t.created_at,
    }))

    return NextResponse.json({ tickets: result })
  } catch (err) {
    console.error('[participantes GET] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
