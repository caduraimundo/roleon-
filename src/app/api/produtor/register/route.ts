import { validateCPF } from '../../../lib/cpf'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { cpf, pix_key } = await req.json()

  if (!validateCPF(cpf)) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  if (!pix_key?.trim()) {
    return NextResponse.json({ error: 'Chave PIX obrigatória' }, { status: 400 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('cpf, role')
    .eq('id', user.id)
    .single()

  if (profile?.cpf) {
    return NextResponse.json(
      { error: 'CPF já cadastrado. Entre em contato com o suporte.' },
      { status: 409 }
    )
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'producer', cpf: cpf.replace(/\D/g, ''), pix_key })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
