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

    const { data: deduped } = await supabaseAdmin.rpc('log_session_dedup', {
      p_user_id: user.id,
      p_ip: ip,
      p_user_agent: userAgent,
    })

    if (deduped) {
      return NextResponse.json({ ok: true, deduped: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[log-session] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
