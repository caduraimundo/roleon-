import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { escapeHtml } from '../../../../../../lib/escapeHtml'

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
    const { id: seriesId } = await params

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

    const { data: series } = await supabaseAdmin
      .from('event_series')
      .select('id, status, producer_id')
      .eq('id', seriesId)
      .single()

    if (!series) {
      return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
    }

    if (series.status !== 'pending') {
      return NextResponse.json({ error: 'Série não está pendente' }, { status: 400 })
    }

    await supabaseAdmin
      .from('event_series')
      .update({ status: 'rejected' })
      .eq('id', seriesId)

    const { data: producer } = await supabaseAdmin
      .from('profiles')
      .select('email, name')
      .eq('id', series.producer_id)
      .single()

    if (producer?.email) {
      const { error: resendError } = await resend.emails.send({
        from: 'Roleon <noreply@roleon.com.br>',
        to: producer.email,
        subject: 'Atualização sobre seu evento no Roleon',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #1A1A1A; margin: 0 0 16px;">Seu evento recorrente precisa de ajustes</h2>
            <p style="color: #1A1A1A; font-size: 15px; margin: 0 0 12px;">
              Olá, ${producer.name || 'produtor'}!
            </p>
            <p style="color: #6E6E73; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
              Infelizmente sua série recorrente foi recusada pelo seguinte motivo:
            </p>
            <div style="background: #FFF0F0; border-left: 4px solid #EF4444; padding: 12px; margin: 16px 0;">
              <p style="color: #1A1A1A; font-size: 14px; margin: 0;">${escapeHtml(motivo)}</p>
            </div>
            <p style="color: #6E6E73; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Você pode editar o evento recorrente e reenviar para aprovação.
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
        console.error('[series reject] Resend retornou erro:', resendError)
        Sentry.captureException(new Error(`Resend falhou ao notificar rejeição de série: ${resendError.message}`), {
          extra: { resendError, seriesId, producerId: series.producer_id, motivo },
          tags: { fluxo: 'admin-reject-series' },
        })
        await Sentry.flush(2000)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[series reject] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
