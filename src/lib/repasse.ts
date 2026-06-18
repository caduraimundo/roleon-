import { createClient, SupabaseClient } from '@supabase/supabase-js'

function pagarmeAuth() {
  return `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`
}

export type ResultadoRepasseProdutor = {
  producerId: string
  eventIds: string[]
  expectedCents: number
  availableCents: number | null
  transferred: boolean
  transferId?: string
  error?: string
}

// Processa o repasse de uma lista de eventos elegiveis (a checagem de
// elegibilidade - D+3, status active, is_free false, repasse_liberado_at
// null - e responsabilidade de quem chama essa funcao). Agrupa por
// produtor, calcula o valor exato a partir de tickets.producer_amount
// (corrige F8 - nunca usa o saldo agregado do recipient como fonte do
// valor), e usa o saldo do Pagar.me so como teto de seguranca antes de
// transferir. Usada pelo cron de repasse e pelo botao "Forcar repasse" do
// Admin 4.
export async function processarRepasseEventos(
  supabaseAdmin: SupabaseClient,
  eventIds: string[]
): Promise<ResultadoRepasseProdutor[]> {
  if (eventIds.length === 0) return []

  const { data: events, error: eventsError } = await supabaseAdmin
    .from('events')
    .select('id, producer_id')
    .in('id', eventIds)

  if (eventsError) throw new Error(`Erro ao buscar eventos: ${eventsError.message}`)

  const producerMap = new Map<string, { eventIds: string[] }>()
  for (const event of events ?? []) {
    if (!event.producer_id) continue
    if (!producerMap.has(event.producer_id)) {
      producerMap.set(event.producer_id, { eventIds: [] })
    }
    producerMap.get(event.producer_id)!.eventIds.push(event.id)
  }

  const producerIds = [...producerMap.keys()]
  if (producerIds.length === 0) return []

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, pagar_me_recipient_id')
    .in('id', producerIds)
    .not('pagar_me_recipient_id', 'is', null)

  if (profilesError) throw new Error(`Erro ao buscar profiles: ${profilesError.message}`)

  const { data: ticketSums, error: ticketsError } = await supabaseAdmin
    .from('tickets')
    .select('event_id, producer_amount')
    .in('event_id', eventIds)
    .in('status', ['paid', 'used'])

  if (ticketsError) throw new Error(`Erro ao buscar tickets: ${ticketsError.message}`)

  const amountByEvent = new Map<string, number>()
  for (const t of ticketSums ?? []) {
    const cents = Math.round(Number(t.producer_amount) * 100)
    amountByEvent.set(t.event_id, (amountByEvent.get(t.event_id) ?? 0) + cents)
  }

  const results: ResultadoRepasseProdutor[] = []

  for (const profile of profiles ?? []) {
    const recipientId = profile.pagar_me_recipient_id!
    const producerData = producerMap.get(profile.id)
    if (!producerData) continue

    const expectedCents = producerData.eventIds.reduce(
      (sum, eventId) => sum + (amountByEvent.get(eventId) ?? 0),
      0
    )

    const result: ResultadoRepasseProdutor = {
      producerId: profile.id,
      eventIds: producerData.eventIds,
      expectedCents,
      availableCents: null,
      transferred: false,
    }

    try {
      const balanceRes = await fetch(
        `https://api.pagar.me/core/v5/recipients/${recipientId}/balance`,
        { headers: { Authorization: pagarmeAuth() } }
      )

      if (!balanceRes.ok) {
        result.error = 'Erro ao buscar saldo no Pagar.me'
        results.push(result)
        continue
      }

      const balanceData = await balanceRes.json()
      const available = balanceData.available_amount ?? balanceData.available?.amount ?? 0
      result.availableCents = available

      // Claim-before-transfer: marca primeiro com condicao atomica para
      // evitar repasse duplicado em execucoes concorrentes ou retries.
      const claimNow = new Date().toISOString()
      const { data: claimed } = await supabaseAdmin
        .from('events')
        .update({ repasse_liberado_at: claimNow })
        .in('id', producerData.eventIds)
        .is('repasse_liberado_at', null)
        .select('id')

      if (!claimed?.length) {
        result.error = 'Eventos ja marcados por outra execucao'
        results.push(result)
        continue
      }

      if (expectedCents === 0) {
        result.transferred = true
        results.push(result)
        continue
      }

      if (available < expectedCents) {
        result.error = `Saldo insuficiente: esperado R$${(expectedCents / 100).toFixed(2)}, disponivel R$${(available / 100).toFixed(2)}`
        await supabaseAdmin
          .from('events')
          .update({ repasse_liberado_at: null })
          .in('id', producerData.eventIds)
        results.push(result)
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
        result.error = `Erro na transferencia: ${JSON.stringify(err)}`
        await supabaseAdmin
          .from('events')
          .update({ repasse_liberado_at: null })
          .in('id', producerData.eventIds)
        results.push(result)
        continue
      }

      const transferData = await transferRes.json()
      result.transferred = true
      result.transferId = transferData.id
      results.push(result)
    } catch (e) {
      result.error = e instanceof Error ? e.message : 'Erro desconhecido'
      await supabaseAdmin
        .from('events')
        .update({ repasse_liberado_at: null })
        .in('id', producerData.eventIds)
      results.push(result)
    }
  }

  return results
}
