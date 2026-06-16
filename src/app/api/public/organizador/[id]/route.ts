import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [profileRes, countRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('name, avatar_initials, verified, created_at')
        .eq('id', id)
        .eq('role', 'producer')
        .single(),
      supabaseAdmin
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('producer_id', id)
        .eq('status', 'active'),
    ])

    if (!profileRes.data) {
      return NextResponse.json({ error: 'Organizador não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      name:           profileRes.data.name,
      avatar_initials: profileRes.data.avatar_initials,
      verified:       profileRes.data.verified ?? false,
      member_since:   profileRes.data.created_at,
      event_count:    countRes.count ?? 0,
    })
  } catch (err) {
    console.error('[organizador-public] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
