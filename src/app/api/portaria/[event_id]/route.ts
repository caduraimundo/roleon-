import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ event_id: string }> }
) {
  try {
    const { event_id } = await params
    const accessToken = req.nextUrl.searchParams.get('token') ?? ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
    }

    const { data: evento } = await supabaseAdmin
      .from('events')
      .select('id, title, checkin_access_token')
      .eq('id', event_id)
      .eq('checkin_access_token', accessToken)
      .maybeSingle()

    if (!evento) {
      return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 403 })
    }

    const { data: tickets } = await supabaseAdmin
      .from('tickets')
      .select('status')
      .eq('event_id', event_id)
      .in('status', ['paid', 'used'])

    const total_sold = tickets?.length ?? 0
    const total_checkins = tickets?.filter(t => t.status === 'used').length ?? 0

    return NextResponse.json({ event_title: evento.title, total_sold, total_checkins })
  } catch (err) {
    console.error('[portaria GET] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
