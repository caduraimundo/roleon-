'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import AuthSheet from '../../components/AuthSheet'

// ── Ícones ────────────────────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12 4L7 10l5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="#C8C8C8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconTicket() {
  return (
    <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
      <path d="M3 8a2 2 0 012-2h12a2 2 0 012 2v1.5a1.5 1.5 0 000 3V14a2 2 0 01-2 2H5a2 2 0 01-2-2v-1.5a1.5 1.5 0 000-3V8z"
        stroke="#1A1A1A" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 6.5v9" stroke="#1A1A1A" strokeWidth="1.5" strokeDasharray="1.5 1.8"/>
    </svg>
  )
}

function IconCard() {
  return (
    <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2.5" stroke="#1A1A1A" strokeWidth="1.5"/>
      <path d="M2 9h18" stroke="#1A1A1A" strokeWidth="1.5"/>
      <path d="M6 14h4" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconGear() {
  return (
    <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="3" stroke="#1A1A1A" strokeWidth="1.5"/>
      <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.22 4.22l1.42 1.42M16.36 16.36l1.42 1.42M4.22 17.78l1.42-1.42M16.36 5.64l1.42-1.42"
        stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconHelp() {
  return (
    <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8.5" stroke="#1A1A1A" strokeWidth="1.5"/>
      <path d="M8.5 8.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="11" cy="16" r="0.8" fill="#1A1A1A"/>
    </svg>
  )
}

function IconPencilSquare({ color = '#1A1A1A' }: { color?: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
      <path d="M9 4H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-4"
        stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17.5 2.5l2 2-8.5 8.5H9v-2l8.5-8.5z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const router = useRouter()

  const [loading,  setLoading]  = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      if (!session) { setShowAuth(true); setLoading(false); return }
      const user = session.user
      setEmail(user.email ?? '')
      setName(
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split('@')[0] ??
        'Usuário'
      )
      setLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#F9F9F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto Sans', sans-serif", fontSize: 14, color: '#6E6E73',
      }}>
        Carregando...
      </div>
    )
  }

  if (showAuth) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F9F9F9' }}>
        <AuthSheet isOpen onClose={() => router.push('/')} />
      </div>
    )
  }

  const initials = getInitials(name)

  const menuItems = [
    { icon: <IconTicket />,                      label: 'Meus ingressos', onClick: () => {} },
    { icon: <IconCard />,                        label: 'Pagamentos',     onClick: () => {} },
    { icon: <IconPencilSquare />,                label: 'Editar perfil',  onClick: () => {} },
    { icon: <IconGear />,                        label: 'Configurações',  onClick: () => {} },
    { icon: <IconHelp />,                        label: 'Ajuda',          onClick: () => {} },
  ]

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 52,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 16, paddingRight: 16,
        background: '#fff',
        borderBottom: '0.5px solid #EFEFEF',
        position: 'relative',
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          style={{
            width: 36, height: 36, borderRadius: 999,
            background: '#F2F2F2', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1A1A1A', flexShrink: 0,
          }}
        >
          <IconArrowLeft />
        </button>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 16, fontWeight: 700, color: '#1A1A1A',
        }}>
          Perfil
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: '28px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Avatar + nome + subtítulo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>

          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: 999,
            background: '#0EA5A0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: '#fff',
            letterSpacing: -0.5, flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Nome */}
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', letterSpacing: -0.3 }}>
            {name}
          </div>

          {/* E-mail */}
          <div style={{ fontSize: 14, color: '#6E6E73', marginTop: -4 }}>
            {email}
          </div>
        </div>

        {/* Card principal */}
        <div style={{
          background: '#fff',
          border: '1px solid #EFEFEF',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {menuItems.map((item, i) => (
            <div key={item.label}>
              {i > 0 && <div style={{ height: '0.5px', background: '#F2F2F2', margin: '0 16px' }} />}
              <button
                onClick={item.onClick}
                style={{
                  width: '100%', background: 'none', border: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 13,
                  padding: '15px 16px', textAlign: 'left',
                }}
              >
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>
                  {item.label}
                </div>
                <IconChevronRight />
              </button>
            </div>
          ))}
        </div>

        {/* Card "Seja um produtor" */}
        <div style={{
          background: '#E8F7F6',
          border: '1px solid #C4EAE9',
          borderRadius: 16,
          padding: '18px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(14,165,160,0.12)',
          }}>
            <IconPencilSquare color="#0EA5A0" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A7A76', letterSpacing: -0.2 }}>
              Seja um produtor
            </div>
            <div style={{ fontSize: 13, color: '#4AA8A4', marginTop: 2, fontWeight: 500 }}>
              Publique seus rolês no Roleon.
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="#0EA5A0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Sair — pequeno e sutil */}
        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: 0, cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: '#9A9A9A',
            padding: '6px 0', alignSelf: 'center',
            letterSpacing: 0.1,
          }}
        >
          Sair da conta
        </button>
      </div>

      {/* Rodapé */}
      <div style={{
        textAlign: 'center',
        padding: 'calc(env(safe-area-inset-bottom, 0px) + 16px) 20px 20px',
        fontSize: 11, fontWeight: 600, color: '#CACACA',
        letterSpacing: 1.2, textTransform: 'uppercase',
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        Roleon · v0.1 · OP
      </div>
    </div>
  )
}
