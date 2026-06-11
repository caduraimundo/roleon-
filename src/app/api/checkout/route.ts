import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcFees } from '../../../lib/pricing'
import { notifyWaitlist } from '../../../lib/notifyWaitlist'
import { validateCPF } from '../../../lib/cpf'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'
import { generateTicketPDF } from '../../../lib/generateTicketPDF'
import { checkoutRatelimit } from '@/lib/ratelimit'
import { mapPagarmeError } from '../../../lib/pagarmeErrors'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

async function logAudit(
  ticketId: string,
  oldStatus: string,
  newStatus: string,
  metadata: object
) {
  await supabaseAdmin.from('ticket_audit_log').insert({
    ticket_id: ticketId,
    old_status: oldStatus,
    new_status: newStatus,
    triggered_by: 'checkout',
    metadata,
  });
}

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
  const userId = user?.id ?? null

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

  if (!userId) {
    return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
  }

  let cardReservedCount = 0

  // ── Pagar.me real ────────────────────────────────────────────────────────
  try {
    const { event_id, quantity, user_email, user_name, user_phone, payment_method } = body

    if (!event_id || !quantity) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: event_id, quantity' }, { status: 400 })
    }

    const { data: withinLimit, error: limitError } = await supabaseAdmin
      .rpc('check_user_ticket_limit', {
        p_user_id: userId,
        p_event_id: event_id,
        p_quantity_requested: quantity,
        p_max_per_user: 10
      })

    if (limitError || !withinLimit) {
      return NextResponse.json(
        { error: 'Limite de 10 ingressos por evento atingido.' },
        { status: 409 }
      )
    }

    if (body.customer_document && !validateCPF(body.customer_document)) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('price, is_free, title, producer_id')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      console.error('[checkout] erro ao buscar evento:', eventError)
      return NextResponse.json({ error: 'Evento não encontrado', detail: eventError?.message }, { status: 404 })
    }

    // Busca recipient_id do produtor para split automático
    let producerRecipientId: string | null = null
    if (event.producer_id) {
      const { data: producerProfile } = await supabaseAdmin
        .from('profiles')
        .select('pagar_me_recipient_id')
        .eq('id', event.producer_id)
        .single()
      producerRecipientId = producerProfile?.pagar_me_recipient_id ?? null
      console.log('[checkout] producerRecipientId:', producerRecipientId)
    }

    if (!event.is_free && !producerRecipientId) {
      return NextResponse.json(
        { error: 'Este evento não está disponível para compra no momento. O organizador precisa configurar os dados bancários para repasse.' },
        { status: 400 }
      )
    }

    const isPix = payment_method !== 'credit_card'
    const { card_token, installments = 1, customer_document } = body
    const couponCode = body.coupon_code ? String(body.coupon_code).toUpperCase().trim() : null

    // F1: resolver preço e nome sempre do banco — nunca confiar no client
    let price: number
    let resolvedTypeName: string | null = null
    if (body.ticket_type_id) {
      const { data: tt, error: ttError } = await supabaseAdmin
        .from('ticket_types')
        .select('name, price, event_id')
        .eq('id', body.ticket_type_id)
        .single()
      if (ttError || !tt) {
        return NextResponse.json({ error: 'Tipo de ingresso não encontrado' }, { status: 400 })
      }
      if ((tt as any).event_id !== event_id) {
        return NextResponse.json({ error: 'Tipo de ingresso não pertence a este evento' }, { status: 400 })
      }
      price = Number((tt as any).price) || 0
      resolvedTypeName = String((tt as any).name)
    } else {
      price = Number(event.price) || 0
    }
    let unitTotal = calcFees(price, 1, isPix ? 'pix' : 'card').total

    // ── PIX ───────────────────────────────────────────────────────────────────
    if (isPix) {
      // Passo 1: pré-inserir todos os tickets com order_id temporário
      const tempOrderId = crypto.randomUUID()
      const ticketIds: string[] = []

      // F2: calcular desconto server-side — nunca usar body.discount_applied
      let serverDiscount = 0
      if (couponCode) {
        const { data: couponData } = await supabaseAdmin
          .from('coupons')
          .select('discount_type, discount_value')
          .eq('code', couponCode)
          .eq('active', true)
          .maybeSingle()
        if (!couponData) {
          return NextResponse.json({ error: 'Cupom inválido ou inativo' }, { status: 400 })
        }
        const { data: couponResult } = await supabaseAdmin
          .rpc('atomic_use_coupon', {
            p_coupon_code: couponCode,
            p_event_id: event_id,
            p_user_id: userId ?? null,
          })
        const cr = Array.isArray(couponResult) ? couponResult[0] : couponResult
        if (!cr?.success) {
          return NextResponse.json(
            { error: cr?.error_message ?? 'Cupom invalido ou esgotado' },
            { status: 400 }
          )
        }
        const discountValue = Number(couponData.discount_value)
        if (couponData.discount_type === 'percent') {
          serverDiscount = price * (discountValue / 100)
        } else {
          serverDiscount = Math.min(discountValue, price)
        }
        serverDiscount = Math.round(serverDiscount * 100) / 100
        price = Math.max(0, price - serverDiscount)
        unitTotal = calcFees(price, 1, 'pix').total
      }
      const payAmountCents = Math.round(calcFees(price, quantity, 'pix').total * 100)

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
        if (body.ticket_type_id) insertPayload.ticket_type_id = body.ticket_type_id
        if (couponCode) { insertPayload.coupon_code = couponCode; insertPayload.discount_applied = serverDiscount }

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
        items: [{ amount: payAmountCents, description: event.title, quantity: 1, code: event_id }],
        payments: [{ payment_method: 'pix', pix: { expires_in: 900 } }],
        ...(producerRecipientId && price > 0 ? {
          split: [{
            amount: Math.round(price * quantity * 100),
            recipient_id: producerRecipientId,
            type: 'flat',
            options: { charge_processing_fee: false, charge_remainder_fee: false, liable: false },
          }],
        } : {}),
      }
      console.log('[checkout pix] enviando pedido para Pagar.me | producerRecipientId:', producerRecipientId, '| payAmountCents:', payAmountCents)

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
        amount: payAmountCents,
        expires_at: txn?.expires_at || '',
      })
    }

    // ── Cartão ────────────────────────────────────────────────────────────────
    // F2: calcular desconto server-side — nunca usar body.discount_applied
    let serverDiscount = 0
    if (couponCode) {
      const { data: couponData } = await supabaseAdmin
        .from('coupons')
        .select('discount_type, discount_value')
        .eq('code', couponCode)
        .eq('active', true)
        .maybeSingle()
      if (!couponData) {
        return NextResponse.json({ error: 'Cupom inválido ou inativo' }, { status: 400 })
      }
      const { data: couponResult } = await supabaseAdmin
        .rpc('atomic_use_coupon', {
          p_coupon_code: couponCode,
          p_event_id: event_id,
          p_user_id: userId ?? null,
        })
      const cr = Array.isArray(couponResult) ? couponResult[0] : couponResult
      if (!cr?.success) {
        return NextResponse.json(
          { error: cr?.error_message ?? 'Cupom invalido ou esgotado' },
          { status: 400 }
        )
      }
      const discountValue = Number(couponData.discount_value)
      if (couponData.discount_type === 'percent') {
        serverDiscount = price * (discountValue / 100)
      } else {
        serverDiscount = Math.min(discountValue, price)
      }
      serverDiscount = Math.round(serverDiscount * 100) / 100
      price = Math.max(0, price - serverDiscount)
      unitTotal = calcFees(price, 1, 'card').total
    }
    const payAmountCents = Math.round(calcFees(price, quantity, 'card').total * 100)

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
        items: [{ amount: payAmountCents, description: event.title, quantity: 1 }],
        payments: [{
          payment_method: 'credit_card',
          credit_card: { card_token, installments, statement_descriptor: 'ROLEON' },
        }],
        ...(producerRecipientId && price > 0 ? {
          split: [{
            amount: Math.round(price * quantity * 100),
            recipient_id: producerRecipientId,
            type: 'flat',
            options: { charge_processing_fee: false, charge_remainder_fee: false, liable: false },
          }],
        } : {}),
      }),
    })

    if (!pagarmeRes.ok) {
      const err = await pagarmeRes.json()
      console.error('[checkout cartão] erro pagar.me:', err)
      if (body.ticket_type_id && cardReservedCount > 0) {
        await supabaseAdmin.rpc('release_ticket_stock', { p_ticket_type_id: body.ticket_type_id, p_quantity: cardReservedCount })
        notifyWaitlist({ eventId: event_id, ticketTypeId: body.ticket_type_id }).catch(err => console.error('[checkout] notifyWaitlist erro:', err))
      }
      return NextResponse.json({ error: 'Falha ao criar pedido', detail: err }, { status: 500 })
    }

    const order = await pagarmeRes.json()

    if (order.status === 'failed') {
      console.log('[checkout cartão] pedido recusado:', JSON.stringify(order, null, 2))
      if (body.ticket_type_id && cardReservedCount > 0) {
        await supabaseAdmin.rpc('release_ticket_stock', { p_ticket_type_id: body.ticket_type_id, p_quantity: cardReservedCount })
        notifyWaitlist({ eventId: event_id, ticketTypeId: body.ticket_type_id }).catch(err => console.error('[checkout] notifyWaitlist erro:', err))
      }
      const acquirerCode = order.charges?.[0]?.last_transaction?.acquirer_return_code ?? null
      return NextResponse.json(
        { error: mapPagarmeError(acquirerCode), acquirer_code: acquirerCode },
        { status: 402 }
      )
    }

    const ticketStatus = order.status === 'paid' ? 'paid' : 'pending'
    const ticketIds: string[] = []
    const pdfAttachments: { filename: string; content: Buffer }[] = []
    let emailDestinoFinal = ''
    let eventoInfo: any = null
    let dataCapitalizadaFinal = ''
    let horaEventoFinal = ''

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
        cardReservedCount++
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
      if (resolvedTypeName) insertPayload.ticket_type_name = resolvedTypeName
      if (user_email) insertPayload.recipient_email = user_email
      if (body.ticket_type_id) insertPayload.ticket_type_id = body.ticket_type_id
      if (ticketStatus === 'paid') insertPayload.checkin_token = randomBytes(32).toString('hex')
      if (couponCode) { insertPayload.coupon_code = couponCode; insertPayload.discount_applied = serverDiscount }

      console.log(`[checkout] inserindo ticket ${i + 1}/${quantity}:`, JSON.stringify(insertPayload))
      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from('tickets')
        .insert(insertPayload)
        .select('id')
        .single()
      if (ticketError) {
        console.error('TICKET INSERT ERROR:', JSON.stringify(ticketError))
        if (body.ticket_type_id) {
          await supabaseAdmin.rpc('release_ticket_stock', { p_ticket_type_id: body.ticket_type_id, p_quantity: 1 })
          notifyWaitlist({ eventId: event_id, ticketTypeId: body.ticket_type_id }).catch(err => console.error('[checkout] notifyWaitlist erro:', err))
        }
        return NextResponse.json({ error: 'Falha ao salvar ticket', detail: ticketError.message, hint: ticketError.hint }, { status: 500 })
      }
      console.log(`[checkout] ticket ${i + 1} criado:`, ticket?.id)
      if (ticket?.id) ticketIds.push(ticket.id)

      if (ticket?.id) {
        if (ticketStatus === 'paid') {
          logAudit(ticket.id, 'pending', 'paid', {
            price_paid: unitTotal,
            payment_method: 'credit_card',
            order_id: order.id,
          }).catch(() => {});
        } else {
          logAudit(ticket.id, 'pending', 'expired', {
            payment_method: 'credit_card',
            order_id: order.id,
            acquirer_code: order.charges?.[0]?.last_transaction?.acquirer_return_code ?? null,
          }).catch(() => {});
        }

        if (ticketStatus === 'paid') {
          const { data: ticketCompleto } = await supabaseAdmin
            .from('tickets')
            .select(`
              id, checkin_token, ticket_type_name, price_paid, payment_method,
              recipient_email, user_id,
              event:event_id (title, event_date, location_name)
            `)
            .eq('id', ticket.id)
            .single() as { data: any };

          if (ticketCompleto) {
            if (i === 0) {
              let userEmail = ticketCompleto.recipient_email;
              if (!userEmail && ticketCompleto.user_id) {
                const { data: perfil } = await supabaseAdmin
                  .from('profiles')
                  .select('email, name')
                  .eq('id', ticketCompleto.user_id)
                  .single();
                userEmail = perfil?.email;
              }
              emailDestinoFinal = userEmail ?? '';
              eventoInfo = ticketCompleto.event as any;
              const dateObj = new Date((eventoInfo.event_date as string).replace(' ', 'T'));
              const dataEvento = dateObj.toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                timeZone: 'America/Sao_Paulo',
              });
              horaEventoFinal = dateObj.toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit',
                timeZone: 'America/Sao_Paulo',
              });
              dataCapitalizadaFinal = dataEvento.charAt(0).toUpperCase() + dataEvento.slice(1);
            }

            const ticketNumber = ticketCompleto.id.slice(-4).toUpperCase();
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticketCompleto.checkin_token ?? ticketCompleto.id)}`;
            const eventDateForPDF = `${dataCapitalizadaFinal} - ${horaEventoFinal}`;

            const pdfBuffer = await generateTicketPDF({
              eventTitle: eventoInfo.title,
              eventDate: eventDateForPDF,
              locationName: eventoInfo.location_name,
              ticketTypeName: ticketCompleto.ticket_type_name ?? '',
              pricePaid: ticketCompleto.price_paid ?? 0,
              ticketNumber,
              qrCodeUrl,
            });

            const slugTitle = (eventoInfo.title as string)
              .toLowerCase()
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-');

            pdfAttachments.push({
              filename: `ingresso-${i + 1}-${slugTitle}.pdf`,
              content: pdfBuffer,
            });
          }
        }
      }
    }

    if (ticketStatus === 'paid' && emailDestinoFinal && eventoInfo && pdfAttachments.length > 0) {
      const subject = quantity === 1
        ? `Seu ingresso para ${eventoInfo.title} está confirmado`
        : `Seus ${quantity} ingressos para ${eventoInfo.title} estão confirmados`;
      const bodyText = quantity === 1
        ? `Olá! Seu ingresso para <strong>${eventoInfo.title}</strong> foi confirmado.`
        : `Olá! Seus ${quantity} ingressos para <strong>${eventoInfo.title}</strong> foram confirmados.`;
      const attachmentText = quantity === 1
        ? 'Seu ingresso está em anexo neste e-mail em formato PDF.<br>Salve o arquivo para acessar offline no dia do evento.'
        : `Seus ${quantity} ingressos estão em anexo neste e-mail em formato PDF.<br>Salve os arquivos para acessar offline no dia do evento.`;

      await resend.emails.send({
        from: 'Roleon <noreply@roleon.com.br>',
        to: emailDestinoFinal,
        subject,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F7;font-family:'Noto Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;padding:32px 16px;">
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
              ${bodyText}
            </p>
            <p style="margin:0 0 24px;color:#6E6E73;font-size:14px;line-height:1.6;">
              ${attachmentText}
            </p>
            <div style="background:#F5F5F5;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;color:#1A1A1A;font-size:16px;font-weight:700;">${eventoInfo.title}</p>
              <p style="margin:0 0 4px;color:#6E6E73;font-size:14px;">${dataCapitalizadaFinal} - ${horaEventoFinal}</p>
              <p style="margin:0;color:#6E6E73;font-size:14px;">${eventoInfo.location_name}</p>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
        `,
        attachments: pdfAttachments,
      });
      console.log('[Checkout Cartao] E-mail unificado enviado para:', emailDestinoFinal, '| ingressos:', pdfAttachments.length);
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
    if (body.ticket_type_id && cardReservedCount > 0) {
      await supabaseAdmin.rpc('release_ticket_stock', { p_ticket_type_id: body.ticket_type_id, p_quantity: cardReservedCount })
      notifyWaitlist({ eventId: body.event_id, ticketTypeId: body.ticket_type_id }).catch(e => console.error('[checkout] notifyWaitlist erro:', e))
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
