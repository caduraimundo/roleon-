import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processarRepasseEventos } from '@/lib/repasse'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const body = await req.json()
    const eventId = body?.event_id as string | undefined

    if (!eventId) {
      return NextResponse.json({ error: 'event_id obrigatorio' }, { status: 400 })
    }

    // Busca o evento e valida que ele e elegivel para repasse manual:
    // - nao gratuito
    // - status active
    // - ja passou do D+3
    // O botao NAO permite pular a trava de D+3 (protege contra chargeback).
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, producer_id, title, event_date, is_free, status, repasse_liberado_at')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento nao encontrado' }, { status: 404 })
    }

    if (event.is_free) {
      return NextResponse.json({ error: 'Evento gratuito nao tem repasse' }, { status: 400 })
    }

    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Evento nao esta ativo' }, { status: 400 })
    }

    if (event.event_date > cutoff) {
      return NextResponse.json({
        error: 'Evento ainda dentro do prazo D+3 - aguarde o prazo de seguranca anti-chargeback',
      }, { status: 400 })
    }

    if (event.repasse_liberado_at) {
      return NextResponse.json({
        error: 'Repasse ja foi processado para este evento',
        repasse_liberado_at: event.repasse_liberado_at,
      }, { status: 400 })
    }

    const results = await processarRepasseEventos(supabaseAdmin, [eventId])

    if (!results.length) {
      return NextResponse.json({ error: 'Produtor sem recipient_id configurado no Pagar.me' }, { status: 400 })
    }

    const result = results[0]

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      event_id: eventId,
      transferred: result.transferred,
      expected_brl: (result.expectedCents / 100).toFixed(2),
      transfer_id: result.transferId ?? null,
    })
  } catch (e) {
    console.error('[force-repasse] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
