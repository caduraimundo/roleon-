import { validateCPF } from '../../../../lib/cpf'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateName } from '../../../../lib/validateName'
import { getInitials } from '../../../../lib/getInitials'

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

  const { cpf, birthdate, name } = await req.json()

  const nameError = validateName(name)
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 })
  }

  if (!validateCPF(cpf)) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  if (!birthdate) {
    return NextResponse.json({ error: 'Data de nascimento obrigatória' }, { status: 400 })
  }

  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  if (age < 18) {
    return NextResponse.json({ error: 'Você precisa ter 18 anos ou mais para se cadastrar como produtor.' }, { status: 400 })
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
    .update({ role: 'producer', cpf: cpf.replace(/\D/g, ''), birthdate, name: name.trim(), avatar_initials: getInitials(name.trim()) })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
