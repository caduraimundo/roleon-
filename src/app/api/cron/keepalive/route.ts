import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { redis } from '@/lib/ratelimit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const timestamp = new Date().toISOString()

  let redisOk = true
  try {
    await redis.set('roleon:keepalive', timestamp)
  } catch (e) {
    redisOk = false
    console.error('[cron/keepalive] erro ao escrever no Redis:', e)
  }

  let supabaseOk = true
  try {
    await supabaseAdmin.from('profiles').select('id').limit(1)
  } catch (e) {
    supabaseOk = false
    console.error('[cron/keepalive] erro ao consultar o Supabase:', e)
  }

  return NextResponse.json({ ok: true, redis: redisOk, supabase: supabaseOk, timestamp })
}
