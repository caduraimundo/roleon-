import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { phone_ddd, phone_number } = await req.json()

  if (!phone_ddd || !phone_number) {
    return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 })
  }

  const { data: phoneOwner } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone_ddd', phone_ddd)
    .eq('phone_number', phone_number)
    .neq('id', user.id)
    .maybeSingle()

  if (phoneOwner) {
    return NextResponse.json(
      { error: 'Este número de telefone já está associado a outra conta. Se você acredita que isso é um engano, entre em contato com contato@roleon.com.br.' },
      { status: 409 }
    )
  }

  return NextResponse.json({ ok: true })
}
