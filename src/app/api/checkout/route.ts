import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcFees } from '../../../lib/pricing'
import { validateCPF } from '../../../lib/cpf'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

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
    let price = Number(body.ticket_type_price) || Number(event.price) || 0
    const { total } = calcFees(price, quantity, isPix ? 'pix' : 'card')
    const amountCents = Math.round(total * 100)
    const { card_token, installments = 1, customer_document } = body
    let unitTotal = calcFees(price, 1, isPix ? 'pix' : 'card').total

    // ── PIX ───────────────────────────────────────────────────────────────────
    if (isPix) {
      // Passo 1: pré-inserir todos os tickets com order_id temporário
      const tempOrderId = crypto.randomUUID()
      const ticketIds: string[] = []

      // Resolver nome e preço do tipo de ingresso pelo banco
      let resolvedTypeName: string | null = body.ticket_type_name || null
      if (!body.ticket_type_price) {
        let ttQuery = supabaseAdmin.from('ticket_types').select('name, price')
        if (body.ticket_type_id) {
          ttQuery = ttQuery.eq('id', body.ticket_type_id)
        } else {
          ttQuery = ttQuery.eq('event_id', event_id).order('price', { ascending: true })
        }
        const { data: ttList } = await ttQuery
        if (ttList && ttList.length > 0) {
          const tt = ttList[0]
          const ttPrice = Number((tt as { price: unknown }).price)
          if (ttPrice) {
            price = ttPrice
            unitTotal = calcFees(price, 1, 'pix').total
          }
          if (!resolvedTypeName) resolvedTypeName = String((tt as { name: unknown }).name)
        }
      }

      for (let i = 0; i < quantity; i++) {
        const insertPayload: Record<string, unknown> = {
          event_id,
          price_paid: unitTotal,
          order_id: tempOrderId,
          qr_code: `pix_pending_${tempOrderId}_${i}`,
          status: 'pending',
          payment_method: 'pix',
        }
        if (userId) insertPayload.user_id = userId
        if (resolvedTypeName) insertPayload.ticket_type_name = resolvedTypeName
        if (user_email) insertPayload.recipient_email = user_email

        console.log(`[checkout pix] inserindo ticket ${i + 1}/${quantity}:`, JSON.stringify(insertPayload))
        const { data: ticket, error: ticketError } = await supabaseAdmin
          .from('tickets')
          .insert(insertPayload)
          .select('id')
          .single()
        if (ticketError) {
          console.error('TICKET INSERT ERROR:', JSON.stringify(ticketError))
          return NextResponse.json({ error: 'Falha ao salvar ticket', detail: ticketError.message, hint: ticketError.hint }, { status: 500 })
        }
        if (ticket?.id) ticketIds.push(ticket.id)
      }

      // Passo 2: único pedido Pagar.me com valor total
      const pixPayload = {
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
        items: [{ amount: Math.round(unitTotal * 100), description: event.title, quantity }],
        payments: [{ payment_method: 'pix', pix: { expires_in: 900 } }],
      }
      console.log('[checkout pix] enviando para Pagar.me:', JSON.stringify({
        unitAmountCents: Math.round(unitTotal * 100),
        totalAmountCents: amountCents,
        quantity,
        tempOrderId,
        ticketIds,
        pixPayload,
      }))

      let pagarmeRes: Response
      try {
        pagarmeRes = await fetch('https://api.pagar.me/core/v5/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`,
          },
          body: JSON.stringify(pixPayload),
        })
      } catch (fetchErr) {
        console.error('[checkout pix] fetch falhou:', fetchErr)
        await supabaseAdmin.from('tickets').delete().eq('order_id', tempOrderId)
        return NextResponse.json({ error: 'Falha ao criar pedido PIX' }, { status: 500 })
      }

      console.log('[checkout pix] resposta Pagar.me status HTTP:', pagarmeRes.status)

      if (!pagarmeRes.ok) {
        const err = await pagarmeRes.json()
        console.error('[checkout pix] erro pagar.me:', JSON.stringify(err))
        await supabaseAdmin.from('tickets').delete().eq('order_id', tempOrderId)
        return NextResponse.json({ error: 'Falha ao criar pedido', detail: err }, { status: 500 })
      }

      const order = await pagarmeRes.json()
      const isRealOrderId = order.id?.startsWith('or_')
      console.log('[checkout pix] order recebido:', JSON.stringify({ id: order.id, status: order.status, isRealOrderId }))

      if (!isRealOrderId) {
        console.error('[checkout pix] PAGAR.ME REJEITOU — order.id não é or_*. HTTP status:', pagarmeRes.status, '| body completo:', JSON.stringify(order, null, 2))
      }

      if (order.status === 'failed') {
        console.error('[checkout pix] pedido recusado pelo Pagar.me:', JSON.stringify(order, null, 2))
        await supabaseAdmin.from('tickets').delete().eq('order_id', tempOrderId)
        return NextResponse.json({ error: 'Pagamento recusado', detail: order }, { status: 400 })
      }

      // Passo 3: atualizar todos os tickets com o order_id real e QR code
      const txn = order.charges?.[0]?.last_transaction

      // Buscar o EMV (copia e cola) via GET /transactions/{id} — o POST /orders não retorna o campo completo
      let emvCode = ''
      if (txn?.id) {
        try {
          const auth = `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`
          const txnRes = await fetch(`https://api.pagar.me/core/v5/transactions/${txn.id}`, {
            headers: { Authorization: auth },
          })
          if (txnRes.ok) {
            const txnData = await txnRes.json()
            console.log('[checkout pix] GET transaction qr_code:', String(txnData.qr_code ?? '').slice(0, 60))
            const candidate: string = txnData.qr_code ?? ''
            if (candidate.startsWith('000201')) emvCode = candidate
          }
        } catch (e) {
          console.error('[checkout pix] erro ao buscar transação para EMV:', e)
        }
      }

      // QR Code: proxy autenticado para Pagar.me (browser não precisa de credenciais)
      const qrCodeUrl = txn?.id ? `/api/pix-qrcode?txn_id=${txn.id}` : ''

      console.log('[checkout pix] order criado:', order.id, '| tickets:', ticketIds, '| emvCode:', emvCode.slice(0, 40) || '(vazio)')

      const { error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({ order_id: order.id, qr_code: emvCode || txn?.id || '' })
        .eq('order_id', tempOrderId)

      if (updateError) {
        console.error('[checkout pix] erro ao atualizar tickets com order_id real:', JSON.stringify(updateError))
      }

      return NextResponse.json({
        order_id: order.id,
        ticket_id: ticketIds[0] ?? '',
        ticket_ids: ticketIds,
        qr_code_url: qrCodeUrl,
        pix_code: emvCode,
        amount: amountCents,
        expires_at: txn?.expires_at || '',
      })
    }

    // ── Cartão ────────────────────────────────────────────────────────────────
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
        payments: [{
          payment_method: 'credit_card',
          credit_card: { card_token, installments, statement_descriptor: 'ROLEON' },
        }],
      }),
    })

    if (!pagarmeRes.ok) {
      const err = await pagarmeRes.json()
      console.error('[checkout cartão] erro pagar.me:', err)
      return NextResponse.json({ error: 'Falha ao criar pedido', detail: err }, { status: 500 })
    }

    const order = await pagarmeRes.json()

    if (order.status === 'failed') {
      console.log('[checkout cartão] pedido recusado:', JSON.stringify(order, null, 2))
      return NextResponse.json({ error: 'Pagamento recusado', detail: order }, { status: 400 })
    }

    const ticketStatus = order.status === 'paid' ? 'paid' : 'pending'
    const ticketIds: string[] = []

    for (let i = 0; i < quantity; i++) {
      const uniqueSuffix = `${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`
      const insertPayload: Record<string, unknown> = {
        event_id,
        price_paid: unitTotal,
        order_id: order.id,
        qr_code: `card_${order.id}_${uniqueSuffix}`,
        status: ticketStatus,
        payment_method: 'credit_card',
      }
      if (userId) insertPayload.user_id = userId
      if (body.ticket_type_name) insertPayload.ticket_type_name = body.ticket_type_name
      if (user_email) insertPayload.recipient_email = user_email

      console.log(`[checkout] inserindo ticket ${i + 1}/${quantity}:`, JSON.stringify(insertPayload))
      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from('tickets')
        .insert(insertPayload)
        .select('id')
        .single()
      if (ticketError) {
        console.error('TICKET INSERT ERROR:', JSON.stringify(ticketError))
        return NextResponse.json({ error: 'Falha ao salvar ticket', detail: ticketError.message, hint: ticketError.hint }, { status: 500 })
      }
      console.log(`[checkout] ticket ${i + 1} criado:`, ticket?.id)
      if (ticket?.id) ticketIds.push(ticket.id)

      if (ticket?.id) {
        const { data: ticketCompleto } = await supabaseAdmin
          .from('tickets')
          .select(`
            id, ticket_type_name, price_paid, payment_method, recipient_email,
            event:event_id (title, event_date, location_name),
            user:user_id (email, name)
          `)
          .eq('id', ticket.id)
          .single();

        const emailDestino = (ticketCompleto as any)?.recipient_email || (ticketCompleto?.user as any)?.email;
        if (ticketCompleto && emailDestino) {
          const evento = ticketCompleto.event as any;
          const dateObj = new Date((evento.event_date as string).replace(' ', 'T'));
          const dataEvento = dateObj.toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            timeZone: 'America/Sao_Paulo'
          });
          const horaEvento = dateObj.toLocaleTimeString('pt-BR', {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
          });
          const codigoIngresso = 'ROLEON-' + ticketCompleto.id.slice(-4).toUpperCase();
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codigoIngresso)}`;
          const numeroIngresso = '#' + ticketCompleto.id.slice(-4).toUpperCase();

          await resend.emails.send({
            from: 'Roleon <noreply@roleon.com.br>',
            to: emailDestino,
            subject: `Seu ingresso para ${evento.title} está confirmado`,
            html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:#F9F9F9;font-family:'Noto Sans',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F9F9;padding:32px 16px;"><tr><td align="center"><table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><tr><td style="background:#0EA5A0;padding:24px;text-align:center;"><p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">ROLEON</p></td></tr><tr><td style="padding:32px 24px 8px;text-align:center;"><p style="margin:0 0 8px;color:#6E6E73;font-size:14px;">Ingresso confirmado</p><h1 style="margin:0;color:#1A1A1A;font-size:22px;font-weight:700;">${evento.title}</h1></td></tr><tr><td style="padding:16px 24px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:8px 0;border-bottom:1px solid #F0F0F0;"><span style="color:#6E6E73;font-size:13px;">Data</span><br><span style="color:#1A1A1A;font-size:15px;font-weight:600;">${dataEvento}</span></td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #F0F0F0;"><span style="color:#6E6E73;font-size:13px;">Horario</span><br><span style="color:#1A1A1A;font-size:15px;font-weight:600;">${horaEvento}</span></td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #F0F0F0;"><span style="color:#6E6E73;font-size:13px;">Local</span><br><span style="color:#1A1A1A;font-size:15px;font-weight:600;">${evento.location_name}</span></td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #F0F0F0;"><span style="color:#6E6E73;font-size:13px;">Tipo</span><br><span style="color:#1A1A1A;font-size:15px;font-weight:600;">${ticketCompleto.ticket_type_name || 'Pista'}</span></td></tr><tr><td style="padding:8px 0;"><span style="color:#6E6E73;font-size:13px;">Valor pago</span><br><span style="color:#1A1A1A;font-size:15px;font-weight:600;">R$ ${Number(ticketCompleto.price_paid).toFixed(2).replace('.', ',')}</span></td></tr></table></td></tr><tr><td style="padding:24px;text-align:center;border-top:2px dashed #E5E5E5;"><p style="margin:0 0 16px;color:#6E6E73;font-size:13px;">Apresente este QR Code na entrada</p><img src="${qrUrl}" width="160" height="160" alt="QR Code" style="border-radius:8px;"><p style="margin:12px 0 0;color:#1A1A1A;font-size:16px;font-weight:700;letter-spacing:2px;">${numeroIngresso}</p></td></tr><tr><td style="padding:24px;text-align:center;background:#F9F9F9;"><p style="margin:0;color:#6E6E73;font-size:12px;">Roleon</p><p style="margin:4px 0 0;color:#6E6E73;font-size:12px;">Em caso de duvidas, responda este e-mail.</p></td></tr></table></td></tr></table></body></html>`
          });
          console.log('[Checkout Cartao] E-mail enviado para:', emailDestino);
        }
      }
    }

    return NextResponse.json({
      order_id: order.id,
      ticket_id: ticketIds[0] ?? '',
      ticket_ids: ticketIds,
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
