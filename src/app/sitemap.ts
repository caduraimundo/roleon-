import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from('events')
    .select('slug, created_at')
    .eq('status', 'active')

  const eventEntries: MetadataRoute.Sitemap = (data ?? []).map((ev) => ({
    url: `https://www.roleon.com.br/evento/${ev.slug}`,
    lastModified: ev.created_at ? new Date(ev.created_at as string) : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://www.roleon.com.br',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...eventEntries,
  ]
}
