'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function PerfilProdutorPage() {
  const [profile, setProfile] = useState<{
    name: string
    avatar_initials: string
    bank_account: string | null
    verified: boolean
    created_at: string
  } | null>(null)
  const [email, setEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/produtor'); return }
      setEmail(user.email ?? '')
      const { data } = await supabase
        .from('profiles')
        .select('name, avatar_initials, bank_account, verified, created_at')
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
    router.push('/')
  }

  if (profile === null) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center',
        color: '#9A9A9A', fontSize: 14, fontFamily: "'Noto Sans', sans-serif" }}>
        Carregando...
      </div>
    )
  }

  const menuItems = [
    {
      label: 'Meus dados',
      badge: null,
      onClick: () => router.push('/produtor/perfil/meus-dados'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M4 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Conta bancária',
      badge: profile.bank_account ? 'Configurado' : null,
      onClick: () => router.push('/produtor/perfil/conta-bancaria'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M11 3.5L19 7.5H3L11 3.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          <path d="M4.5 7.5v8M9 7.5v8M13 7.5v8M17.5 7.5v8M3 18.5h16"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Ajuda',
      badge: null,
      onClick: () => router.push('/produtor/perfil/ajuda'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M9 8.6a2 2 0 013.8.8c0 1.3-1.8 1.6-1.8 2.9"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="11" cy="15" r="0.9" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: 'Configurações',
      badge: null,
      onClick: () => router.push('/produtor/perfil/configuracoes'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M11 3.5v1.2M11 17.3v1.2M3.5 11h1.2M17.3 11h1.2M5.8 5.8l.85.85M15.35 15.35l.85.85M5.8 16.2l.85-.85M15.35 6.65l.85-.85"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ background: '#F7F7F7', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
    <div style={{
      width: '100%', maxWidth: 480,
      fontFamily: "'Noto Sans', sans-serif",
      paddingBottom: 80,
    }}>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}>

        {/* Hero */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '20px 0 28px',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: '#0EA5A0', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, letterSpacing: -0.5,
          }}>
            {profile.avatar_initials || profile.name.slice(0,2).toUpperCase()}
          </div>

          {/* Nome + ícone verificado inline */}
          <div style={{
            marginTop: 14,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              fontSize: 21, fontWeight: 700,
              color: '#1A1A1A', letterSpacing: -0.4,
            }}>{profile.name}</span>
            {profile.verified && (
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <path d="M11 2l2.2 1.9 2.8.2.2 2.8L18 9l-1.8 2.1-.2 2.8-2.8.2L11 16l-2.2-1.9-2.8-.2-.2-2.8L4 9l1.8-2.1.2-2.8 2.8-.2L11 2z"
                  fill="#0EA5A0"/>
                <path d="M7.5 10.5l2 2 5-5" stroke="#fff"
                  strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>

          <div style={{
            marginTop: 6, fontSize: 13,
            color: '#6E6E73', fontWeight: 500,
          }}>{email}</div>

          <div style={{
            marginTop: 3, fontSize: 12,
            color: '#9A9A9A', fontWeight: 400,
          }}>
            Membro desde {formatMemberSince(profile.created_at)}
          </div>
        </div>

        {/* Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {menuItems.map((item, i) => (
            <button key={i} onClick={item.onClick} style={{
              width: '100%', textAlign: 'left',
              background: '#fff', border: '0.5px solid #E5E5EA',
              borderRadius: 12, cursor: 'pointer',
              padding: '13px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex', alignItems: 'center', gap: 12,
              fontFamily: "'Noto Sans', sans-serif",
            }}>
              <span style={{
                width: 34, height: 34, borderRadius: 10,
                background: '#E6F7F6', color: '#0EA5A0', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{item.icon}</span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 14.5, fontWeight: 600,
                  color: '#1A1A1A', letterSpacing: -0.2,
                }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700,
                    color: '#059669', background: '#ECFDF5',
                    padding: '2px 7px', borderRadius: 999,
                    letterSpacing: 0.2,
                  }}>{item.badge}</span>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                style={{ color: '#C8C8C8', flexShrink: 0 }}>
                <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor"
                  strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Ir para o Roleon — card teal destacado */}
        <div
          onClick={() => router.push('/')}
          style={{
            background: '#E8F7F6',
            border: '1px solid #C4EAE9',
            borderRadius: 12,
            padding: '13px 14px',
            display: 'flex', alignItems: 'center', gap: 14,
            cursor: 'pointer',
            marginBottom: 32,
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: '#0EA5A0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: '#fff',
          }}>
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <path d="M3.5 10.5L11 4l7.5 6.5" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.5 9v8.5a1 1 0 001 1h3.5v-4h2v4h3.5a1 1 0 001-1V9"
                stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A7A76', letterSpacing: -0.2 }}>
              Ir para o Roleon
            </div>
            <div style={{ fontSize: 13, color: '#4AA8A4', marginTop: 2, fontWeight: 500 }}>
              Explorar eventos e comprar ingressos
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="#0EA5A0" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Sair */}
        <button onClick={handleSignOut} style={{
          background: 'none', border: 0, cursor: 'pointer',
          fontFamily: "'Noto Sans', sans-serif",
          fontSize: 13, fontWeight: 600, color: '#9A9A9A',
          padding: '6px 0', alignSelf: 'center',
          letterSpacing: 0.1,
        }}>Sair da conta</button>

      </div>
    </div>
    </div>
  )
}
