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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'producer') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const period = req.nextUrl.searchParams.get('period') || '30d'
    const now = new Date()
    let startDate: Date

    if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const { data: events } = await supabaseAdmin
      .from('events')
      .select('id, title, event_date, status')
      .eq('producer_id', user.id)

    const eventIds = (events || []).map((e: { id: string }) => e.id)

    if (eventIds.length === 0) {
      return NextResponse.json({
        totals: { revenue: 0, tickets: 0, avgTicket: 0 },
        chart: [],
        events: [],
      })
    }

    const { data: filteredTickets } = await supabaseAdmin
      .from('tickets')
      .select('price_paid, event_id, created_at')
      .in('event_id', eventIds)
      .in('status', ['paid', 'used'])
      .gte('created_at', startDate.toISOString())

    const ft = (filteredTickets || []) as {
      price_paid: string; event_id: string; created_at: string
    }[]

    const { data: allTickets } = await supabaseAdmin
      .from('tickets')
      .select('price_paid, event_id')
      .in('event_id', eventIds)
      .in('status', ['paid', 'used'])

    const at = (allTickets || []) as { price_paid: string; event_id: string }[]

    const totalRevenueBruto = ft.reduce((sum, t) => sum + Number(t.price_paid), 0)
    const totalRevenue = totalRevenueBruto * 0.96
    const totalTickets = ft.length
    const avgTicket = totalTickets > 0 ? totalRevenue / totalTickets : 0

    const chartData: { label: string; tickets: number; revenue: number }[] = []

    if (period === '7d') {
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now)
        dayStart.setDate(dayStart.getDate() - i)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 1)
        const dayTickets = ft.filter(t => {
          const d = new Date(t.created_at)
          return d >= dayStart && d < dayEnd
        })
        chartData.push({
          label: `${dayStart.getDate()}/${dayStart.getMonth() + 1}`,
          tickets: dayTickets.length,
          revenue: Math.round(
            dayTickets.reduce((s, t) => s + Number(t.price_paid) * 0.96, 0) * 100
          ) / 100,
        })
      }
    } else if (period === '30d') {
      const bucketDays = 6
      for (let bucket = 4; bucket >= 0; bucket--) {
        const bucketEnd = new Date(
          now.getTime() - bucket * bucketDays * 24 * 60 * 60 * 1000
        )
        const bucketStart = new Date(
          now.getTime() - (bucket + 1) * bucketDays * 24 * 60 * 60 * 1000
        )
        const bucketTickets = ft.filter(t => {
          const d = new Date(t.created_at)
          return d >= bucketStart && d < bucketEnd
        })
        chartData.push({
          label: `Sem ${5 - bucket}`,
          tickets: bucketTickets.length,
          revenue: Math.round(
            bucketTickets.reduce((s, t) => s + Number(t.price_paid) * 0.96, 0) * 100
          ) / 100,
        })
      }
    } else {
      const monthNames = [
        'jan','fev','mar','abr','mai','jun',
        'jul','ago','set','out','nov','dez',
      ]
      for (let m = 0; m <= now.getMonth(); m++) {
        const monthStart = new Date(now.getFullYear(), m, 1)
        const monthEnd = new Date(now.getFullYear(), m + 1, 1)
        const monthTickets = ft.filter(t => {
          const d = new Date(t.created_at)
          return d >= monthStart && d < monthEnd
        })
        chartData.push({
          label: monthNames[m],
          tickets: monthTickets.length,
          revenue: Math.round(
            monthTickets.reduce((s, t) => s + Number(t.price_paid) * 0.96, 0) * 100
          ) / 100,
        })
      }
    }

    type EventRow = { id: string; title: string; event_date: string; status: string }
    const eventsRanking = (events as EventRow[] || [])
      .filter(e => e.status === 'active')
      .map(e => {
        const eventTickets = at.filter(t => t.event_id === e.id)
        const eventRevenue = Math.round(
          eventTickets.reduce((s, t) => s + Number(t.price_paid) * 0.96, 0) * 100
        ) / 100
        return {
          id: e.id,
          title: e.title,
          event_date: e.event_date,
          tickets: eventTickets.length,
          revenue: eventRevenue,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    return NextResponse.json({
      totals: {
        revenue: Math.round(totalRevenue * 100) / 100,
        tickets: totalTickets,
        avgTicket: Math.round(avgTicket * 100) / 100,
      },
      chart: chartData,
      events: eventsRanking,
    })
  } catch (err) {
    console.error('[analytics] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
