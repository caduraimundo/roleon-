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
    const isGoogleOnly = providers.length === 1 && providers[0] === 'google'

    return NextResponse.json({ provider: isGoogleOnly ? 'google' : 'email' })
  } catch {
    return NextResponse.json({ provider: 'unknown' })
  }
}
