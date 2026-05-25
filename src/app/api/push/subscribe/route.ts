import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
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
