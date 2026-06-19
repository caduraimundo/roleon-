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

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const code = (searchParams.get('code') ?? '').trim()

    if (code.length < 4) {
      return NextResponse.json({ error: 'Código muito curto' }, { status: 400 })
    }

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        id, status, ticket_type_name, price_paid, checked_in_at, checkin_token,
        created_at, recipient_email, user_id, event_id,
        event:event_id (title, event_date)
      `)
      .ilike('checkin_token', code + '%')
      .limit(10)

    if (error) throw error

    const userIds = [...new Set((tickets ?? []).map((t: any) => t.user_id).filter(Boolean))]
    const { data: perfis } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, name, email').in('id', userIds)
      : { data: [] as any[] }
    const perfilPorId = new Map((perfis ?? []).map((p: any) => [p.id, p]))

    const resultado = (tickets ?? []).map((t: any) => {
      const perfil = t.user_id ? perfilPorId.get(t.user_id) : null
      return {
        id: t.id,
        codigo: (t.checkin_token ?? t.id).slice(0, 6).toUpperCase(),
        status: t.status,
        ticket_type_name: t.ticket_type_name,
        price_paid: t.price_paid,
        checked_in_at: t.checked_in_at,
        created_at: t.created_at,
        comprador_nome: perfil?.name ?? null,
        comprador_email: perfil?.email ?? t.recipient_email ?? null,
        evento_titulo: t.event?.title ?? null,
        evento_data: t.event?.event_date ?? null,
      }
    })

    return NextResponse.json({ tickets: resultado })
  } catch (e) {
    console.error('[admin/tickets/search] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
