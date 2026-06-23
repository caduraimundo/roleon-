import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'producer' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas produtores ou admin podem fazer upload de capas' }, { status: 403 })
  }

  const { fileType } = await req.json()

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(fileType)) {
    return NextResponse.json({ error: 'Formato inválido. Use JPEG, PNG ou WebP' }, { status: 400 })
  }

  const ext = fileType.split('/')[1]
  const fileName = `${user.id}/${Date.now()}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from('event-covers')
    .createSignedUploadUrl(fileName)

  if (error || !data) {
    console.error('[upload-cover] erro ao gerar signed url:', JSON.stringify(error))
    return NextResponse.json({ error: 'Erro ao preparar upload: ' + (error?.message ?? 'sem dados') }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('event-covers')
    .getPublicUrl(fileName)

  return NextResponse.json({ ok: true, path: fileName, token: data.token, publicUrl })
}
