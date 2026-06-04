import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthProducer(req: NextRequest, event_id: string) {
  const bearerToken = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(bearerToken)
  if (!user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'producer' && profile?.role !== 'admin') return null

  if (profile?.role === 'producer') {
    const { data: evento } = await supabaseAdmin
      .from('events').select('id')
      .eq('id', event_id).eq('producer_id', user.id).maybeSingle()
    if (!evento) return null
  }

  return user
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: event_id } = await params
    const user = await getAuthProducer(req, event_id)
    if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { data: evento } = await supabaseAdmin
      .from('events').select('checkin_access_token').eq('id', event_id).maybeSingle()

    return NextResponse.json({ token: evento?.checkin_access_token ?? null })
  } catch (err) {
    console.error('[portaria-token GET] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: event_id } = await params
    const user = await getAuthProducer(req, event_id)
    if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const accessToken = crypto.randomUUID()

    const { error } = await supabaseAdmin
      .from('events').update({ checkin_access_token: accessToken }).eq('id', event_id)

    if (error) {
      console.error('[portaria-token POST] erro ao salvar:', error)
      return NextResponse.json({ error: 'Erro ao gerar token' }, { status: 500 })
    }

    return NextResponse.json({ token: accessToken })
  } catch (err) {
    console.error('[portaria-token POST] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
