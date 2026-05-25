import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  'mailto:contato@roleon.com.br',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

function calcDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function notifyNearbyUsers(eventId: string) {
  try {
    // Buscar o evento aprovado
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, title, location_lat, location_lng')
      .eq('id', eventId)
      .single()

    if (eventError || !event) return
    if (!event.location_lat || !event.location_lng) return

    // Buscar usuários com notificação ativa e localização salva
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, location_lat, location_lng')
      .eq('notifications_nearby', true)
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)

    if (!profiles || profiles.length === 0) return

    // Filtrar usuários dentro de 10km
    const nearbyUserIds = profiles
      .filter((p) => {
        const dist = calcDistanceKm(
          p.location_lat!, p.location_lng!,
          event.location_lat, event.location_lng
        )
        return dist <= 10
      })
      .map((p) => p.id)

    if (nearbyUserIds.length === 0) return

    // Buscar assinaturas push desses usuários
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .in('user_id', nearbyUserIds)

    if (!subscriptions || subscriptions.length === 0) return

    // Disparar notificações (fire-and-forget - falha não quebra o fluxo)
    const payload = JSON.stringify({
      title: 'Novo role perto de voce',
      body: event.title,
      url: `/evento/${event.id}`,
    })

    await Promise.allSettled(
      subscriptions.map((s) =>
        webpush.sendNotification(s.subscription as any, payload)
      )
    )
  } catch (err) {
    console.error('notifyNearbyUsers erro:', err)
  }
}
