import { validateCPF } from '../../../../lib/cpf'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateName } from '../../../../lib/validateName'
import { getInitials } from '../../../../lib/getInitials'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

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

  const { cpf, birthdate, name, phone_ddd, phone_number } = await req.json()

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

  if (!phone_ddd || phone_ddd.length !== 2) {
    return NextResponse.json({ error: 'DDD inválido' }, { status: 400 })
  }

  if (!phone_number || !phone_number.trim()) {
    return NextResponse.json({ error: 'Número de telefone obrigatório' }, { status: 400 })
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

  const cpfDigits = cpf.replace(/\D/g, '')

  const { data: cpfOwner } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('cpf', cpfDigits)
    .neq('id', user.id)
    .maybeSingle()

  if (cpfOwner) {
    return NextResponse.json(
      { error: 'Este CPF já está associado a outra conta. Se você acredita que isso é um engano, entre em contato com contato@roleon.com.br.' },
      { status: 409 }
    )
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

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'producer', cpf: cpf.replace(/\D/g, ''), birthdate, name: name.trim(), avatar_initials: getInitials(name.trim()), phone_ddd, phone_number })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  const { error: resendError } = await resend.emails.send({
    from: 'Roleon <noreply@roleon.com.br>',
    to: 'roleonbr@gmail.com',
    subject: 'Novo produtor cadastrado',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #0EA5A0; margin: 0 0 16px;">Novo produtor cadastrado</h2>
        <p style="color: #1A1A1A; font-size: 15px; margin: 0 0 12px;">
          <strong>${name.trim()}</strong>
        </p>
        <p style="color: #6E6E73; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          E-mail: ${user.email}<br/>
          Telefone: (${phone_ddd}) ${phone_number}
        </p>
        <a href="https://www.roleon.com.br/admin"
           style="display: inline-block; background: #0EA5A0; color: #fff;
                  text-decoration: none; padding: 12px 24px; border-radius: 10px;
                  font-weight: 600; font-size: 14px;">
          Ver no painel admin
        </a>
      </div>
    `
  })
  if (resendError) {
    console.error('[produtor/register] Resend retornou erro:', resendError)
    Sentry.captureException(new Error(`Resend falhou ao notificar novo produtor: ${resendError.message}`), {
      extra: { resendError, userId: user.id },
      tags: { fluxo: 'produtor-register-notify-admin' },
    })
    await Sentry.flush(2000)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
