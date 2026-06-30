import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'

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
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const body = await req.json()
    const { motivo } = body

    if (!motivo || !motivo.trim()) {
      return NextResponse.json({ error: 'Motivo é obrigatório' }, { status: 400 })
    }

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, status, producer_id')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    }

    if (event.status !== 'pending') {
      return NextResponse.json({ error: 'Evento não está pendente' }, { status: 400 })
    }

    await supabaseAdmin
      .from('events')
      .update({ status: 'rejected' })
      .eq('id', eventId)

    const { data: producer } = await supabaseAdmin
      .from('profiles')
      .select('email, name')
      .eq('id', event.producer_id)
      .single()

    if (producer?.email) {
      const { error: resendError } = await resend.emails.send({
        from: 'Roleon <noreply@roleon.com.br>',
        to: producer.email,
        subject: 'Atualização sobre seu evento no Roleon',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #1A1A1A; margin: 0 0 16px;">Seu evento precisa de ajustes</h2>
            <p style="color: #1A1A1A; font-size: 15px; margin: 0 0 12px;">
              Olá, ${producer.name || 'produtor'}!
            </p>
            <p style="color: #6E6E73; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
              Infelizmente seu evento não foi aprovado pelo seguinte motivo:
            </p>
            <div style="background: #FFF0F0; border-left: 4px solid #EF4444; padding: 12px; margin: 16px 0;">
              <p style="color: #1A1A1A; font-size: 14px; margin: 0;">${motivo}</p>
            </div>
            <p style="color: #6E6E73; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Você pode editar o evento e reenviar para aprovação.
            </p>
            <a href="https://www.roleon.com.br/produtor/painel"
               style="display: inline-block; background: #0EA5A0; color: #fff;
                      text-decoration: none; padding: 12px 24px; border-radius: 10px;
                      font-weight: 600; font-size: 14px;">
              Editar meus eventos
            </a>
          </div>
        `
      })
      if (resendError) {
        console.error('[reject] Resend retornou erro:', resendError)
        Sentry.captureException(new Error(`Resend falhou ao notificar rejeição de evento: ${resendError.message}`), {
          extra: { resendError, eventId, producerId: event.producer_id, motivo },
          tags: { fluxo: 'admin-reject-event' },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reject] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
