import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error(`Supabase env vars missing: url=${!!url} key=${!!key}`)
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  const isMock = process.env.PAGARME_API_KEY === 'ak_test_placeholder' || !process.env.PAGARME_API_KEY

  console.log('ENV CHECK:', {
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    isMock,
  })

  try {
    const body = await req.json()
    const { event_id, quantity, user_id, user_email, user_name, payment_method } = body

    console.log('[checkout] body:', { event_id, quantity, user_id, payment_method })

    if (!event_id || !quantity) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: event_id, quantity' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('price, is_free, title')
      .eq('id', event_id)
      .single()

    if (eventError) {
      console.error('[checkout] erro ao buscar evento:', eventError)
      return NextResponse.json({ error: 'Evento não encontrado', detail: eventError.message }, { status: 404 })
    }
    if (!event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    }

    const price = Number(event.price) || 0
    const subtotal = price * quantity
    const roleonFee = subtotal * 0.04
    const operationalFee = subtotal * 0.0119 + 0.99
    const total = subtotal + roleonFee + operationalFee
    const amountCents = Math.round(total * 100)

    if (isMock) {
      if (payment_method === 'credit_card') {
        const insertPayload: Record<string, unknown> = {
          event_id,
          price_paid: total,
          status: 'paid',
        }
        if (user_id) insertPayload.user_id = user_id

        console.log('[checkout] mock credit_card insert:', insertPayload)

        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert(insertPayload)
          .select('id')
          .single()

        if (ticketError) {
          console.error('[checkout] erro insert ticket (credit_card):', ticketError)
          return NextResponse.json(
            { error: ticketError.message, detail: ticketError.details, hint: ticketError.hint },
            { status: 500 }
          )
        }

        console.log('[checkout] ticket criado:', ticket?.id)
        return NextResponse.json({
          order_id: 'mock_card_' + Date.now(),
          payment_method: 'credit_card',
          status: 'paid',
          ticket_id: ticket?.id ?? 'mock_ticket_card',
        })
      }

      // PIX mock
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      const mockOrderId = `mock_order_${Date.now()}`
      const mockQrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ROLEON_PIX_MOCK'

      const insertPayload: Record<string, unknown> = {
        event_id,
        price_paid: total,
        qr_code: mockQrUrl,
        status: 'pending',
      }
      if (user_id) insertPayload.user_id = user_id

      console.log('[checkout] mock pix insert:', insertPayload)

      const { error: ticketError } = await supabase
        .from('tickets')
        .insert(insertPayload)

      if (ticketError) {
        console.error('[checkout] erro insert ticket (pix):', ticketError)
        return NextResponse.json(
          { error: ticketError.message, detail: ticketError.details, hint: ticketError.hint },
          { status: 500 }
        )
      }

      return NextResponse.json({
        order_id: mockOrderId,
        qr_code_url: mockQrUrl,
        pix_code: '00020101021226870014br.gov.bcb.pix2565api.roleon.com.br/pix/v2/key/roleon5204000053039865802BR5925Roleon Eventos Ltda6009Sao Paulo62070503***63041234',
        amount: amountCents,
        expires_at: expiresAt,
      })
    }

    // ── Pagar.me real ────────────────────────────────────────────────────────
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
    if (ticketError) {
      console.error('[checkout] erro insert ticket (pagar.me):', ticketError)
    }

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
    if (process.env.PAGARME_API_KEY === 'ak_test_placeholder') {
      return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
