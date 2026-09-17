import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'

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

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00-03:00`).getDay()
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seriesId } = await params

    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const { data: series } = await supabaseAdmin
      .from('event_series')
      .select('id, status, slug, title, description, genre, age_rating, location_name, location_lat, location_lng, cover_image, additional_info, is_free, is_unlimited, display_organizer_name, ticket_types_template, recurrence_day_of_week, recurrence_frequency, event_start_time, event_end_time, series_end_date, initial_batch_size, producer_id')
      .eq('id', seriesId)
      .single()

    if (!series) {
      return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
    }

    if (series.status !== 'pending') {
      return NextResponse.json({ error: 'Série não está pendente' }, { status: 400 })
    }

    // Calcula as datas das ocorrências iniciais
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    let firstOccurrence = addDays(todayStr, 1) // nunca gera pra hoje
    while (weekdayOf(firstOccurrence) !== series.recurrence_day_of_week) {
      firstOccurrence = addDays(firstOccurrence, 1)
    }

    const step = series.recurrence_frequency === 'biweekly' ? 14 : 7
    const occurrenceDates: string[] = []
    let candidate = firstOccurrence
    while (occurrenceDates.length < series.initial_batch_size) {
      if (candidate > series.series_end_date) break
      occurrenceDates.push(candidate)
      candidate = addDays(candidate, step)
    }

    if (occurrenceDates.length === 0) {
      return NextResponse.json(
        { error: 'Não foi possível gerar nenhuma data dentro do prazo da série' },
        { status: 400 }
      )
    }

    const crossesMidnight = series.event_end_time < series.event_start_time

    const ticketTemplate = Array.isArray(series.ticket_types_template) ? series.ticket_types_template : []
    const price = series.is_free
      ? 0
      : ticketTemplate.length > 0
        ? Math.min(...(ticketTemplate as { price: number }[]).map(t => Number(t.price) || 0).filter(p => p > 0))
        : 0

    const occurrenceRows = occurrenceDates.map((D) => {
      const endDateBase = crossesMidnight ? addDays(D, 1) : D
      return {
        title: series.title,
        slug: `${series.slug}-${D}`,
        description: series.description,
        event_date: `${D}T${series.event_start_time}:00-03:00`,
        event_end_date: `${endDateBase}T${series.event_end_time}:00-03:00`,
        location_name: series.location_name,
        location_lat: series.location_lat,
        location_lng: series.location_lng,
        genre: series.genre,
        age_rating: series.age_rating,
        additional_info: series.additional_info,
        cover_image: series.cover_image,
        display_organizer_name: series.display_organizer_name,
        attraction: null,
        is_free: series.is_free,
        is_unlimited: series.is_unlimited,
        series_id: series.id,
        producer_id: series.producer_id,
        status: 'active',
        price,
      }
    })

    const { data: insertedEvents, error: insertError } = await supabaseAdmin
      .from('events')
      .insert(occurrenceRows)
      .select('id')

    if (insertError || !insertedEvents) {
      console.error('[series approve] erro ao inserir ocorrências:', JSON.stringify(insertError))
      return NextResponse.json({ error: 'Erro ao gerar ocorrências: ' + (insertError?.message ?? 'sem dados') }, { status: 500 })
    }

    if (ticketTemplate.length > 0) {
      const ticketRows = insertedEvents.flatMap((ev: { id: string }) =>
        (ticketTemplate as { name: string; price: number; quantity: number | null }[]).map(t => ({
          event_id: ev.id,
          name: t.name,
          price: t.price,
          quantity: t.quantity ?? null,
        }))
      )

      const { error: ticketError } = await supabaseAdmin.from('ticket_types').insert(ticketRows)
      if (ticketError) {
        console.error('[series approve] erro ao inserir ticket_types:', JSON.stringify(ticketError))
        return NextResponse.json({ error: 'Ocorrências criadas, mas erro ao salvar tipos de ingresso' }, { status: 500 })
      }
    }

    await supabaseAdmin
      .from('event_series')
      .update({ status: 'active' })
      .eq('id', seriesId)

    const { data: producer } = await supabaseAdmin
      .from('profiles')
      .select('email, name')
      .eq('id', series.producer_id)
      .single()

    if (producer?.email) {
      const { error: resendError } = await resend.emails.send({
        from: 'Roleon <noreply@roleon.com.br>',
        to: producer.email,
        subject: 'Seu evento recorrente foi aprovado!',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #0EA5A0; margin: 0 0 16px;">Evento recorrente aprovado!</h2>
            <p style="color: #1A1A1A; font-size: 15px; margin: 0 0 12px;">
              Olá, ${producer.name || 'produtor'}!
            </p>
            <p style="color: #6E6E73; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Seu evento recorrente já está no ar no Roleon. Geramos ${occurrenceDates.length} data${occurrenceDates.length > 1 ? 's' : ''} inicial${occurrenceDates.length > 1 ? 'is' : ''} e elas já podem ser encontradas pelos participantes no mapa. As próximas datas você gera manualmente quando quiser.
            </p>
            <a href="https://www.roleon.com.br/produtor/painel"
               style="display: inline-block; background: #0EA5A0; color: #fff;
                      text-decoration: none; padding: 12px 24px; border-radius: 10px;
                      font-weight: 600; font-size: 14px;">
              Ver meus eventos
            </a>
          </div>
        `
      })
      if (resendError) {
        console.error('[series approve] Resend retornou erro:', resendError)
        Sentry.captureException(new Error(`Resend falhou ao notificar aprovação de série: ${resendError.message}`), {
          extra: { resendError, seriesId, producerId: series.producer_id },
          tags: { fluxo: 'admin-approve-series' },
        })
        await Sentry.flush(2000)
      }
    }

    return NextResponse.json({ ok: true, occurrences_generated: occurrenceDates.length, series_id: series.id })
  } catch (err) {
    console.error('[series approve] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
