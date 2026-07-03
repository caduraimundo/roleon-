import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getInitials } from '../../../../lib/getInitials'
import { validateName } from '../../../../lib/validateName'

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

  const body = await req.json()
  const { name } = body as { name: string }

  const nameError = validateName(name)
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 })
  }

  const trimmedName = name.trim()
  const avatar_initials = getInitials(trimmedName)

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ name: trimmedName, avatar_initials })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }

  revalidatePath('/perfil')
  revalidatePath('/perfil/editar')

  return NextResponse.json({ name: trimmedName, avatar_initials })
}
