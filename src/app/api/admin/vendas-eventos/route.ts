import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    // filtro opcional: 'pendentes' (so eventos elegíveis sem repasse),
    // 'repassados' (ja repassados) ou omitido (todos os eventos pagos)
    const filtro = searchParams.get('filtro') ?? 'todos'

    let query = supabaseAdmin
      .from('events')
      .select('id, title, event_date, status, is_free, repasse_liberado_at, producer_id, profiles!events_producer_id_fkey(name)')
      .eq('is_free', false)
      .order('event_date', { ascending: false })

    if (filtro === 'pendentes') {
      const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      query = query
        .eq('status', 'active')
        .is('repasse_liberado_at', null)
        .lte('event_date', cutoff)
    } else if (filtro === 'repassados') {
      query = query.not('repasse_liberado_at', 'is', null)
    }

    const { data: events, error: eventsError } = await query

    if (eventsError) throw eventsError

    const eventIds = (events ?? []).map((e) => e.id)

    // Soma de tickets por evento
    const { data: ticketSums, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select('event_id, price_paid, producer_amount')
      .in('event_id', eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000'])
      .in('status', ['paid', 'used'])

    if (ticketsError) throw ticketsError

    const statsByEvent = new Map<string, { tickets: number; arrecadado: number; produtor: number }>()
    for (const t of ticketSums ?? []) {
      const cur = statsByEvent.get(t.event_id) ?? { tickets: 0, arrecadado: 0, produtor: 0 }
      cur.tickets++
      cur.arrecadado += Number(t.price_paid ?? 0)
      cur.produtor += Number(t.producer_amount ?? 0)
      statsByEvent.set(t.event_id, cur)
    }

    const resultado = (events ?? []).map((e: any) => {
      const stats = statsByEvent.get(e.id) ?? { tickets: 0, arrecadado: 0, produtor: 0 }
      // Split Roleon e fee Pagar.me derivados dos valores reais gravados em
      // cada ticket (price_paid e producer_amount), nao reimplementando a
      // tabela de taxas (calcFees) - evita o tipo de divergencia que ja
      // causou bug antes na tela de parcelamento. roleonFee = 4% sobre o
      // valor que o produtor recebe (mesma base usada no checkout); o
      // restante da diferenca e taxa do Pagar.me (processamento + antifraude
      // + percentual, que varia por metodo/parcelas).
      const splitRoleon = stats.produtor * 0.04
      const feePagarme = stats.arrecadado - stats.produtor - splitRoleon
      return {
        id: e.id,
        title: e.title,
        event_date: e.event_date,
        status: e.status,
        repasse_liberado_at: e.repasse_liberado_at,
        producer_name: e.profiles?.name ?? null,
        producer_id: e.producer_id,
        tickets_vendidos: stats.tickets,
        arrecadado_brl: stats.arrecadado.toFixed(2),
        repasse_produtor_brl: stats.produtor.toFixed(2),
        split_roleon_brl: splitRoleon.toFixed(2),
        fee_pagarme_brl: feePagarme.toFixed(2),
      }
    })

    return NextResponse.json({ events: resultado })
  } catch (e) {
    console.error('[vendas-eventos] erro:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
