import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const userAgent = req.headers.get('user-agent') ?? null

    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString()
    const { data: recent } = await supabaseAdmin
      .from('login_history')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', sixtySecondsAgo)
      .limit(1)
      .maybeSingle()

    if (recent) {
      return NextResponse.json({ ok: true, deduped: true })
    }

    await supabaseAdmin.from('login_history').insert({
      user_id: user.id,
      ip,
      user_agent: userAgent,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[log-session] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
