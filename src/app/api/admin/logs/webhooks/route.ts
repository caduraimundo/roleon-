import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PAGARME_TEST_ACCOUNT_ID = 'acc_8agzweKuKUZ40AGQ'
const PAGARME_PROD_ACCOUNT_ID = 'acc_xX9mx9CzbUoWnwWZ'

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
    const statusParam = searchParams.get('status')
    const ambienteParam = searchParams.get('ambiente')
    const queryParam = (searchParams.get('q') ?? '').trim()

    let query = supabaseAdmin
      .from('webhook_logs')
      .select('id, created_at, event_type, status, error_message, order_id, pagarme_event_id, raw_payload')
      .order('created_at', { ascending: false })

    if (statusParam) query = query.eq('status', statusParam)

    const { data: logs, error } = await query.limit(200)
    if (error) throw error

    const orderIds = Array.from(new Set((logs ?? []).map((l: any) => l.order_id).filter((id: any) => id != null)))

    let ordemParaEvento = new Map<string, string>()
    if (orderIds.length > 0) {
      const { data: tickets, error: ticketsError } = await supabaseAdmin
        .from('tickets')
        .select('order_id, event_id')
        .in('order_id', orderIds)
      if (ticketsError) throw ticketsError
      ordemParaEvento = new Map((tickets ?? []).map((t: any) => [t.order_id, t.event_id]))
    }

    const eventIds = Array.from(new Set(Array.from(ordemParaEvento.values()).filter((id: any) => id != null)))

    let eventoParaTitulo = new Map<string, string>()
    if (eventIds.length > 0) {
      const { data: events, error: eventsError } = await supabaseAdmin
        .from('events')
        .select('id, title')
        .in('id', eventIds)
      if (eventsError) throw eventsError
      eventoParaTitulo = new Map((events ?? []).map((e: any) => [e.id, e.title]))
    }

    let resultado = (logs ?? []).map((log: any) => {
      const accountId = log.raw_payload?.account?.id
      const ambiente = accountId === PAGARME_TEST_ACCOUNT_ID ? 'teste' : accountId === PAGARME_PROD_ACCOUNT_ID ? 'producao' : 'desconhecido'
      const eventId = log.order_id != null ? ordemParaEvento.get(log.order_id) : undefined
      const evento_titulo = eventId != null ? (eventoParaTitulo.get(eventId) ?? null) : null

      return {
        id: log.id,
        created_at: log.created_at,
        event_type: log.event_type,
        status: log.status,
        error_message: log.error_message,
        order_id: log.order_id,
        pagarme_event_id: log.pagarme_event_id,
        ambiente,
        evento_titulo,
        raw_payload: log.raw_payload,
      }
    })

    if (ambienteParam) {
      resultado = resultado.filter((l: any) => l.ambiente === ambienteParam)
    }

    if (queryParam.length > 0) {
      const q = queryParam.toLowerCase()
      resultado = resultado.filter((l: any) => l.evento_titulo != null && l.evento_titulo.toLowerCase().includes(q))
    }

    return NextResponse.json({ logs: resultado })
  } catch (e) {
    console.error('[admin/logs/webhooks] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
