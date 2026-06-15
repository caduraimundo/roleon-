import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas do portal do produtor que não precisam de verificação
const ROTAS_LIVRES = ['/produtor/desativado', '/produtor/cadastro']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Ignorar rotas livres (desativado e cadastro não precisam de check)
  if (ROTAS_LIVRES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Sem sessão: deixa a própria página tratar o redirect de login
  if (!user) return response

  const { data: profile } = await supabase
    .from('profiles')
    .select('producer_disabled')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.producer_disabled) {
    return NextResponse.redirect(new URL('/produtor/desativado', request.url))
  }

  return response
}

export const config = {
  // :path+ exige ao menos 1 segmento — cobre /produtor/painel, /produtor/eventos, etc.
  // exclui /produtor (login) que já tem seu próprio check
  matcher: ['/produtor/:path+'],
}
