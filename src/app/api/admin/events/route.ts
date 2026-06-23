import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
      return NextResponse.json({ error: 'Apenas admin pode criar eventos por aqui' }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      description,
      event_date,
      location_name,
      location_lat,
      location_lng,
      genres,
      age_rating,
      policies,
      is_unlimited,
      cover_image,
      display_organizer_name,
    } = body

    for (const campo of ['title', 'event_date', 'location_name']) {
      if (!body[campo]) {
        return NextResponse.json({ error: `Campo obrigatório: ${campo}` }, { status: 400 })
      }
    }

    if (!Array.isArray(genres) || genres.length < 1) {
      return NextResponse.json({ error: 'Selecione pelo menos um gênero' }, { status: 400 })
    }

    let geoLat: number | null = location_lat ?? null
    let geoLng: number | null = location_lng ?? null
    try {
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location_name)}&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`
      )
      const geoData = await geoRes.json()
      if (geoData.status === 'OK' && geoData.results?.[0]) {
        geoLat = geoData.results[0].geometry.location.lat
        geoLng = geoData.results[0].geometry.location.lng
      } else {
        console.warn('[admin/events] geocoding sem resultado para:', location_name, geoData.status)
      }
    } catch (geoErr) {
      console.error('[admin/events] geocoding falhou:', geoErr)
    }

    const { data: evento, error: eventError } = await supabaseAdmin
      .from('events')
      .insert({
        title,
        description,
        event_date,
        location_name,
        location_lat: geoLat,
        location_lng: geoLng,
        genre: genres,
        age_rating: age_rating ?? 'Livre',
        policies: Array.isArray(policies) ? policies : [],
        is_free: true,
        is_unlimited: !!is_unlimited,
        cover_image: cover_image ?? null,
        producer_id: null,
        status: 'active',
        price: 0,
        display_organizer_name: display_organizer_name?.trim() || null,
      })
      .select('id')
      .single()

    if (eventError || !evento) {
      console.error('[admin/events] erro insert:', JSON.stringify(eventError))
      return NextResponse.json({ error: 'Erro ao criar evento: ' + (eventError?.message ?? 'sem dados') }, { status: 500 })
    }

    return NextResponse.json({ ok: true, event_id: evento.id }, { status: 200 })
  } catch (err) {
    console.error('[admin/events] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
