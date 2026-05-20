import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcFees } from '../../../lib/pricing'
import { validateCPF } from '../../../lib/cpf'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement, type JSXElementConstructor } from 'react'
import { TicketPDF } from '../../../components/TicketPDF'
import { checkoutRatelimit } from '@/lib/ratelimit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { success } = await checkoutRatelimit.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Limite de compras atingido. Tente novamente em 1 hora.' },
      { status: 429 }
    )
  }

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
        if (body.ticket_type_id) {
          // Busca direta pelo id específico — garante nome/preço corretos independente do evento
          const { data: tt } = await supabaseAdmin
            .from('ticket_types')
            .select('name, price')
            .eq('id', body.ticket_type_id)
            .single()
          if (tt) {
            const ttPrice = Number((tt as { price: unknown }).price)
            if (ttPrice) { price = ttPrice; unitTotal = calcFees(price, 1, 'pix').total }
            if (!resolvedTypeName) resolvedTypeName = String((tt as { name: unknown }).name)
          }
        } else {
          // Fallback: evento sem tipo selecionado — pega o mais barato
          const { data: ttList } = await supabaseAdmin
            .from('ticket_types')
            .select('name, price')
            .eq('event_id', event_id)
            .order('price', { ascending: true })
          if (ttList && ttList.length > 0) {
            const tt = ttList[0]
            const ttPrice = Number((tt as { price: unknown }).price)
            if (ttPrice) { price = ttPrice; unitTotal = calcFees(price, 1, 'pix').total }
            if (!resolvedTypeName) resolvedTypeName = String((tt as { name: unknown }).name)
          }
        }
      }

      for (let i = 0; i < quantity; i++) {
        if (body.ticket_type_id) {
          const { data: stockReserved, error: stockError } = await supabaseAdmin
            .rpc('reserve_ticket_stock', { p_ticket_type_id: body.ticket_type_id })

          if (stockError || !stockReserved) {
            if (ticketIds.length > 0) {
              await supabaseAdmin.from('tickets').delete().in('id', ticketIds)
            }
            return NextResponse.json(
              { error: 'Ingressos esgotados para este lote.' },
              { status: 409 }
            )
          }
        }

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
        console.log('[PIX INSERT] ticket_type_name:', resolvedTypeName, 'ticket_type_id:', body.ticket_type_id, 'body.ticket_type_name:', body.ticket_type_name)
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
        items: [{ amount: amountCents, description: event.title, quantity: 1, code: event_id }],
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
        const errText = await pagarmeRes.text()
        console.error('[checkout pix] ERRO PAGAR.ME HTTP', pagarmeRes.status, '| body completo:', errText)
        let err: unknown
        try { err = JSON.parse(errText) } catch { err = errText }
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

      // Atualiza só order_id quando não há EMV — qr_code já tem placeholder único por ticket
      const updateFields: Record<string, string> = { order_id: order.id }
      if (emvCode) updateFields.qr_code = emvCode
      const { error: updateError } = await supabaseAdmin
        .from('tickets')
        .update(updateFields)
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
      if (body.ticket_type_id) {
        const { data: stockReserved, error: stockError } = await supabaseAdmin
          .rpc('reserve_ticket_stock', { p_ticket_type_id: body.ticket_type_id })

        if (stockError || !stockReserved) {
          return NextResponse.json(
            { error: 'Ingressos esgotados para este lote.' },
            { status: 409 }
          )
        }
      }

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
      if (ticketStatus === 'paid') insertPayload.checkin_token = randomBytes(32).toString('hex')

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
            id, checkin_token, ticket_type_name, price_paid, payment_method, recipient_email,
            event:event_id (title, event_date, location_name),
            user:user_id (email, name)
          `)
          .eq('id', ticket.id)
          .single() as { data: any };

        const emailDestino = ticketCompleto?.recipient_email ?? ticketCompleto?.user?.email;
        if (ticketCompleto && emailDestino) {
          const evento = ticketCompleto.event as any;
          const dateObj = new Date((evento.event_date as string).replace(' ', 'T'));
          const dataEvento = dateObj.toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            timeZone: 'America/Sao_Paulo',
          });
          const horaEvento = dateObj.toLocaleTimeString('pt-BR', {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          });

          const ticketNumber = ticketCompleto.id.slice(-4).toUpperCase();
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticketCompleto.checkin_token ?? ticketCompleto.id)}`;

          const slug = (evento.title as string)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');

          const dataCapitalizada = dataEvento.charAt(0).toUpperCase() + dataEvento.slice(1);
          const eventDateForPDF = `${dataCapitalizada} - ${horaEvento}`;

          const pdfElement = createElement(TicketPDF, {
            eventTitle: evento.title,
            eventDate: eventDateForPDF,
            locationName: evento.location_name,
            ticketTypeName: ticketCompleto.ticket_type_name ?? '',
            pricePaid: ticketCompleto.price_paid ?? 0,
            ticketNumber,
            qrCodeUrl,
          }) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;
          const pdfBuffer = await renderToBuffer(pdfElement);

          await resend.emails.send({
            from: 'Roleon <noreply@roleon.com.br>',
            to: emailDestino,
            subject: `Seu ingresso para ${evento.title} está confirmado`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9F9F9;font-family:'Noto Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F9F9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0EA5A0;padding:24px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">ROLEON</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 24px;">
            <p style="margin:0 0 20px;color:#1A1A1A;font-size:15px;line-height:1.6;">
              Olá! Seu ingresso para <strong>${evento.title}</strong> foi confirmado.
            </p>
            <p style="margin:0 0 24px;color:#6E6E73;font-size:14px;line-height:1.6;">
              Seu ingresso está em anexo neste e-mail em formato PDF.<br>
              Salve o arquivo para acessar offline no dia do evento.
            </p>
            <div style="background:#F5F5F5;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;color:#1A1A1A;font-size:16px;font-weight:700;">${evento.title}</p>
              <p style="margin:0 0 4px;color:#6E6E73;font-size:14px;">${dataCapitalizada} - ${horaEvento}</p>
              <p style="margin:0;color:#6E6E73;font-size:14px;">${evento.location_name}</p>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
            `,
            attachments: [
              {
                filename: `ingresso-${slug}.pdf`,
                content: pdfBuffer,
              },
            ],
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
