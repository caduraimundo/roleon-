import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement, type JSXElementConstructor } from 'react'
import { TicketPDF } from '../../../../../components/TicketPDF'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)

  const weekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(d)

  const datePart = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(d)

  const timePart = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(d)

  const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${weekdayCapitalized}, ${datePart} - ${timePart}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select('id, event_id, user_id, ticket_type_name, price_paid, checkin_token, status, events(title, event_date, location_name)')
    .eq('id', id)
    .maybeSingle()

  if (error || !ticket) {
    return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 })
  }

  if (ticket.status === 'pending') {
    return NextResponse.json({ error: 'Ingresso ainda não confirmado' }, { status: 400 })
  }

  const evento = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticket.checkin_token)}`
  const eventDate = evento?.event_date ? formatEventDate(evento.event_date) : ''
  const ticketNumber = ticket.id.slice(-4).toUpperCase()

  const element = createElement(TicketPDF, {
    eventTitle: evento?.title ?? '',
    eventDate,
    locationName: evento?.location_name ?? '',
    ticketTypeName: ticket.ticket_type_name ?? '',
    pricePaid: ticket.price_paid ?? 0,
    ticketNumber,
    qrCodeUrl,
  }) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

  const buffer = await renderToBuffer(element)

  const rawTitle = evento?.title ?? 'roleon'
  const slug = rawTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ingresso-${slug}.pdf"`,
    },
  })
}
