import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function pagarmeAuth() {
  return `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()

  // Busca perfil para nome, email, cpf e recipient_id existente
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name, email, cpf, pagar_me_recipient_id, bank_code, bank_agency, bank_account, bank_account_digit, bank_account_type, bank_holder_name, pagar_me_bank_synced')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  // Salva dados no Supabase
  const { error: updateError } = await supabaseAdmin
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
      bank_holder_name: body.bank_holder_name || null,
    })
    .eq('id', user.id)

  if (updateError) return NextResponse.json({ error: 'Erro ao salvar dados bancários.' }, { status: 500 })

  // Cria ou atualiza recipient no Pagar.me
  try {
    const payload = {
      code: user.id,
      register_information: {
        name: profile.name,
        email: profile.email,
        document: profile.cpf,
        type: 'individual',
        mother_name: body.mother_name,
        birthdate: (() => { const [y,m,d] = body.birthdate.split('-'); return `${d}/${m}/${y}` })(),
        monthly_income: body.monthly_income,
        professional_occupation: body.professional_occupation,
        address: {
          street: body.address_street,
          complementary: body.address_complement || '',
          street_number: body.address_number,
          neighborhood: body.address_neighborhood,
          city: body.address_city,
          state: body.address_state,
          zip_code: body.address_cep,
          reference_point: body.address_reference || '',
        },
        phone_numbers: [{
          ddd: body.phone_ddd,
          number: body.phone_number,
          type: 'primary',
        }],
      },
      default_bank_account: {
        holder_name: body.bank_holder_name || profile.name,
        holder_type: 'individual',
        holder_document: profile.cpf,
        bank: body.bank_code,
        branch_number: body.bank_agency,
        ...(body.bank_agency_digit ? { branch_check_digit: body.bank_agency_digit } : {}),
        account_number: body.bank_account,
        account_check_digit: body.bank_account_digit,
        type: body.bank_account_type,
      },
      transfer_settings: {
        transfer_enabled: false,
        transfer_interval: 'daily',
        transfer_day: 0,
      },
    }

    const existingId = profile.pagar_me_recipient_id

    // Detecta se os dados bancários mudaram em relação ao que estava salvo localmente
    const bankDataChanged =
      profile.bank_code !== body.bank_code ||
      profile.bank_agency !== body.bank_agency ||
      profile.bank_account !== body.bank_account ||
      profile.bank_account_digit !== body.bank_account_digit ||
      profile.bank_account_type !== body.bank_account_type ||
      (profile.bank_holder_name ?? '') !== (body.bank_holder_name ?? '')

    // Se os dados bancários mudaram, marca como não sincronizado no update do Supabase abaixo
    // bankChanged = sem recipient OU dados bancários mudaram OU ainda não confirmado pelo Pagar.me
    const bankChanged = !existingId || bankDataChanged || !profile.pagar_me_bank_synced

    const url = bankChanged
      ? 'https://api.pagar.me/core/v5/recipients'
      : `https://api.pagar.me/core/v5/recipients/${existingId}`
    const method = bankChanged ? 'POST' : 'PUT'

    const pagarmeRes = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: pagarmeAuth() },
      body: JSON.stringify(payload),
    })

    if (!pagarmeRes.ok) {
      const errData = await pagarmeRes.json()
      console.error('[banking] Pagar.me error:', JSON.stringify(errData))
      return NextResponse.json({
        ok: true,
        warning: 'Dados salvos localmente, mas houve um erro ao atualizar no sistema de pagamentos. Tente novamente em instantes.',
      })
    }

    const pagarmeData = await pagarmeRes.json()

    await supabaseAdmin
      .from('profiles')
      .update({ pagar_me_recipient_id: pagarmeData.id, pagar_me_bank_synced: true })
      .eq('id', user.id)

  } catch (e) {
    console.error('[banking] Pagar.me exception:', e)
    return NextResponse.json({
      ok: true,
      warning: 'Dados salvos, mas houve um erro ao registrar no sistema de pagamentos.',
    })
  }

  return NextResponse.json({ ok: true })
}
