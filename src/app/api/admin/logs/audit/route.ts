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
    const queryParam = (searchParams.get('q') ?? '').trim()

    const { data: logs, error } = await supabaseAdmin
      .from('ticket_audit_log')
      .select('id, created_at, old_status, new_status, triggered_by, metadata, ticket_id, tickets(event_id, events(title))')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    let resultado = (logs ?? []).map((log: any) => ({
      id: log.id,
      created_at: log.created_at,
      old_status: log.old_status,
      new_status: log.new_status,
      triggered_by: log.triggered_by,
      metadata: log.metadata,
      ticket_id: log.ticket_id,
      evento_titulo: log.tickets?.events?.title ?? null,
    }))

    if (queryParam.length > 0) {
      const q = queryParam.toLowerCase()
      resultado = resultado.filter((l: any) => l.evento_titulo != null && l.evento_titulo.toLowerCase().includes(q))
    }

    return NextResponse.json({ logs: resultado })
  } catch (e) {
    console.error('[admin/logs/audit] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
