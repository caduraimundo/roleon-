'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function PerfilPage() {
  const [profile, setProfile] = useState<{
    name: string; avatar_initials: string; cpf: string; pix_key: string
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
        .select('name, avatar_initials, cpf, pix_key')
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

  return (
    <div style={{
      minHeight: '100vh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      paddingBottom: 80,
    }}>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}>

        {/* Hero — avatar + nome + badge */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '20px 0 28px',
        }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: '#0EA5A0', color: '#fff',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28, fontWeight: 800, letterSpacing: -0.5,
            boxShadow: '0 8px 20px rgba(14,165,160,0.28)',
          }}>
            {profile.avatar_initials || profile.name.slice(0,2).toUpperCase()}
          </div>

          {/* Nome */}
          <div style={{
            marginTop: 14, fontSize: 21, fontWeight: 700,
            color: '#1A1A1A', letterSpacing: -0.4,
          }}>{profile.name}</div>

          {/* Badge Produtor verificado */}
          <div style={{
            marginTop: 7,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#E6F7F6', color: '#0EA5A0',
            fontSize: 12, fontWeight: 700, letterSpacing: 0.1,
            padding: '5px 11px 5px 9px', borderRadius: 999,
          }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.5 1.3 2 .1.1 2 1.3 1.5-1.3 1.5-.1 2-2 .1L7 11l-1.5-1.3-2-.1-.1-2L2.1 6l1.3-1.5.1-2 2-.1L7 1z"
                fill="currentColor"/>
              <path d="M4.6 6.8l1.7 1.6L9.4 5" stroke="#fff"
                strokeWidth="1.4" strokeLinecap="round"
                strokeLinejoin="round"/>
            </svg>
            Produtor verificado
          </div>

          {/* Email */}
          <div style={{
            marginTop: 10, fontSize: 13,
            color: '#6E6E73', fontWeight: 500,
          }}>{email}</div>
        </div>

        {/* Seção Conta */}
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
          textTransform: 'uppercase' as const, color: '#9A9A9A',
          marginBottom: 10,
        }}>Conta</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          {[
            { label: 'Dados do estabelecimento', onClick: undefined, icon: (
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M4 9.5V17a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0018 17V9.5"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M3.5 5h15l1 4.2a2.1 2.1 0 01-4.1.4 2.1 2.1 0 01-4.2 0 2.1 2.1 0 01-4.2 0 2.1 2.1 0 01-4.1-.4L3.5 5z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M9 18.5v-4h4v4"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              </svg>
            )},
            { label: 'Conta bancária para repasse', onClick: () => router.push('/produtor/perfil/conta-bancaria'), icon: (
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M11 3.5L19 7.5H3L11 3.5z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M4.5 7.5v8M9 7.5v8M13 7.5v8M17.5 7.5v8M3 18.5h16"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            )},
            { label: 'Documentos e verificação', onClick: undefined, icon: (
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M6 3.5h6l4 4V18a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 015 18V5A1.5 1.5 0 016 3.5z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M12 3.5v4h4M8 12h6M8 15h4"
                  stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )},
          ].map((item, i) => (
            <button key={i} onClick={(item as any).onClick} style={{
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
              <span style={{
                flex: 1, fontSize: 14.5, fontWeight: 600,
                color: '#1A1A1A', letterSpacing: -0.2,
              }}>{item.label}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                style={{ color: '#C8C8C8', flexShrink: 0 }}>
                <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor"
                  strokeWidth="1.6" strokeLinecap="round"
                  strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Seção Configurações */}
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
          textTransform: 'uppercase' as const, color: '#9A9A9A',
          marginBottom: 10,
        }}>Configurações</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          {[
            { label: 'Notificações', icon: (
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M6 9.5a5 5 0 0110 0v2.2c0 .7.3 1.4.7 1.9l.8 1H4.5l.8-1c.4-.5.7-1.2.7-1.9V9.5z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M9.2 17a1.8 1.8 0 003.6 0"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            )},
            { label: 'Ajuda e suporte', icon: (
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="7.5"
                  stroke="currentColor" strokeWidth="1.6"/>
                <path d="M9 8.6a2 2 0 013.8.8c0 1.3-1.8 1.6-1.8 2.9"
                  stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="11" cy="15" r="0.9" fill="currentColor"/>
              </svg>
            )},
            { label: 'Termos do produtor', icon: (
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M6 3.5h6l4 4V18a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 015 18V5A1.5 1.5 0 016 3.5z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M12 3.5v4h4M8 12h6M8 15h4"
                  stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )},
          ].map((item, i) => (
            <button key={i} style={{
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
              <span style={{
                flex: 1, fontSize: 14.5, fontWeight: 600,
                color: '#1A1A1A', letterSpacing: -0.2,
              }}>{item.label}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                style={{ color: '#C8C8C8', flexShrink: 0 }}>
                <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor"
                  strokeWidth="1.6" strokeLinecap="round"
                  strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Card de plano */}
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
          textTransform: 'uppercase' as const, color: '#9A9A9A',
          marginBottom: 10,
        }}>Plano</div>
        <div style={{
          background: '#E0F7F6', border: '1px solid #B6E7E4',
          borderRadius: 14, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14,
          marginBottom: 22,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: '#0B8985',
            }}>Plano atual</div>
            <div style={{
              marginTop: 3, fontSize: 17, fontWeight: 700,
              color: '#1A1A1A', letterSpacing: -0.3,
            }}>Roleon Básico</div>
            <div style={{
              marginTop: 3, fontSize: 12.5,
              color: '#6E6E73', fontWeight: 500,
            }}>Taxa de 4% por ingresso vendido</div>
          </div>
          <button style={{
            flexShrink: 0, padding: '9px 14px', borderRadius: 10,
            border: '1.4px solid #0EA5A0', background: 'transparent',
            color: '#0EA5A0', fontFamily: "'Noto Sans', sans-serif",
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>Ver planos</button>
        </div>

        {/* Ir para o Roleon consumidor */}
        <button
          onClick={() => router.push('/')}
          style={{
            width: '100%', padding: '13px 14px',
            background: '#fff', border: '0.5px solid #E5E5EA',
            borderRadius: 12, cursor: 'pointer',
            fontFamily: "'Noto Sans', sans-serif",
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span style={{
            width: 34, height: 34, borderRadius: 10,
            background: '#E6F7F6', color: '#0EA5A0', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <path d="M3.5 10.5L11 4l7.5 6.5" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.5 9v8.5a1 1 0 001 1h3.5v-4h2v4h3.5a1 1 0 001-1V9"
                stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span style={{
            flex: 1, fontSize: 14.5, fontWeight: 600,
            color: '#1A1A1A', letterSpacing: -0.2, textAlign: 'left',
          }}>Ir para o Roleon</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ color: '#C8C8C8', flexShrink: 0 }}>
            <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor"
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Sair da conta */}
        <button onClick={handleSignOut} style={{
          background: 'none', border: 0, cursor: 'pointer',
          fontFamily: "'Noto Sans', sans-serif",
          fontSize: 13, fontWeight: 600, color: '#9A9A9A',
          padding: '6px 0', alignSelf: 'center',
          letterSpacing: 0.1, marginTop: 32,
        }}>Sair da conta</button>

      </div>
    </div>
  )
}
