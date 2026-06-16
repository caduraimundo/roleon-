import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authRatelimit } from '@/lib/ratelimit'

export async function GET(request: Request) {
  const ip = (request.headers as Headers).get('x-forwarded-for') ?? '127.0.0.1'
  const { success } = await authRatelimit.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
      { status: 429 }
    )
  }

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Recovery via token_hash (reset de senha)
  if (token_hash && type === 'recovery') {
    await supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
    return NextResponse.redirect(`${origin}/auth/reset-password`)
  }

  // Confirmação de e-mail via code
  if (code) {
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code)

    // Admin no fluxo redirect vai direto para /admin (popup é tratado pelo SIGNED_IN do parent)
    if (sessionData.session?.user && searchParams.get('popup') !== '1') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionData.session.user.id)
        .maybeSingle()
      if (profile?.role === 'admin') {
        return new NextResponse(
          `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>window.location.replace(${JSON.stringify(`${origin}/admin`)})</script></body></html>`,
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        )
      }
    }
  }

  const next = searchParams.get('next') || '/'
  const isPopup = searchParams.get('popup') === '1'
  const destination = `${origin}${next}`

  if (isPopup) {
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
if (window.opener) {
  window.opener.postMessage({ type: 'ROLEON_AUTH_SUCCESS' }, ${JSON.stringify(origin)});
  window.close();
} else {
  window.location.replace(${JSON.stringify(destination)});
}
</script>
</body>
</html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>window.location.replace(${JSON.stringify(destination)})</script>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}
