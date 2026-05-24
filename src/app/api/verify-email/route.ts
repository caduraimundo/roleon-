import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect('https://www.roleon.com.br?verified=error')
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, verification_token_expires_at')
    .eq('verification_token', token)
    .single()

  if (!profile) {
    return NextResponse.redirect('https://www.roleon.com.br?verified=invalid')
  }

  const expired = new Date(profile.verification_token_expires_at) < new Date()
  if (expired) {
    return NextResponse.redirect('https://www.roleon.com.br?verified=expired')
  }

  await supabaseAdmin
    .from('profiles')
    .update({
      email_verified: true,
      verification_token: null,
      verification_token_expires_at: null,
    })
    .eq('id', profile.id)

  return NextResponse.redirect('https://www.roleon.com.br?verified=success')
}
