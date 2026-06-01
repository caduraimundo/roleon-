import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function GET(req: NextRequest) {
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
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const { data } = await supabaseAdmin
      .from('events')
      .select('id, title, cover_image, genre, price, is_free, location_name, event_date, producer_id, profiles!producer_id(name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    const events = (data ?? []).map((e: any) => ({
      ...e,
      producer_name: e.profiles?.name ?? '',
      producer_email: e.profiles?.email ?? '',
      profiles: undefined,
    }))

    return NextResponse.json({ events })
  } catch (err) {
    console.error('[fila] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
