import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

    const body = await req.json()
    const { motivo } = body
    if (!motivo?.trim()) return NextResponse.json({ error: 'Motivo é obrigatório' }, { status: 400 })

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, title, status, producer_id, profiles!producer_id(name, email)')
      .eq('id', eventId)
      .single()

    if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    if (event.status !== 'active') return NextResponse.json({ error: 'Evento não está ativo' }, { status: 400 })

    await supabaseAdmin.from('events').update({ status: 'cancelled' }).eq('id', eventId)

    const producer = (event as any).profiles
    if (producer?.email) {
      await resend.emails.send({
        from: 'Roleon <noreply@roleon.com.br>',
        to: producer.email,
        subject: 'Seu evento foi cancelado',
        html: `
          <div style="font-family:'Noto Sans',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
            <div style="background:#0EA5A0;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:20px">
              <span style="color:#fff;font-size:20px;font-weight:800">R</span>
            </div>
            <h2 style="font-size:20px;font-weight:700;color:#1A1A1A;margin:0 0 8px">Evento cancelado</h2>
            <p style="font-size:14px;color:#6E6E73;margin:0 0 20px">Olá, ${producer.name ?? 'produtor'}.</p>
            <p style="font-size:14px;color:#1A1A1A;margin:0 0 8px">Seu evento <strong>${event.title}</strong> foi cancelado pelo time Roleon.</p>
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 16px;margin:16px 0">
              <p style="font-size:12px;font-weight:600;color:#991B1B;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px">Motivo</p>
              <p style="font-size:14px;color:#1A1A1A;margin:0">${motivo}</p>
            </div>
            <p style="font-size:13px;color:#6E6E73;margin:16px 0 0">Em caso de dúvidas, entre em contato com o suporte.</p>
          </div>`,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cancel] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
