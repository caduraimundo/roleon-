import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, event_id, user_id, ticket_price } = body

    if (!code || !event_id) {
      return NextResponse.json({ valid: false, error: 'Cupom invalido' }, { status: 400 })
    }

    const normalizedCode = String(code).toUpperCase().trim()
    const price = Number(ticket_price) || 0

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('id, code, discount_type, discount_value, max_uses, uses_count, max_uses_per_user, expires_at, event_id, active')
      .eq('code', normalizedCode)
      .eq('active', true)
      .maybeSingle()

    if (error || !coupon) {
      return NextResponse.json({ valid: false, error: 'Cupom invalido' })
    }

    if (coupon.event_id && coupon.event_id !== event_id) {
      return NextResponse.json({ valid: false, error: 'Cupom invalido para este evento' })
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Cupom expirado' })
    }

    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: 'Cupom esgotado' })
    }

    if (user_id && coupon.max_uses_per_user) {
      const { count } = await supabaseAdmin
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('coupon_code', normalizedCode)
        .in('status', ['paid', 'pending', 'confirmed'])

      if ((count ?? 0) >= coupon.max_uses_per_user) {
        return NextResponse.json({ valid: false, error: 'Voce ja utilizou este cupom' })
      }
    }

    const discountValue = Number(coupon.discount_value)
    let discountAmount = 0
    if (coupon.discount_type === 'percent') {
      discountAmount = price * (discountValue / 100)
    } else {
      discountAmount = Math.min(discountValue, price)
    }
    discountAmount = Math.round(discountAmount * 100) / 100

    return NextResponse.json({
      valid: true,
      coupon_id: coupon.id,
      coupon_code: normalizedCode,
      discount_type: coupon.discount_type,
      discount_value: discountValue,
      discount_amount: discountAmount,
    })
  } catch {
    return NextResponse.json({ valid: false, error: 'Erro ao validar cupom' }, { status: 500 })
  }
}
