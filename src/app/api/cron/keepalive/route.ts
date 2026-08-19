import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const timestamp = new Date().toISOString()

  try {
    await redis.set('roleon:keepalive', timestamp)
  } catch (e) {
    console.error('[cron/keepalive] erro ao escrever no Redis:', e)
  }

  return NextResponse.json({ ok: true, timestamp })
}
