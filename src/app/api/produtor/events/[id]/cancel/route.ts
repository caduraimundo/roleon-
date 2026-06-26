import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cancelEventAndProcessTickets } from '@/lib/cancelEvent'

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
      .from('events').select('id').eq('id', event_id).eq('producer_id', user.id).maybeSingle()
    if (!evento) return null
  }
  return user
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: event_id } = await params
    const user = await getAuthProducer(req, event_id)
    if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const result = await cancelEventAndProcessTickets({ event_id, triggered_by: 'producer' })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: result.failed === 0,
      event_id,
      refunded: result.refunded,
      cancelled: result.cancelled,
      failed: result.failed,
      errors: result.errors,
    })
  } catch (err) {
    console.error('[cancel-event POST] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
