import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ provider: 'unknown' })

    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const user = users?.users?.find((u: any) => u.email === email)

    if (!user) return NextResponse.json({ provider: 'none' })

    const providers = (user.identities ?? []).map((i: any) => i.provider)
    const hasGoogle = providers.includes('google')
    const hasEmail = providers.includes('email')
    // Considera conta Google se tem Google e nao tem senha propria definida
    // (hasEmail aparece quando o usuario definiu senha manualmente)
    const isGoogleOnly = hasGoogle && !hasEmail

    return NextResponse.json({ provider: isGoogleOnly ? 'google' : 'email' })
  } catch {
    return NextResponse.json({ provider: 'unknown' })
  }
}
