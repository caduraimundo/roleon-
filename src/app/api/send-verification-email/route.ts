import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { userId, email, name } = await req.json()
    if (!userId || !email) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await supabaseAdmin
      .from('profiles')
      .update({
        verification_token: token,
        verification_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId)

    const verifyUrl = `https://www.roleon.com.br/api/verify-email?token=${token}`

    const { error: resendError } = await resend.emails.send({
      from: 'Roleon <noreply@roleon.com.br>',
      to: email,
      subject: 'Confirme seu cadastro no Roleon',
      html: `
        <div style="font-family:'Noto Sans',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F7F7F7;">
          <div style="background:#fff;border-radius:16px;padding:32px;text-align:center;">
            <h1 style="color:#0EA5A0;font-size:22px;letter-spacing:3px;margin:0 0 24px;">roleon</h1>
            <h2 style="color:#1A1A1A;font-size:16px;font-weight:700;margin:0 0 12px;">Confirme seu e-mail</h2>
            <p style="color:#6E6E73;font-size:14px;margin:0 0 24px;">
              Falta pouco! Clique no botão abaixo para confirmar seu cadastro no Roleon e começar a descobrir os melhores eventos da sua região.
            </p>
            <a href="${verifyUrl}" style="display:inline-block;background:#0EA5A0;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;">
              Confirmar e-mail
            </a>
            <p style="color:#6E6E73;font-size:12px;margin:24px 0 0;">
              Se você não criou uma conta no Roleon, ignore este e-mail.
            </p>
          </div>
        </div>
      `,
    })

    if (resendError) {
      console.error('[send-verification-email] Resend retornou erro:', resendError)
      return NextResponse.json({ error: 'Falha ao enviar e-mail de verificação' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-verification-email]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
