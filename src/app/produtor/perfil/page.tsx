'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#C8C8C8', flexShrink: 0 }}>
      <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function PerfilProdutorPage() {
  const [profile, setProfile] = useState<{
    name: string
    avatar_initials: string
    bank_account: string | null
    verified: boolean
    created_at: string
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

  const cardStyle: React.CSSProperties = {
    width: '100%', textAlign: 'left',
    background: '#fff', border: '0.5px solid #E5E5EA',
    borderRadius: 12, cursor: 'pointer',
    padding: '13px 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    display: 'flex', alignItems: 'center', gap: 12,
    fontFamily: "'Noto Sans', sans-serif",
    textDecoration: 'none',
  }

  const iconBoxStyle: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10,
    background: '#E6F7F6', color: '#0EA5A0', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
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
  ]

  return (
    <div style={{ background: '#F7F7F7', display: 'flex', justifyContent: 'center' }}>
    <div style={{
      width: '100%', maxWidth: 480,
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}>

        {/* Hero */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '28px 0 28px',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: '#0EA5A0', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, letterSpacing: -0.5,
          }}>
            {profile.avatar_initials || profile.name.slice(0,2).toUpperCase()}
          </div>

          {/* Nome centralizado de verdade + badge flutuante que nao afeta a centralizacao */}
          <div style={{
            marginTop: 12,
            position: 'relative',
            display: 'inline-flex',
          }}>
            <span style={{
              fontSize: 20, fontWeight: 700,
              color: '#1A1A1A', letterSpacing: -0.3,
            }}>{profile.name}</span>
            {profile.verified && (
              <span style={{
                position: 'absolute', left: '100%', top: '50%',
                transform: 'translateY(-50%)', marginLeft: 6,
                display: 'flex', alignItems: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="7" fill="#0EA5A0"/>
                  <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </div>

          <div style={{
            marginTop: 8, fontSize: 12,
            color: '#9A9A9A', fontWeight: 400,
          }}>
            Membro desde {formatMemberSince(profile.created_at)}
          </div>
        </div>

        {/* Todos os cards — gap uniforme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>

          {/* Menu principal */}
          {menuItems.map((item, i) => (
            <button key={i} onClick={item.onClick} style={cardStyle as React.CSSProperties}>
              <span style={iconBoxStyle}>{item.icon}</span>
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
              <IconChevronRight />
            </button>
          ))}

          {/* Política de privacidade */}
          <a href="/privacidade" style={cardStyle as React.CSSProperties}>
            <span style={iconBoxStyle}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M6 3.5h6l4 4V18a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 015 18V5A1.5 1.5 0 016 3.5z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M12 3.5v4h4M8 12h6M8 15h4"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{
              flex: 1, fontSize: 14.5, fontWeight: 600,
              color: '#1A1A1A', letterSpacing: -0.2,
            }}>Política de privacidade</span>
            <IconChevronRight />
          </a>

          {/* Termos do produtor */}
          <a href="/termos" style={cardStyle as React.CSSProperties}>
            <span style={iconBoxStyle}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M11 2.5L4 5.5v5c0 4.2 3 8.1 7 9 4-.9 7-4.8 7-9v-5L11 2.5z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M8.5 11l1.8 1.8 3.2-3.8" stroke="currentColor"
                  strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{
              flex: 1, fontSize: 14.5, fontWeight: 600,
              color: '#1A1A1A', letterSpacing: -0.2,
            }}>Termos do produtor</span>
            <IconChevronRight />
          </a>

          {/* Ir para o Roleon — card teal destacado, mesmo gap */}
          <div
            onClick={() => router.push('/')}
            style={{
              background: '#E8F7F6',
              border: '1px solid #C4EAE9',
              borderRadius: 12,
              padding: '13px 14px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer',
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
