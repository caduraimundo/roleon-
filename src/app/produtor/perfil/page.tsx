'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
}

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function PerfilProdutorPage() {
  const [profile, setProfile] = useState<{
    name: string
    avatar_initials: string
    cpf: string
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
        .select('name, avatar_initials, cpf, bank_account, verified, created_at')
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
      label: 'Conta bancaria para repasse',
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
      label: 'Configuracoes',
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

          <div style={{
            marginTop: 14, fontSize: 21, fontWeight: 700,
            color: '#1A1A1A', letterSpacing: -0.4,
          }}>{profile.name}</div>

          {profile.verified ? (
            <div style={{
              marginTop: 7,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#ECFDF5', color: '#047857',
              fontSize: 12, fontWeight: 700, letterSpacing: 0.1,
              padding: '5px 11px 5px 9px', borderRadius: 999,
            }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.5 1.3 2 .1.1 2 1.3 1.5-1.3 1.5-.1 2-2 .1L7 11l-1.5-1.3-2-.1-.1-2L2.1 6l1.3-1.5.1-2 2-.1L7 1z"
                  fill="currentColor"/>
                <path d="M4.6 6.8l1.7 1.6L9.4 5" stroke="#fff"
                  strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Produtor verificado
            </div>
          ) : (
            <div style={{
              marginTop: 7,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#F4F4F4', color: '#6E6E73',
              fontSize: 12, fontWeight: 600, letterSpacing: 0.1,
              padding: '5px 11px', borderRadius: 999,
            }}>
              Em analise
            </div>
          )}

          <div style={{
            marginTop: 8, fontSize: 13,
            color: '#6E6E73', fontWeight: 500,
          }}>{email}</div>

          <div style={{
            marginTop: 4, fontSize: 12,
            color: '#9A9A9A', fontWeight: 400,
          }}>
            Membro desde {formatMemberSince(profile.created_at)}
          </div>
        </div>

        {/* Card de dados */}
        {profile.cpf && (
          <div style={{
            background: '#fff', border: '0.5px solid #E5E5EA',
            borderRadius: 12, padding: '14px 16px',
            marginBottom: 22,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase' as const, color: '#9A9A9A',
            }}>Meus dados</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#6E6E73', fontWeight: 500 }}>CPF</span>
              <span style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 600 }}>
                {formatCPF(profile.cpf)}
              </span>
            </div>
          </div>
        )}

        {/* Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
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

        {/* Ir para o Roleon */}
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

        {/* Sair */}
        <button onClick={handleSignOut} style={{
          background: 'none', border: 0, cursor: 'pointer',
          fontFamily: "'Noto Sans', sans-serif",
          fontSize: 13, fontWeight: 600, color: '#9A9A9A',
          padding: '6px 0', alignSelf: 'center',
          letterSpacing: 0.1, marginTop: 32,
        }}>Sair da conta</button>

      </div>
    </div>
    </div>
  )
}
