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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: 'Apenas admin pode editar eventos por aqui' }, { status: 403 })
  }

  const { id } = await params

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, producer_id, location_name, location_lat, location_lng')
    .eq('id', id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  if (event.producer_id !== null) {
    return NextResponse.json({ error: 'Este evento pertence a um produtor e não pode ser editado por aqui' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title,
    description,
    event_date,
    location_name,
    genres,
    age_rating,
    policies,
    is_unlimited,
    cover_image,
    display_organizer_name,
  } = body

  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = title
  if (description !== undefined) update.description = description
  if (event_date !== undefined) update.event_date = event_date
  if (genres !== undefined) update.genre = genres
  if (age_rating !== undefined) update.age_rating = age_rating
  if (policies !== undefined) update.policies = policies
  if (is_unlimited !== undefined) update.is_unlimited = is_unlimited
  if (cover_image !== undefined) update.cover_image = cover_image
  if (display_organizer_name !== undefined) update.display_organizer_name = display_organizer_name?.trim() || null
  if (location_name !== undefined) update.location_name = location_name

  const locationChanged = location_name !== undefined && location_name !== event.location_name
  const missingCoords = event.location_lat === null || event.location_lng === null

  if (locationChanged || missingCoords) {
    const addressToGeocode = location_name !== undefined ? location_name : event.location_name
    try {
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressToGeocode)}&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`
      )
      const geoData = await geoRes.json()
      if (geoData.status === 'OK' && geoData.results?.[0]) {
        update.location_lat = geoData.results[0].geometry.location.lat
        update.location_lng = geoData.results[0].geometry.location.lng
      } else {
        console.warn('[admin/events/edit] geocoding sem resultado para:', addressToGeocode, geoData.status)
      }
    } catch (geoErr) {
      console.error('[admin/events/edit] geocoding falhou:', geoErr)
    }
  }

  const { error } = await supabaseAdmin
    .from('events')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('[admin/events/edit] erro update:', JSON.stringify(error))
    return NextResponse.json({ error: 'Erro ao atualizar evento' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
