'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function formatCpf(cpf: string) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9)
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<{
    name: string; cpf: string; pix_key: string
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/produtor'); return }
      const { data } = await supabase
        .from('profiles')
        .select('name, cpf, pix_key')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
    })()
  }, [router])

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/produtor')
  }

  if (profile === null) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center',
        color: '#9A9A9A', fontSize: 14, fontFamily: "'Noto Sans', sans-serif" }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A',
        margin: '0 0 24px', letterSpacing: -0.5,
        fontFamily: "'Noto Sans', sans-serif" }}>
        Meu perfil
      </h1>

      <div style={{ background: '#fff', borderRadius: 16,
        border: '1px solid #E8E8E8', padding: 20,
        marginBottom: 16, display: 'flex',
        flexDirection: 'column', gap: 16 }}>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A',
            letterSpacing: 0.6, textTransform: 'uppercase' as const,
            marginBottom: 4, fontFamily: "'Noto Sans', sans-serif" }}>
            Nome
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A',
            fontFamily: "'Noto Sans', sans-serif" }}>
            {profile.name}
          </div>
        </div>

        <div style={{ height: 1, background: '#F0F0F0' }}/>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A',
            letterSpacing: 0.6, textTransform: 'uppercase' as const,
            marginBottom: 4, fontFamily: "'Noto Sans', sans-serif" }}>
            CPF
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A',
            fontFamily: "'Noto Sans', sans-serif",
            fontVariantNumeric: 'tabular-nums' as const }}>
            {formatCpf(profile.cpf)}
          </div>
          <div style={{ fontSize: 12, color: '#9A9A9A', marginTop: 2,
            fontFamily: "'Noto Sans', sans-serif" }}>
            Não pode ser alterado
          </div>
        </div>

        <div style={{ height: 1, background: '#F0F0F0' }}/>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A',
            letterSpacing: 0.6, textTransform: 'uppercase' as const,
            marginBottom: 4, fontFamily: "'Noto Sans', sans-serif" }}>
            Chave PIX
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A',
            wordBreak: 'break-all' as const,
            fontFamily: "'Noto Sans', sans-serif" }}>
            {profile.pix_key}
          </div>
        </div>
      </div>

      <button onClick={handleSignOut} style={{
        width: '100%', padding: '14px 0',
        borderRadius: 12, border: '1.5px solid #E8E8E8',
        background: '#fff', color: '#D9534F',
        fontSize: 15, fontWeight: 700, cursor: 'pointer',
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        Sair da conta
      </button>
    </div>
  )
}
