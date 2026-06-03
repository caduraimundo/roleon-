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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'producer') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id: eventId } = await params

    const { data: evento } = await supabaseAdmin
      .from('events')
      .select('id, title, event_date, location_name, status, producer_id')
      .eq('id', eventId)
      .single()

    if (!evento || evento.producer_id !== user.id) {
      return NextResponse.json({ error: 'Evento nao encontrado' }, { status: 404 })
    }

    const { data: tickets } = await supabaseAdmin
      .from('tickets')
      .select('id, price_paid, ticket_type_name, status, created_at')
      .eq('event_id', eventId)

    const all = tickets || []
    const sold = all.filter(t => t.status === 'paid' || t.status === 'used')
    const checkedIn = all.filter(t => t.status === 'used').length

    const totalRevenueBruto = sold.reduce((s, t) => s + Number(t.price_paid), 0)
    const totalRevenue = Math.round(totalRevenueBruto * 0.96 * 100) / 100
    const totalTickets = sold.length

    // Breakdown por tipo
    const typeMap: Record<string, { tickets: number; revenue: number }> = {}
    for (const t of sold) {
      const name = t.ticket_type_name ?? 'Ingresso Padrao'
      if (!typeMap[name]) typeMap[name] = { tickets: 0, revenue: 0 }
      typeMap[name].tickets += 1
      typeMap[name].revenue += Number(t.price_paid) * 0.96
    }

    const byType = Object.entries(typeMap)
      .map(([name, d]) => ({
        name,
        tickets: d.tickets,
        revenue: Math.round(d.revenue * 100) / 100,
        pct: totalTickets > 0 ? Math.round((d.tickets / totalTickets) * 100) : 0,
      }))
      .sort((a, b) => b.tickets - a.tickets)

    // Grafico: vendas por dia (todos os tempos)
    const dayMap: Record<string, { tickets: number; revenue: number }> = {}
    for (const t of sold) {
      const day = t.created_at.split('T')[0] ?? t.created_at.substring(0, 10)
      if (!dayMap[day]) dayMap[day] = { tickets: 0, revenue: 0 }
      dayMap[day].tickets += 1
      dayMap[day].revenue += Number(t.price_paid) * 0.96
    }

    const chart = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, d]) => {
        const [, m, dd] = day.split('-')
        return {
          label: `${parseInt(dd)}/${parseInt(m)}`,
          tickets: d.tickets,
          revenue: Math.round(d.revenue * 100) / 100,
        }
      })

    return NextResponse.json({
      event: {
        title: evento.title,
        event_date: evento.event_date,
        location_name: evento.location_name,
        status: evento.status,
      },
      totals: {
        revenue: totalRevenue,
        tickets: totalTickets,
        checked_in: checkedIn,
      },
      byType,
      chart,
    })
  } catch (err) {
    console.error('[evento-analytics] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
