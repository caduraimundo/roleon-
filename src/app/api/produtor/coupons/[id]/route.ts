import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'producer' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { active } = await req.json()

    const { data: coupon } = await supabaseAdmin
      .from('coupons').select('id, created_by, locked_by_admin').eq('id', id).maybeSingle()
    if (!coupon) return NextResponse.json({ error: 'Cupom nao encontrado' }, { status: 404 })
    if (profile?.role !== 'admin' && coupon.created_by !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    if (profile?.role !== 'admin' && coupon.locked_by_admin) {
      return NextResponse.json({ error: 'Este cupom foi desativado pelo administrador e so pode ser reativado por ele' }, { status: 403 })
    }

    const updatePayload: { active: boolean; locked_by_admin?: boolean } = { active }
    if (profile?.role === 'admin') {
      updatePayload.locked_by_admin = !active
    }

    const { data: updated, error } = await supabaseAdmin
      .from('coupons').update(updatePayload).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: 'Erro ao atualizar cupom' }, { status: 500 })

    return NextResponse.json({ coupon: updated })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
