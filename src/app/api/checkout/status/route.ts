import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order_id')
  if (!orderId) {
    return NextResponse.json({ error: 'order_id obrigatório' }, { status: 400 })
  }

  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('status')
    .eq('order_id', orderId)

  if (!tickets || tickets.length === 0) {
    return NextResponse.json({ status: 'pending' })
  }

  const statuses = tickets.map(t => t.status as string)
  if (statuses.every(s => s === 'paid')) {
    return NextResponse.json({ status: 'paid' })
  }
  if (statuses.some(s => s === 'expired')) {
    return NextResponse.json({ status: 'expired' })
  }
  return NextResponse.json({ status: 'pending' })
}
