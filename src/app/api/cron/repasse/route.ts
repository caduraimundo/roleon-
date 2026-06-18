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

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
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

  // Soma o valor exato a repassar por evento, direto da nossa tabela de
  // tickets (producer_amount). Corrige o F8: antes a transferência usava o
  // saldo agregado (available_amount) do recipient, que mistura dinheiro de
  // eventos diferentes do mesmo produtor quando há mais de um pendente.
  const allEventIds = events.map((e) => e.id)
  const { data: ticketSums, error: ticketsError } = await supabaseAdmin
    .from('tickets')
    .select('event_id, producer_amount')
    .in('event_id', allEventIds)
    .in('status', ['paid', 'used'])

  if (ticketsError) {
    console.error('[cron/repasse] erro ao buscar tickets:', ticketsError)
    return NextResponse.json({ error: 'Erro ao buscar tickets' }, { status: 500 })
  }

  const amountByEvent = new Map<string, number>()
  for (const t of ticketSums ?? []) {
    const cents = Math.round(Number(t.producer_amount) * 100)
    amountByEvent.set(t.event_id, (amountByEvent.get(t.event_id) ?? 0) + cents)
  }

  let processed = 0

  for (const profile of profiles) {
    const recipientId = profile.pagar_me_recipient_id!
    const producerData = producerMap.get(profile.id)
    if (!producerData) continue

    // Valor esperado = soma do producer_amount dos eventos elegíveis desse
    // produtor. Nunca o saldo total do recipient, que pode incluir dinheiro
    // de outro evento ainda dentro do prazo de D+3.
    const expectedCents = producerData.eventIds.reduce(
      (sum, eventId) => sum + (amountByEvent.get(eventId) ?? 0),
      0
    )

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

      console.log(`[cron/repasse] recipient ${recipientId} | esperado: R$${(expectedCents / 100).toFixed(2)} | saldo disponível: R$${(available / 100).toFixed(2)}`)

      // Claim-before-transfer: marca primeiro com condição atômica para evitar
      // repasse duplicado em execuções concorrentes ou retries do cron.
      const claimNow = new Date().toISOString()
      const { data: claimed } = await supabaseAdmin
        .from('events')
        .update({ repasse_liberado_at: claimNow })
        .in('id', producerData.eventIds)
        .is('repasse_liberado_at', null)
        .select('id')

      if (!claimed?.length) {
        console.log(`[cron/repasse] recipient ${recipientId} | eventos já marcados por outra execução, pulando`)
        continue
      }

      if (expectedCents === 0) {
        console.log(`[cron/repasse] recipient ${recipientId} | nenhum ticket pago encontrado, nada a repassar`)
        processed++
        continue
      }

      if (available < expectedCents) {
        // available_amount é só o teto de segurança: se o saldo real no
        // Pagar.me não cobre o valor esperado pelos nossos registros, o
        // split provavelmente não creditou (bug conhecido no ambiente de
        // teste). Não falha silenciosamente nem transfere o saldo errado —
        // reverte o claim pro próximo ciclo tentar de novo.
        console.error(`[cron/repasse] recipient ${recipientId} | saldo insuficiente: esperado R$${(expectedCents / 100).toFixed(2)}, disponível R$${(available / 100).toFixed(2)} - split pode não ter sido aplicado`)
        await supabaseAdmin
          .from('events')
          .update({ repasse_liberado_at: null })
          .in('id', producerData.eventIds)
        continue
      }

      const transferRes = await fetch(
        `https://api.pagar.me/core/v5/recipients/${recipientId}/transfers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: pagarmeAuth() },
          body: JSON.stringify({ amount: expectedCents }),
        }
      )

      if (!transferRes.ok) {
        const err = await transferRes.json().catch(() => ({}))
        console.error(`[cron/repasse] erro na transferência ${recipientId}:`, JSON.stringify(err))
        // Reverte o claim para o próximo ciclo tentar novamente.
        await supabaseAdmin
          .from('events')
          .update({ repasse_liberado_at: null })
          .in('id', producerData.eventIds)
        continue
      }

      const transferData = await transferRes.json()
      console.log(`[cron/repasse] transferência criada: ${transferData.id} | R$${(expectedCents / 100).toFixed(2)}`)

      processed++
    } catch (e) {
      console.error(`[cron/repasse] exception ${recipientId}:`, e)
      await supabaseAdmin
        .from('events')
        .update({ repasse_liberado_at: null })
        .in('id', producerData.eventIds)
    }
  }

  return NextResponse.json({ ok: true, processed })
}
