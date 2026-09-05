import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { subscription } = await req.json()
    if (!subscription) {
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
    }

    // Upsert: se já existe assinatura desse usuário, atualiza
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        { user_id: user.id, subscription },
        { onConflict: 'user_id' }
      )

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('push/subscribe erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
