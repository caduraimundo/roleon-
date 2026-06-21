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
    const queryParam = (searchParams.get('q') ?? '').trim()

    const p_active = activeParam === 'true' ? true : activeParam === 'false' ? false : null

    const { data: coupons, error } = await supabaseAdmin
      .rpc('admin_search_coupons', {
        p_query: queryParam.length > 0 ? queryParam : null,
        p_active,
      })

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
      evento_titulo: c.evento_titulo ?? null,
      evento_data: c.evento_data ?? null,
      produtor_nome: c.produtor_nome ?? null,
      produtor_email: c.produtor_email ?? null,
    }))

    return NextResponse.json({ coupons: resultado })
  } catch (e) {
    console.error('[admin/coupons] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
