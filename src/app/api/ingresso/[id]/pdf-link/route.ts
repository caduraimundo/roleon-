import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { redis } from '@/lib/ratelimit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TOKEN_TTL_SECONDS = 5 * 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const bearerToken = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(bearerToken)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (error || !ticket) {
    return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 })
  }

  if (ticket.user_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const token = crypto.randomBytes(32).toString('hex')
  await redis.set(`ticket-pdf-token:${token}`, ticket.id, { ex: TOKEN_TTL_SECONDS })

  return NextResponse.json({ url: `/api/ingresso/${id}/pdf?token=${token}` })
}
