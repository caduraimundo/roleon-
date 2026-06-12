import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, producer_id, status, event_date, location_name, is_free, title')
    .eq('id', id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  if (event.producer_id !== user.id) {
    return NextResponse.json({ error: 'Você não tem permissão para editar este evento' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title,
    description,
    event_date,
    location_name,
    location_lat,
    location_lng,
    genre,
    is_free,
    is_unlimited,
    cover_image,
    policies,
    ticket_types,
  } = body

  // Buscar tickets vendidos - usado em múltiplos pontos abaixo
  const { data: soldTickets } = await supabaseAdmin
    .from('tickets')
    .select('id, recipient_email, ticket_type_id')
    .eq('event_id', id)
    .in('status', ['paid', 'valid'])
  const hasSoldTickets = (soldTickets?.length ?? 0) > 0

  // Bloquear conversão pago → gratuito se já há ingressos vendidos
  if (is_free === true && (event as any).is_free === false && hasSoldTickets) {
    return NextResponse.json({
      error: 'Nao e possivel converter um evento pago em gratuito apos ingressos vendidos. Para isso, cancele o evento.',
    }, { status: 400 })
  }

  // Detectar mudancas que exigem notificacao
  const currentDateMs = (event as any).event_date
    ? new Date(((event as any).event_date as string).replace(' ', 'T')).getTime()
    : null
  const newDateMs = event_date ? new Date(String(event_date)).getTime() : null
  const dateChanged = event_date !== undefined && newDateMs !== currentDateMs
  const locationChanged = location_name !== undefined && location_name !== (event as any).location_name
  const shouldNotify = (dateChanged || locationChanged) && hasSoldTickets

  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = title
  if (description !== undefined) update.description = description
  if (event_date !== undefined) update.event_date = event_date
  if (location_name !== undefined) {
    update.location_name = location_name
    // Geocodifica o novo endereço para atualizar o pin no mapa
    try {
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location_name)}&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`
      )
      const geoData = await geoRes.json()
      if (geoData.status === 'OK' && geoData.results?.[0]) {
        update.location_lat = geoData.results[0].geometry.location.lat
        update.location_lng = geoData.results[0].geometry.location.lng
      } else {
        console.warn('[event-edit] geocoding sem resultado para:', location_name, geoData.status)
      }
    } catch (geoErr) {
      console.error('[event-edit] geocoding falhou:', geoErr)
    }
  }
  if (location_lat !== undefined && location_lat !== null) update.location_lat = location_lat
  if (location_lng !== undefined && location_lng !== null) update.location_lng = location_lng
  if (genre !== undefined) update.genre = genre
  if (is_free !== undefined) update.is_free = is_free
  if (is_unlimited !== undefined) update.is_unlimited = is_unlimited
  if (cover_image !== undefined) update.cover_image = cover_image
  if (policies !== undefined) update.policies = policies

  // Recalcula price com base nos ticket_types enviados
  if (is_free !== undefined || ticket_types !== undefined) {
    const isFreeVal = is_free ?? false
    const tickets = Array.isArray(ticket_types) ? ticket_types as { price: number }[] : []
    const validPrices = tickets.map(t => Number(t.price) || 0).filter(p => p > 0)
    update.price = isFreeVal ? 0 : validPrices.length > 0 ? Math.min(...validPrices) : 0
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabaseAdmin
      .from('events')
      .update(update)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar evento' }, { status: 500 })
    }
  }

  if (Array.isArray(ticket_types) && ticket_types.length > 0) {
    const soldTypeIds = [
      ...new Set(
        (soldTickets ?? [])
          .map(t => (t as any).ticket_type_id)
          .filter(Boolean) as string[]
      ),
    ]
    const deleteBuilder = supabaseAdmin.from('ticket_types').delete().eq('event_id', id)
    const { error: deleteError } = await (
      soldTypeIds.length > 0
        ? deleteBuilder.not('id', 'in', `(${soldTypeIds.join(',')})`)
        : deleteBuilder
    )

    if (deleteError) {
      return NextResponse.json({ error: 'Erro ao atualizar tipos de ingresso' }, { status: 500 })
    }

    const rows = (ticket_types as { name: string; price: number; quantity: number | null }[]).map(t => ({
      event_id: id,
      name: t.name,
      price: t.price,
      quantity: t.quantity ?? null,
    }))

    const { error: insertError } = await supabaseAdmin.from('ticket_types').insert(rows)
    if (insertError) {
      return NextResponse.json({ error: 'Erro ao salvar tipos de ingresso' }, { status: 500 })
    }
  }

  if (shouldNotify) {
    const uniqueEmails = [
      ...new Set(
        (soldTickets ?? [])
          .map(t => (t as any).recipient_email)
          .filter(Boolean) as string[]
      ),
    ]
    if (uniqueEmails.length > 0) {
      const eventTitle = (update.title as string) ?? (event as any).title ?? 'Evento'
      const changes: string[] = []
      if (dateChanged && event_date) {
        const dateObj = new Date(String(event_date))
        const formatted = dateObj.toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          timeZone: 'America/Sao_Paulo',
        })
        const time = dateObj.toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
        })
        changes.push(`Nova data: ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}, ${time}`)
      }
      if (locationChanged && location_name) {
        changes.push(`Novo local: ${location_name}`)
      }
      const changesHtml = changes
        .map(c => `<p style="margin:0 0 8px;color:#1A1A1A;font-size:14px;font-family:'Noto Sans',Arial,sans-serif;">• ${c}</p>`)
        .join('')
      await Promise.allSettled(
        uniqueEmails.map(email =>
          resend.emails.send({
            from: 'Roleon <noreply@roleon.com.br>',
            to: email,
            subject: `Atualização: ${eventTitle}`,
            html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F7F7F7;font-family:'Noto Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:#0EA5A0;padding:24px;text-align:center;">
        <p style="margin:0;color:#fff;font-size:20px;font-weight:700;font-family:'Noto Sans',Arial,sans-serif;">Atualização do Evento</p>
      </td></tr>
      <tr><td style="padding:32px 24px;">
        <p style="margin:0 0 16px;color:#1A1A1A;font-size:16px;font-weight:600;font-family:'Noto Sans',Arial,sans-serif;">${eventTitle}</p>
        <p style="margin:0 0 16px;color:#555;font-size:14px;font-family:'Noto Sans',Arial,sans-serif;">O evento foi atualizado com as seguintes mudanças:</p>
        ${changesHtml}
        <p style="margin:16px 0 0;color:#888;font-size:12px;font-family:'Noto Sans',Arial,sans-serif;">Caso tenha dúvidas, entre em contato com o organizador.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
          })
        )
      )
    }
  }

  return NextResponse.json({ ok: true })
}
