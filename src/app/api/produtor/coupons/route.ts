import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthProducer(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'producer' && profile?.role !== 'admin') return null
  return user
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthProducer(req)
    if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const event_id = req.nextUrl.searchParams.get('event_id')
    if (!event_id) return NextResponse.json({ error: 'event_id obrigatorio' }, { status: 400 })

    const { data: event } = await supabaseAdmin
      .from('events').select('id').eq('id', event_id).eq('producer_id', user.id).maybeSingle()
    if (!event) return NextResponse.json({ error: 'Evento nao encontrado' }, { status: 404 })

    const { data: coupons, error } = await supabaseAdmin
      .from('coupons')
      .select('id, code, discount_type, discount_value, max_uses, uses_count, max_uses_per_user, expires_at, active, created_at')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Erro ao buscar cupons' }, { status: 500 })
    return NextResponse.json({ coupons: coupons ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthProducer(req)
    if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await req.json()
    const { event_id, code, discount_type, discount_value, max_uses, max_uses_per_user, expires_at } = body

    if (!event_id || !code || !discount_type || !discount_value) {
      return NextResponse.json({ error: 'Campos obrigatorios ausentes' }, { status: 400 })
    }

    const { data: event } = await supabaseAdmin
      .from('events').select('id').eq('id', event_id).eq('producer_id', user.id).maybeSingle()
    if (!event) return NextResponse.json({ error: 'Evento nao encontrado' }, { status: 404 })

    const normalizedCode = String(code).toUpperCase().trim().replace(/[^A-Z0-9]/g, '')
    if (normalizedCode.length < 3 || normalizedCode.length > 20) {
      return NextResponse.json({ error: 'Codigo deve ter entre 3 e 20 caracteres' }, { status: 400 })
    }

    const dv = Number(discount_value)
    if (isNaN(dv) || dv <= 0) {
      return NextResponse.json({ error: 'Valor do desconto invalido' }, { status: 400 })
    }
    if (discount_type === 'percent' && dv > 100) {
      return NextResponse.json({ error: 'Desconto percentual nao pode ser maior que 100%' }, { status: 400 })
    }

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: normalizedCode,
        discount_type,
        discount_value: dv,
        max_uses: max_uses ? Number(max_uses) : null,
        uses_count: 0,
        max_uses_per_user: max_uses_per_user ? Number(max_uses_per_user) : 1,
        expires_at: expires_at || null,
        event_id,
        created_by: user.id,
        active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ja existe um cupom com esse codigo' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Erro ao criar cupom' }, { status: 500 })
    }

    return NextResponse.json({ coupon }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
