import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { event_id, quantity, user_id, user_email, user_name } = await req.json()

  if (!event_id || !quantity || !user_id) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  const { data: event } = await supabase
    .from('events')
    .select('price, is_free, title')
    .eq('id', event_id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  const price = Number(event.price) || 0
  const subtotal = price * quantity
  const roleonFee = subtotal * 0.04
  const operationalFee = subtotal * 0.0119 + 0.99
  const total = subtotal + roleonFee + operationalFee
  const amountCents = Math.round(total * 100)

  const isMock = process.env.PAGARME_API_KEY === 'ak_test_placeholder'

  if (isMock) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const mockOrderId = `mock_order_${Date.now()}`

    await supabase.from('tickets').insert({
      event_id,
      user_id,
      price_paid: total,
      qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ROLEON_PIX_MOCK',
      status: 'pending',
    })

    return NextResponse.json({
      order_id: mockOrderId,
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ROLEON_PIX_MOCK',
      pix_code: '00020101021226870014br.gov.bcb.pix',
      amount: amountCents,
      expires_at: expiresAt,
    })
  }

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
        payment_method: 'pix',
        pix: { expires_in: 3600 },
      }],
    }),
  })

  if (!pagarmeRes.ok) {
    const err = await pagarmeRes.json()
    return NextResponse.json({ error: 'Falha ao criar pedido', detail: err }, { status: 500 })
  }

  const order = await pagarmeRes.json()
  const pixData = order.charges?.[0]?.last_transaction

  await supabase.from('tickets').insert({
    event_id,
    user_id,
    price_paid: total,
    qr_code: pixData?.qr_code_url ?? '',
    status: 'pending',
  })

  return NextResponse.json({
    order_id: order.id,
    qr_code_url: pixData?.qr_code_url ?? '',
    pix_code: pixData?.qr_code ?? '',
    amount: amountCents,
    expires_at: pixData?.expires_at ?? '',
  })
}
