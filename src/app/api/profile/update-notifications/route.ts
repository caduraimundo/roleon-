import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_FIELDS = ['notifications_nearby', 'notifications_reminders'] as const
type AllowedField = typeof ALLOWED_FIELDS[number]

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { field, value } = body as { field: string; value: unknown }

  if (!ALLOWED_FIELDS.includes(field as AllowedField) || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'Campo inválido' }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ [field]: value })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
