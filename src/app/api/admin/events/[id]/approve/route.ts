import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

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

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, status, location_name, producer_id')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    }

    if (event.status !== 'pending') {
      return NextResponse.json({ error: 'Evento não está pendente' }, { status: 400 })
    }

    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(event.location_name)}&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`
    const geoRes = await fetch(geoUrl)
    const geoData = await geoRes.json()
    let lat: number | null = null
    let lng: number | null = null
    if (geoData.status === 'OK' && geoData.results[0]) {
      lat = geoData.results[0].geometry.location.lat
      lng = geoData.results[0].geometry.location.lng
    }

    await supabaseAdmin
      .from('events')
      .update({ status: 'active', location_lat: lat, location_lng: lng })
      .eq('id', eventId)

    const { data: producer } = await supabaseAdmin
      .from('profiles')
      .select('email, name')
      .eq('id', event.producer_id)
      .single()

    if (producer?.email) {
      await resend.emails.send({
        from: 'Roleon <noreply@roleon.com.br>',
        to: producer.email,
        subject: 'Seu evento foi aprovado!',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #0EA5A0; margin: 0 0 16px;">Evento aprovado!</h2>
            <p style="color: #1A1A1A; font-size: 15px; margin: 0 0 12px;">
              Olá, ${producer.name || 'produtor'}!
            </p>
            <p style="color: #6E6E73; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Seu evento já está no ar no Roleon e pode ser encontrado pelos participantes no mapa.
            </p>
            <a href="https://www.roleon.com.br/produtor/painel"
               style="display: inline-block; background: #0EA5A0; color: #fff;
                      text-decoration: none; padding: 12px 24px; border-radius: 10px;
                      font-weight: 600; font-size: 14px;">
              Ver meus eventos
            </a>
          </div>
        `
      }).catch(err => console.error('[approve] erro e-mail:', err))
    }

    return NextResponse.json({ ok: true, geocoded: lat !== null })
  } catch (err) {
    console.error('[approve] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
