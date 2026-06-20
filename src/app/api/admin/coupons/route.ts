import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const activeParam = searchParams.get('active')

    let query = supabaseAdmin
      .from('coupons')
      .select(`
        id, code, discount_type, discount_value, max_uses, uses_count,
        max_uses_per_user, expires_at, active, created_at,
        event:event_id (title, event_date),
        creator:created_by (name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (activeParam === 'true') query = query.eq('active', true)
    if (activeParam === 'false') query = query.eq('active', false)

    const { data: coupons, error } = await query
    if (error) throw error

    const resultado = (coupons ?? []).map((c: any) => ({
      id: c.id,
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      max_uses: c.max_uses,
      uses_count: c.uses_count,
      max_uses_per_user: c.max_uses_per_user,
      expires_at: c.expires_at,
      active: c.active,
      created_at: c.created_at,
      evento_titulo: c.event?.title ?? null,
      evento_data: c.event?.event_date ?? null,
      produtor_nome: c.creator?.name ?? null,
      produtor_email: c.creator?.email ?? null,
    }))

    return NextResponse.json({ coupons: resultado })
  } catch (e) {
    console.error('[admin/coupons] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
