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

  const body = await req.json()

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      mother_name: body.mother_name,
      birthdate: body.birthdate,
      monthly_income: body.monthly_income,
      professional_occupation: body.professional_occupation,
      phone_ddd: body.phone_ddd,
      phone_number: body.phone_number,
      address_cep: body.address_cep,
      address_street: body.address_street,
      address_number: body.address_number,
      address_complement: body.address_complement || null,
      address_neighborhood: body.address_neighborhood,
      address_city: body.address_city,
      address_state: body.address_state,
      address_reference: body.address_reference || null,
      bank_code: body.bank_code,
      bank_agency: body.bank_agency,
      bank_agency_digit: body.bank_agency_digit || null,
      bank_account: body.bank_account,
      bank_account_digit: body.bank_account_digit,
      bank_account_type: body.bank_account_type,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Erro ao salvar dados bancários.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
