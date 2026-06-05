import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function pagarmeAuth() {
  return `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = req.headers.get('x-vercel-cron-auth') !== null

  if (!isVercelCron && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // D+3 corridos: eventos que terminaram há mais de 3 dias
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
    return NextResponse.json({ error: 'Erro ao buscar eventos' }, { status: 500 })
  }

  if (!events?.length) {
    console.log('[cron/repasse] nenhum evento pendente de repasse')
    return NextResponse.json({ ok: true, processed: 0, message: 'Nenhum evento pendente' })
  }

  console.log(`[cron/repasse] ${events.length} evento(s) com repasse pendente`)

  // Agrupa por produtor para uma transferência por produtor
  const producerMap = new Map<string, { eventIds: string[] }>()
  for (const event of events) {
    if (!event.producer_id) continue
    if (!producerMap.has(event.producer_id)) {
      producerMap.set(event.producer_id, { eventIds: [] })
    }
    producerMap.get(event.producer_id)!.eventIds.push(event.id)
  }

  const producerIds = [...producerMap.keys()]

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, pagar_me_recipient_id')
    .in('id', producerIds)
    .not('pagar_me_recipient_id', 'is', null)

  if (!profiles?.length) {
    console.log('[cron/repasse] nenhum produtor com recipient_id configurado')
    return NextResponse.json({ ok: true, processed: 0, message: 'Sem recipients configurados' })
  }

  let processed = 0

  for (const profile of profiles) {
    const recipientId = profile.pagar_me_recipient_id!
    const producerData = producerMap.get(profile.id)
    if (!producerData) continue

    try {
      const balanceRes = await fetch(
        `https://api.pagar.me/core/v5/recipients/${recipientId}/balance`,
        { headers: { Authorization: pagarmeAuth() } }
      )

      if (!balanceRes.ok) {
        console.error(`[cron/repasse] erro ao buscar saldo: ${recipientId}`)
        continue
      }

      const balanceData = await balanceRes.json()
      const available = balanceData.available_amount ?? balanceData.available?.amount ?? 0

      console.log(`[cron/repasse] recipient ${recipientId} | saldo: R$${(available / 100).toFixed(2)}`)

      if (available > 0) {
        const transferRes = await fetch(
          `https://api.pagar.me/core/v5/recipients/${recipientId}/transfers`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: pagarmeAuth() },
            body: JSON.stringify({ amount: available }),
          }
        )

        if (!transferRes.ok) {
          const err = await transferRes.json().catch(() => ({}))
          console.error(`[cron/repasse] erro na transferência ${recipientId}:`, JSON.stringify(err))
          continue
        }

        const transferData = await transferRes.json()
        console.log(`[cron/repasse] transferência criada: ${transferData.id} | R$${(available / 100).toFixed(2)}`)
      }

      await supabaseAdmin
        .from('events')
        .update({ repasse_liberado_at: new Date().toISOString() })
        .in('id', producerData.eventIds)

      processed++
    } catch (e) {
      console.error(`[cron/repasse] exception ${recipientId}:`, e)
    }
  }

  return NextResponse.json({ ok: true, processed })
}
