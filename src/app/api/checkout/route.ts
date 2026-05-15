import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcFees } from '../../../lib/pricing'
import { validateCPF } from '../../../lib/cpf'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const isMock = !process.env.PAGARME_API_KEY || process.env.PAGARME_API_KEY === 'ak_test_placeholder'

  const body = await req.json()
  console.log('CHECKOUT BODY:', JSON.stringify(body, null, 2))
  console.log('ticket_type_name recebido:', body.ticket_type_name)

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') || ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  const userId = user?.id || body.user_id

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
    const { event_id, quantity, user_email, user_name, user_phone, payment_method } = body

    if (!event_id || !quantity) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: event_id, quantity' }, { status: 400 })
    }

    if (body.customer_document && !validateCPF(body.customer_document)) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('price, is_free, title')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      console.error('[checkout] erro ao buscar evento:', eventError)
      return NextResponse.json({ error: 'Evento não encontrado', detail: eventError?.message }, { status: 404 })
    }

    const isPix = payment_method !== 'credit_card'
    const price = Number(body.ticket_type_price) || Number(event.price) || 0
    const { total } = calcFees(price, quantity, isPix ? 'pix' : 'card')
    const amountCents = Math.round(total * 100)
    const { card_token, installments = 1, customer_document } = body

    const pagarmePayment = isPix
      ? { payment_method: 'pix', pix: { expires_in: 900 } }
      : {
          payment_method: 'credit_card',
          credit_card: {
            card_token,
            installments,
            statement_descriptor: 'ROLEON',
          },
        }

    const pagarmeRes = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        customer: {
          name: user_name || 'Cliente',
          email: user_email,
          document: customer_document || '00000000000',
          document_type: 'CPF',
          type: 'individual',
          phones: {
            mobile_phone: {
              country_code: '55',
              area_code: user_phone?.replace(/\D/g, '').slice(0, 2) || '31',
              number: user_phone?.replace(/\D/g, '').slice(2) || '999999999',
            },
          },
        },
        items: [{ amount: amountCents, description: event.title, quantity: 1 }],
        payments: [pagarmePayment],
      }),
    })

    if (!pagarmeRes.ok) {
      const err = await pagarmeRes.json()
      console.error('[checkout] erro pagar.me:', err)
      return NextResponse.json({ error: 'Falha ao criar pedido', detail: err }, { status: 500 })
    }

    const order = await pagarmeRes.json()

    if (order.status === 'failed') {
      console.log('[checkout] pedido recusado:', JSON.stringify(order, null, 2))
      return NextResponse.json({ error: 'Pagamento recusado', detail: order }, { status: 400 })
    }

    const txn = order.charges?.[0]?.last_transaction

    // Remove ticket pendente anterior do mesmo usuário/evento para evitar duplicatas
    if (userId) {
      await supabaseAdmin
        .from('tickets')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', event_id)
        .eq('status', 'pending')
    }

    const pixQrCode = txn?.qr_code_url || txn?.qr_code || `pix_${order.id}_${Date.now()}`
    const insertPayload: Record<string, unknown> = {
      event_id,
      price_paid: total,
      order_id: order.id,
      qr_code: isPix ? pixQrCode : (order.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
      status: isPix ? 'pending' : (order.status === 'paid' ? 'paid' : 'pending'),
    }
    if (userId) insertPayload.user_id = userId
    if (body.ticket_type_name) insertPayload.ticket_type_name = body.ticket_type_name

    console.log('[checkout] inserindo ticket:', JSON.stringify(insertPayload))
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert(insertPayload)
      .select('id')
      .single()
    if (ticketError) {
      console.error('TICKET INSERT ERROR:', JSON.stringify(ticketError))
      return NextResponse.json({ error: 'Falha ao salvar ticket', detail: ticketError.message, hint: ticketError.hint }, { status: 500 })
    }
    console.log('[checkout] ticket criado:', ticket?.id)

    if (isPix) {
      return NextResponse.json({
        order_id: order.id,
        ticket_id: ticket?.id ?? '',
        qr_code_url: txn?.qr_code_url || '',
        pix_code: txn?.qr_code || '',
        amount: amountCents,
        expires_at: txn?.expires_at || '',
      })
    }

    return NextResponse.json({
      order_id: order.id,
      ticket_id: ticket?.id ?? '',
      payment_method: 'credit_card',
      status: order.status,
    })

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('[checkout] erro inesperado:', error)
    console.log('PAGARME ERROR:', JSON.stringify(err, null, 2))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
