import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processarRepasseEventos } from '@/lib/repasse'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // D+3 corridos: eventos que terminaram ha mais de 3 dias
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('id, producer_id, title')
    .eq('is_free', false)
    .eq('status', 'active')
    .is('repasse_liberado_at', null)
    .lte('event_date', cutoff)

  if (error) {
    console.error('[cron/repasse] erro ao buscar eventos:', error)
    await supabaseAdmin.from('cron_runs').insert({
      events_eligible: 0,
      events_processed: 0,
      status: 'error',
      metadata: { error: error.message },
    })
    return NextResponse.json({ error: 'Erro ao buscar eventos' }, { status: 500 })
  }

  if (!events?.length) {
    console.log('[cron/repasse] nenhum evento pendente de repasse')
    await supabaseAdmin.from('cron_runs').insert({
      events_eligible: 0,
      events_processed: 0,
      status: 'ok',
    })
    return NextResponse.json({ ok: true, processed: 0, message: 'Nenhum evento pendente' })
  }

  console.log(`[cron/repasse] ${events.length} evento(s) com repasse pendente`)

  try {
    const results = await processarRepasseEventos(supabaseAdmin, events.map((e) => e.id))

    const processed = results.filter((r) => r.transferred).length

    for (const r of results) {
      if (r.error) {
        console.error(`[cron/repasse] produtor ${r.producerId}:`, r.error)
      } else {
        console.log(`[cron/repasse] produtor ${r.producerId} | R$${(r.expectedCents / 100).toFixed(2)} | transferido: ${r.transferred}`)
      }
    }

    await supabaseAdmin.from('cron_runs').insert({
      events_eligible: events.length,
      events_processed: processed,
      status: 'ok',
      metadata: { results },
    })

    return NextResponse.json({ ok: true, processed })
  } catch (e) {
    console.error('[cron/repasse] exception:', e)
    await supabaseAdmin.from('cron_runs').insert({
      events_eligible: events.length,
      events_processed: 0,
      status: 'error',
      metadata: { error: e instanceof Error ? e.message : String(e) },
    })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
