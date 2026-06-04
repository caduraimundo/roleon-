import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { performRefund } from '@/lib/refund'

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

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('id, order_id, status')
      .eq('event_id', event_id)
      .in('status', ['paid', 'valid'])

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar ingressos' }, { status: 500 })
    }

    const results = { refunded: 0, cancelled: 0, failed: 0, errors: [] as string[] }

    for (const ticket of tickets ?? []) {
      if (ticket.status === 'valid' && !ticket.order_id) {
        const { error: updateErr } = await supabaseAdmin
          .from('tickets')
          .update({ status: 'cancelled' })
          .eq('id', ticket.id)

        if (!updateErr) {
          void supabaseAdmin.from('ticket_audit_log').insert({
            ticket_id: ticket.id,
            old_status: ticket.status,
            new_status: 'cancelled',
            triggered_by: 'producer',
            metadata: { reason: 'cancelamento', payment_method: 'free' },
          })
          results.cancelled++
        } else {
          results.failed++
          results.errors.push(ticket.id)
        }
        continue
      }

      const result = await performRefund({
        ticket_id: ticket.id,
        reason: 'cancelamento',
        triggered_by: 'producer',
        send_email: true,
      })

      if (result.success) {
        results.refunded++
      } else {
        results.failed++
        results.errors.push(ticket.id)
        console.error(`[cancel-event] falhou ticket ${ticket.id}:`, result.error)
      }
    }

    await supabaseAdmin
      .from('events')
      .update({ status: 'cancelled' })
      .eq('id', event_id)

    return NextResponse.json({
      success: true,
      event_id,
      refunded: results.refunded,
      cancelled: results.cancelled,
      failed: results.failed,
      errors: results.errors,
    })
  } catch (err) {
    console.error('[cancel-event POST] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
