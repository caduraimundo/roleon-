import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { computeOccurrenceDates, buildOccurrenceRows } from '@/lib/generateSeriesOccurrences'

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
      .select('id, status, slug, title, description, genre, age_rating, location_name, location_lat, location_lng, cover_image, additional_info, is_free, is_unlimited, display_organizer_name, ticket_types_template, recurrence_day_of_week, recurrence_frequency, event_start_time, event_end_time, initial_batch_size, producer_id')
      .eq('id', seriesId)
      .single()

    if (!series) {
      return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
    }

    if (series.status !== 'pending') {
      return NextResponse.json({ error: 'Série não está pendente' }, { status: 400 })
    }

    const occurrenceDates = computeOccurrenceDates(series)

    if (occurrenceDates.length === 0) {
      return NextResponse.json(
        { error: 'Não foi possível gerar nenhuma data dentro do prazo da série' },
        { status: 400 }
      )
    }

    const { eventRows: occurrenceRows, ticketTemplatesByIndex } = buildOccurrenceRows(series, occurrenceDates)

    const { data: insertedEvents, error: insertError } = await supabaseAdmin
      .from('events')
      .insert(occurrenceRows)
      .select('id')

    if (insertError || !insertedEvents) {
      console.error('[series approve] erro ao inserir ocorrências:', JSON.stringify(insertError))
      return NextResponse.json({ error: 'Erro ao gerar ocorrências: ' + (insertError?.message ?? 'sem dados') }, { status: 500 })
    }

    const ticketTemplate = ticketTemplatesByIndex[0] ?? []
    if (ticketTemplate.length > 0) {
      const ticketRows = insertedEvents.flatMap((ev: { id: string }, i: number) =>
        ticketTemplatesByIndex[i].map(t => ({
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
