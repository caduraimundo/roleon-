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
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
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

    const [profileRes, authRes, loginHistoryRes, ticketsRes, checkoutAttemptsRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, name, email, avatar_initials, created_at, consumer_disabled')
        .eq('id', id)
        .single(),
      supabaseAdmin.auth.admin.getUserById(id),
      supabaseAdmin
        .from('login_history')
        .select('ip, user_agent, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('tickets')
        .select('id, event_id, ticket_type_name, price_paid, payment_method, status, created_at, event:event_id (title, event_date)')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('checkout_attempts')
        .select('id, event_id, ticket_type_id, payment_method, failure_reason, failure_detail, amount, ip, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const attemptEventIds = [...new Set((checkoutAttemptsRes.data ?? []).map(a => a.event_id).filter(Boolean))]
    let eventTitles: Record<string, string> = {}
    if (attemptEventIds.length > 0) {
      const { data: eventsData } = await supabaseAdmin
        .from('events')
        .select('id, title')
        .in('id', attemptEventIds)
      eventTitles = Object.fromEntries((eventsData ?? []).map(e => [e.id, e.title]))
    }
    const checkoutAttempts = (checkoutAttemptsRes.data ?? []).map(a => ({
      ...a,
      event_title: a.event_id ? (eventTitles[a.event_id] ?? null) : null,
    }))

    return NextResponse.json({
      consumer: profileRes.data,
      auth: {
        created_at: authRes.data?.user?.created_at ?? null,
        last_sign_in_at: authRes.data?.user?.last_sign_in_at ?? null,
      },
      login_history: loginHistoryRes.data ?? [],
      tickets: ticketsRes.data ?? [],
      checkout_attempts: checkoutAttempts,
    })
  } catch (err) {
    console.error('[consumer-detail] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
