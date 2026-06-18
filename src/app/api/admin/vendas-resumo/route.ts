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

    // 1. Total arrecadado e ingressos vendidos (todos os tickets pagos/usados)
    const { data: ticketsData, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select('price_paid, producer_amount')
      .in('status', ['paid', 'used'])

    if (ticketsError) throw ticketsError

    const totalArrecadado = (ticketsData ?? []).reduce(
      (sum, t) => sum + Number(t.price_paid ?? 0), 0
    )
    const totalIngressos = (ticketsData ?? []).length

    // 2. Repasses pendentes: eventos paicos do D+3, sem repasse_liberado_at
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

    const { data: eventosPendentes, error: pendentesError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('is_free', false)
      .eq('status', 'active')
      .is('repasse_liberado_at', null)
      .lte('event_date', cutoff)

    if (pendentesError) throw pendentesError

    const eventosPendentesIds = (eventosPendentes ?? []).map((e) => e.id)

    let repassePendenteReais = 0
    let repassePendenteEventos = eventosPendentesIds.length

    if (eventosPendentesIds.length > 0) {
      const { data: ticketsPendentes, error: tpError } = await supabaseAdmin
        .from('tickets')
        .select('producer_amount')
        .in('event_id', eventosPendentesIds)
        .in('status', ['paid', 'used'])

      if (tpError) throw tpError

      repassePendenteReais = (ticketsPendentes ?? []).reduce(
        (sum, t) => sum + Number(t.producer_amount ?? 0), 0
      )
    }

    // 3. Status do cron: ultimo run e proximo run esperado
    // O cron roda diariamente via vercel.json (schedule: "0 3 * * *" = 03:00 UTC)
    const { data: lastRun, error: cronError } = await supabaseAdmin
      .from('cron_runs')
      .select('ran_at, events_eligible, events_processed, status')
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cronError) throw cronError

    let proximoRun: string | null = null
    if (lastRun?.ran_at) {
      // Proximo run = amanha as 03:00 UTC
      const d = new Date()
      d.setUTCDate(d.getUTCDate() + 1)
      d.setUTCHours(3, 0, 0, 0)
      proximoRun = d.toISOString()
    }

    return NextResponse.json({
      total_arrecadado_brl: totalArrecadado.toFixed(2),
      total_ingressos: totalIngressos,
      repasse_pendente_brl: repassePendenteReais.toFixed(2),
      repasse_pendente_eventos: repassePendenteEventos,
      cron: lastRun
        ? {
            ultimo_run: lastRun.ran_at,
            status: lastRun.status,
            events_eligible: lastRun.events_eligible,
            events_processed: lastRun.events_processed,
            proximo_run: proximoRun,
          }
        : null,
    })
  } catch (e) {
    console.error('[vendas-resumo] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
