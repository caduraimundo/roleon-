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

    const { data, error } = await supabaseAdmin
      .rpc('check_email_provider', { p_email: email })

    if (error) return NextResponse.json({ provider: 'unknown' })

    return NextResponse.json({ provider: data })
  } catch {
    return NextResponse.json({ provider: 'unknown' })
  }
}
