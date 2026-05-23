import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  await supabaseAdmin
    .from('tickets')
    .update({ recipient_email: `deletado_${user.id}@roleon.com.br` })
    .eq('user_id', user.id)

  await supabaseAdmin
    .from('profiles')
    .update({
      name: 'Usuário Removido',
      email: `deletado_${user.id}@roleon.com.br`,
      avatar_initials: '??',
    })
    .eq('id', user.id)

  await supabaseAdmin
    .from('saved_events')
    .delete()
    .eq('user_id', user.id)

  await supabaseAdmin
    .from('waitlist')
    .delete()
    .eq('user_id', user.id)

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir conta' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
