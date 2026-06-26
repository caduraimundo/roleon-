import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const event_id = req.nextUrl.searchParams.get('event_id')
  const ticket_type_id = req.nextUrl.searchParams.get('ticket_type_id')
  if (!event_id) {
    return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('waitlist')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', event_id)

  query = ticket_type_id ? query.eq('ticket_type_id', ticket_type_id) : query.is('ticket_type_id', null)

  const { data } = await query.maybeSingle()

  return NextResponse.json({ inWaitlist: !!data })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const { event_id, ticket_type_id, email } = body

  if (!event_id) {
    return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })
  }

  const payload: Record<string, string> = {
    user_id: user.id,
    event_id,
    email: email ?? user.email ?? '',
  }
  if (ticket_type_id) payload.ticket_type_id = ticket_type_id

  const { error } = await supabaseAdmin.from('waitlist').insert(payload)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já está na fila de espera' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const { event_id, ticket_type_id } = body

  if (!event_id) {
    return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('waitlist')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', event_id)

  if (ticket_type_id) {
    query = query.eq('ticket_type_id', ticket_type_id)
  }

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
