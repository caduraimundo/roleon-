import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

async function main() {
  config({ path: resolve(process.cwd(), '.env.local'), override: true })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('id, order_id, payment_method, price_paid')
    .in('status', ['paid', 'used', 'refunded'])
    .is('producer_amount', null)

  if (error) {
    console.error('Erro ao buscar tickets:', error)
    process.exit(1)
  }

  if (!tickets?.length) {
    console.log('Nenhum ticket com producer_amount NULL encontrado.')
    return
  }

  console.log(`\n${tickets.length} ticket(s) encontrado(s) para backfill.\n`)

  type Row = { ticket_id: string; payment_method: string; price_paid: string; producer_amount: string }
  const processed: Row[] = []
  const needsReview: Row[] = []

  for (const ticket of tickets) {
    const pricePaid: number = Number(ticket.price_paid)
    const method: string = ticket.payment_method ?? ''

    let producerAmount: number | null = null

    if (method === 'pix') {
      producerAmount = (pricePaid - 0.55) / 1.0509
    } else if (method === 'credit_card') {
      producerAmount = (pricePaid - 0.99) / 1.0719
    } else {
      needsReview.push({
        ticket_id: ticket.id,
        payment_method: method || '(null)',
        price_paid: pricePaid.toFixed(2),
        producer_amount: 'REVISAO_MANUAL',
      })
      continue
    }

    const rounded = Math.round(producerAmount * 100) / 100

    const { error: updateError } = await supabase
      .from('tickets')
      .update({ producer_amount: rounded })
      .eq('id', ticket.id)

    if (updateError) {
      console.error(`[${ticket.id}] Erro ao atualizar:`, updateError)
      processed.push({
        ticket_id: ticket.id,
        payment_method: method,
        price_paid: pricePaid.toFixed(2),
        producer_amount: 'ERRO_UPDATE',
      })
    } else {
      processed.push({
        ticket_id: ticket.id,
        payment_method: method,
        price_paid: pricePaid.toFixed(2),
        producer_amount: `R$ ${rounded.toFixed(2)}`,
      })
    }
  }

  const header =
    'ticket_id'.padEnd(40) +
    'payment_method'.padEnd(16) +
    'price_paid'.padEnd(12) +
    'producer_amount'
  const divider = '-'.repeat(90)

  console.log('=== TABELA FINAL ===')
  console.log(header)
  console.log(divider)
  for (const r of processed) {
    console.log(r.ticket_id.padEnd(40) + r.payment_method.padEnd(16) + r.price_paid.padEnd(12) + r.producer_amount)
  }

  if (needsReview.length > 0) {
    console.log('\n=== PRECISAM DE REVISAO MANUAL ===')
    console.log(header)
    console.log(divider)
    for (const r of needsReview) {
      console.log(r.ticket_id.padEnd(40) + r.payment_method.padEnd(16) + r.price_paid.padEnd(12) + r.producer_amount)
    }
  }

  console.log(`\nProcessados: ${processed.length} | Revisão manual: ${needsReview.length}`)
}

main()
