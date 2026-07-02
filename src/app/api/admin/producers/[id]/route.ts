import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const { id } = await params

    const [profileRes, eventsRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, name, email, avatar_initials, verified, producer_disabled, pagar_me_recipient_id, cpf, created_at, bank_code, bank_account, bank_holder_name, phone_ddd, phone_number')
        .eq('id', id)
        .single(),
      supabaseAdmin
        .from('events')
        .select('id, title, status, event_date')
        .eq('producer_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    return NextResponse.json({ producer: profileRes.data, events: eventsRes.data ?? [] })
  } catch (err) {
    console.error('[producer-detail] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const allowed = ['verified', 'producer_disabled']
    const update: Record<string, boolean> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    await supabaseAdmin.from('profiles').update(update).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[producer-patch] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
