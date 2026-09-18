import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateSlug } from '@/lib/slug'
import { computeOccurrenceDates, buildOccurrenceRows } from '@/lib/generateSeriesOccurrences'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Apenas admin pode criar séries por aqui' }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      description,
      genres,
      age_rating,
      location_name,
      is_unlimited,
      free_capacity,
      cover_image,
      additional_info,
      display_organizer_name,
      recurrence_day_of_week,
      recurrence_frequency,
      event_start_time,
      event_end_time,
      series_end_date,
      initial_batch_size,
    } = body

    for (const campo of ['title', 'location_name', 'recurrence_day_of_week', 'recurrence_frequency', 'event_start_time', 'event_end_time', 'series_end_date']) {
      if (body[campo] === undefined || body[campo] === null || body[campo] === '') {
        return NextResponse.json({ error: `Campo obrigatório: ${campo}` }, { status: 400 })
      }
    }

    if (!Array.isArray(genres) || genres.length < 1) {
      return NextResponse.json({ error: 'Selecione pelo menos uma categoria' }, { status: 400 })
    }

    const seriesEndDateObj = new Date(`${series_end_date}T00:00:00-03:00`)
    if (isNaN(seriesEndDateObj.getTime())) {
      return NextResponse.json({ error: 'Data final da série inválida' }, { status: 400 })
    }
    if (seriesEndDateObj < new Date()) {
      return NextResponse.json({ error: 'A data final da série precisa ser no futuro' }, { status: 400 })
    }

    const batchSize = Number(initial_batch_size)
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 8) {
      return NextResponse.json({ error: 'Quantidade de datas iniciais precisa ser entre 1 e 8' }, { status: 400 })
    }

    if (!is_unlimited) {
      const capacity = Number(free_capacity)
      if (!(capacity > 0)) {
        return NextResponse.json({ error: 'Informe a quantidade de vagas' }, { status: 400 })
      }
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
        console.warn('[admin/series] geocoding sem resultado para:', location_name, geoData.status)
      }
    } catch (geoErr) {
      console.error('[admin/series] geocoding falhou:', geoErr)
    }

    const ticketTypesTemplate = is_unlimited
      ? []
      : [{ name: 'Entrada gratuita', price: 0, quantity: parseInt(free_capacity) }]

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
        is_free: true,
        is_unlimited: !!is_unlimited,
        display_organizer_name: display_organizer_name?.trim() || null,
        recurrence_day_of_week: Number(recurrence_day_of_week),
        recurrence_frequency,
        event_start_time,
        event_end_time,
        series_end_date,
        initial_batch_size: batchSize,
        producer_id: null,
        status: 'active',
        ticket_types_template: ticketTypesTemplate,
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
      console.error('[admin/series] erro insert:', JSON.stringify(serieError))
      return NextResponse.json({ error: 'Erro ao criar série: ' + (serieError?.message ?? 'sem dados') }, { status: 500 })
    }

    const seriesForOccurrences = {
      id: serie.id,
      slug,
      title,
      description: description ?? null,
      genre: genres,
      age_rating: age_rating ?? 'Livre',
      location_name,
      location_lat: geoLat,
      location_lng: geoLng,
      cover_image: cover_image ?? null,
      additional_info: Array.isArray(additional_info) ? additional_info : [],
      is_free: true,
      is_unlimited: !!is_unlimited,
      display_organizer_name: display_organizer_name?.trim() || null,
      producer_id: null,
      event_start_time,
      event_end_time,
      recurrence_day_of_week: Number(recurrence_day_of_week),
      recurrence_frequency,
      series_end_date,
      initial_batch_size: batchSize,
      ticket_types_template: ticketTypesTemplate,
    }

    const occurrenceDates = computeOccurrenceDates(seriesForOccurrences)

    if (occurrenceDates.length === 0) {
      await supabaseAdmin.from('event_series').delete().eq('id', serie.id)
      return NextResponse.json(
        { error: 'Não foi possível gerar nenhuma data dentro do prazo da série' },
        { status: 400 }
      )
    }

    const { eventRows: occurrenceRows, ticketTemplatesByIndex } = buildOccurrenceRows(seriesForOccurrences, occurrenceDates)

    const { data: insertedEvents, error: insertError } = await supabaseAdmin
      .from('events')
      .insert(occurrenceRows)
      .select('id')

    if (insertError || !insertedEvents) {
      console.error('[admin/series] erro ao inserir ocorrências:', JSON.stringify(insertError))
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
        console.error('[admin/series] erro ao inserir ticket_types:', JSON.stringify(ticketError))
        return NextResponse.json({ error: 'Ocorrências criadas, mas erro ao salvar tipos de ingresso' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, series_id: serie.id, occurrences_generated: occurrenceDates.length }, { status: 200 })
  } catch (err) {
    console.error('[admin/series] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
