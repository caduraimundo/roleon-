import { NextRequest, NextResponse } from 'next/server'
import { notifyNearbyUsers } from '@/lib/notifyNearbyUsers'

export async function POST(req: NextRequest) {
  try {
    const { record } = await req.json()
    const eventId = record?.id
    if (!eventId) {
      return NextResponse.json({ error: 'event_id ausente' }, { status: 400 })
    }
    // fire-and-forget: falha no disparo nao quebra o fluxo
    notifyNearbyUsers(eventId).catch(console.error)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('approve-event erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
