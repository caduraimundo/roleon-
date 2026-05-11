import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error(`Supabase env vars missing: url=${!!url} key=${!!key}`)
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  const isMock = !process.env.PAGARME_API_KEY || process.env.PAGARME_API_KEY === 'ak_test_placeholder'

  const body = await req.json()

  if (isMock) {
    if (body.payment_method === 'credit_card') {
      return NextResponse.json({
        order_id: 'mock_card_' + Date.now(),
        payment_method: 'credit_card',
        status: 'paid',
        ticket_id: 'mock_ticket_' + Date.now(),
      })
    }

    return NextResponse.json({
      order_id: 'mock_order_' + Date.now(),
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ROLEON_PIX_MOCK',
      pix_code: '00020101021226870014br.gov.bcb.pix',
      amount: body.amount || 5000,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
  }

  // ── Pagar.me real ────────────────────────────────────────────────────────
  try {
    const { event_id, quantity, user_id, user_email, user_name, payment_method } = body

    if (!event_id || !quantity) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: event_id, quantity' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('price, is_free, title')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      console.error('[checkout] erro ao buscar evento:', eventError)
      return NextResponse.json({ error: 'Evento não encontrado', detail: eventError?.message }, { status: 404 })
    }

    const price = Number(event.price) || 0
    const subtotal = price * quantity
    const total = subtotal + subtotal * 0.04 + subtotal * 0.0119 + 0.99
    const amountCents = Math.round(total * 100)

    const pagarmeRes = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        customer: { name: user_name, email: user_email },
        items: [{ amount: amountCents, description: event.title, quantity: 1 }],
        payments: [{
          payment_method: payment_method === 'credit_card' ? 'credit_card' : 'pix',
          pix: payment_method !== 'credit_card' ? { expires_in: 3600 } : undefined,
        }],
      }),
    })

    if (!pagarmeRes.ok) {
      const err = await pagarmeRes.json()
      console.error('[checkout] erro pagar.me:', err)
      return NextResponse.json({ error: 'Falha ao criar pedido', detail: err }, { status: 500 })
    }

    const order = await pagarmeRes.json()
    const pixData = order.charges?.[0]?.last_transaction

    const insertPayload: Record<string, unknown> = {
      event_id,
      price_paid: total,
      qr_code: pixData?.qr_code_url ?? '',
      status: 'pending',
    }
    if (user_id) insertPayload.user_id = user_id

    const { error: ticketError } = await supabase.from('tickets').insert(insertPayload)
    if (ticketError) console.error('[checkout] erro insert ticket:', ticketError)

    return NextResponse.json({
      order_id: order.id,
      qr_code_url: pixData?.qr_code_url ?? '',
      pix_code: pixData?.qr_code ?? '',
      amount: amountCents,
      expires_at: pixData?.expires_at ?? '',
    })

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('[checkout] erro inesperado:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
