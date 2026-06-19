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
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()

    if (q.length < 2) {
      return NextResponse.json({ error: 'Digite pelo menos 2 caracteres' }, { status: 400 })
    }

    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select('id, title, event_date, status')
      .ilike('title', `%${q}%`)
      .order('event_date', { ascending: false })
      .limit(15)

    if (error) throw error

    return NextResponse.json({ events: events ?? [] })
  } catch (e) {
    console.error('[admin/events/search] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
