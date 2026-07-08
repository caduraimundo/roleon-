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

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, avatar_initials, created_at')
      .eq('role', 'consumer')
      .order('created_at', { ascending: false })

    return NextResponse.json({ consumers: data ?? [] })
  } catch (err) {
    console.error('[consumers] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
