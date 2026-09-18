import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { generateSlug } from '@/lib/slug'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const WEEKDAY_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const FREQUENCY_LABELS: Record<string, string> = { weekly: 'Toda semana', biweekly: 'A cada 2 semanas' }

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, producer_disabled, name, pagar_me_recipient_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'producer') {
    return NextResponse.json({ error: 'Apenas produtores podem criar séries' }, { status: 403 })
  }
  if (profile?.producer_disabled) {
    return NextResponse.json({ error: 'Conta desativada. Entre em contato com o suporte.' }, { status: 403 })
  }

  try {
  const body = await req.json()
  const {
    title,
    description,
    genres,
    location_name,
    age_rating,
    cover_image,
    additional_info,
    is_free,
    is_unlimited,
    ticket_types,
    recurrence_day_of_week,
    recurrence_frequency,
    event_start_time,
    event_end_time,
    initial_batch_size,
  } = body

  for (const campo of ['title', 'location_name', 'recurrence_day_of_week', 'recurrence_frequency', 'event_start_time', 'event_end_time']) {
    if (body[campo] === undefined || body[campo] === null || body[campo] === '') {
      return NextResponse.json({ error: `Campo obrigatório: ${campo}` }, { status: 400 })
    }
  }

  if (!Array.isArray(genres) || genres.length < 1) {
    return NextResponse.json({ error: 'Selecione pelo menos uma categoria' }, { status: 400 })
  }

  if (![0, 1, 2, 3, 4, 5, 6].includes(Number(recurrence_day_of_week))) {
    return NextResponse.json({ error: 'Dia da semana inválido' }, { status: 400 })
  }

  if (!['weekly', 'biweekly'].includes(recurrence_frequency)) {
    return NextResponse.json({ error: 'Frequência inválida' }, { status: 400 })
  }

  const batchSize = Number(initial_batch_size)
  if (!Number.isInteger(batchSize) || batchSize < 2 || batchSize > 8) {
    return NextResponse.json({ error: 'Quantidade de datas iniciais precisa ser entre 2 e 8' }, { status: 400 })
  }

  const slug = generateSlug(title)
  const { data: slugExistente } = await supabaseAdmin
    .from('event_series')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (slugExistente) {
    return NextResponse.json(
      { error: 'Já existe uma série com esse nome. Escolha um título diferente.' },
      { status: 400 }
    )
  }

  if (!is_free) {
    const hasValidTicket = Array.isArray(ticket_types) &&
      ticket_types.some((t: { price: number }) => t.price > 0)
    if (!hasValidTicket) {
      return NextResponse.json(
        { error: 'Séries pagas precisam de ao menos um tipo de ingresso com preço maior que zero' },
        { status: 400 }
      )
    }
    if (!profile?.pagar_me_recipient_id) {
      return NextResponse.json(
        { error: 'Configure sua conta bancária antes de publicar uma série paga' },
        { status: 400 }
      )
    }
  }

  let geoLat: number | null = null
  let geoLng: number | null = null
  try {
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location_name)}&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`
    )
    const geoData = await geoRes.json()
    if (geoData.status === 'OK' && geoData.results?.[0]) {
      geoLat = geoData.results[0].geometry.location.lat
      geoLng = geoData.results[0].geometry.location.lng
    } else {
      console.warn('[produtor/series] geocoding sem resultado para:', location_name, geoData.status)
    }
  } catch (geoErr) {
    console.error('[produtor/series] geocoding falhou:', geoErr)
  }

  const { data: serie, error: serieError } = await supabaseAdmin
    .from('event_series')
    .insert({
      title,
      slug,
      description,
      genre: genres,
      age_rating: age_rating ?? 'Livre',
      location_name,
      location_lat: geoLat,
      location_lng: geoLng,
      cover_image: cover_image ?? null,
      additional_info: Array.isArray(additional_info) ? additional_info : [],
      is_free,
      is_unlimited: is_free ? is_unlimited : false,
      ticket_types_template: ticket_types ?? [],
      recurrence_day_of_week: Number(recurrence_day_of_week),
      recurrence_frequency,
      event_start_time,
      event_end_time,
      initial_batch_size: batchSize,
      producer_id: user.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (serieError?.code === '23505') {
    return NextResponse.json(
      { error: 'Já existe uma série com esse nome. Escolha um título diferente.' },
      { status: 400 }
    )
  }
  if (serieError || !serie) {
    console.error('[series] erro insert:', JSON.stringify(serieError))
    return NextResponse.json({ error: 'Erro ao criar série: ' + (serieError?.message ?? 'sem dados') }, { status: 500 })
  }

  const { error: resendError } = await resend.emails.send({
    from: 'Roleon <noreply@roleon.com.br>',
    to: 'roleonbr@gmail.com',
    subject: 'Nova série aguardando aprovação',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #0EA5A0; margin: 0 0 16px;">Nova série pendente</h2>
        <p style="color: #1A1A1A; font-size: 15px; margin: 0 0 12px;">
          <strong>${title}</strong>
        </p>
        <p style="color: #6E6E73; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Produtor: ${profile?.name || 'não informado'}<br/>
          Recorrência: ${WEEKDAY_LABELS[Number(recurrence_day_of_week)]}, ${FREQUENCY_LABELS[recurrence_frequency]}<br/>
          Horário: ${event_start_time} às ${event_end_time}<br/>
          Local: ${location_name}<br/>
          Datas geradas ao aprovar: ${batchSize}
        </p>
        <a href="https://www.roleon.com.br/admin"
           style="display: inline-block; background: #0EA5A0; color: #fff;
                  text-decoration: none; padding: 12px 24px; border-radius: 10px;
                  font-weight: 600; font-size: 14px;">
          Ver no painel admin
        </a>
      </div>
    `
  })
  if (resendError) {
    console.error('[produtor/series] Resend retornou erro:', resendError)
    Sentry.captureException(new Error(`Resend falhou ao notificar nova série pendente: ${resendError.message}`), {
      extra: { resendError, seriesId: serie.id },
      tags: { fluxo: 'produtor-create-series-notify-admin' },
    })
    await Sentry.flush(2000)
  }

  return NextResponse.json({ ok: true, series_id: serie.id }, { status: 200 })
  } catch (err) {
    console.error('[series] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
