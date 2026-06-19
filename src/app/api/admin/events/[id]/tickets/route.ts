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

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('id, status, ticket_type_name, price_paid, checked_in_at, checkin_token, user_id, recipient_email, created_at')
      .eq('event_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const userIds = [...new Set((tickets ?? []).map(t => t.user_id).filter(Boolean))]
    const { data: perfis } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, name').in('id', userIds)
      : { data: [] as any[] }
    const perfilPorId = new Map((perfis ?? []).map((p: any) => [p.id, p]))

    const total = tickets?.length ?? 0
    const comCheckin = (tickets ?? []).filter(t => t.checked_in_at).length

    const resultado = (tickets ?? []).map((t: any) => {
      const perfil = t.user_id ? perfilPorId.get(t.user_id) : null
      return {
        id: t.id,
        codigo: (t.checkin_token ?? t.id).slice(0, 6).toUpperCase(),
        status: t.status,
        ticket_type_name: t.ticket_type_name,
        price_paid: t.price_paid,
        checked_in_at: t.checked_in_at,
        comprador_nome: perfil?.name ?? t.recipient_email ?? 'Não identificado',
      }
    })

    return NextResponse.json({ total, com_checkin: comCheckin, tickets: resultado })
  } catch (e) {
    console.error('[admin/events/id/tickets] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
