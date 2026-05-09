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
      <path d="M6 4l4 4-4 4" stroke="#C0C0C0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconTicket() {
  return (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
      <path d="M3 8a2 2 0 012-2h12a2 2 0 012 2v1.5a1.5 1.5 0 000 3V14a2 2 0 01-2 2H5a2 2 0 01-2-2v-1.5a1.5 1.5 0 000-3V8z"
        stroke="#0EA5A0" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M14 6.5v9" stroke="#0EA5A0" strokeWidth="1.6" strokeDasharray="1.5 1.8"/>
    </svg>
  )
}

function IconHeart() {
  return (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
      <path d="M11 18.5s-6.5-4-6.5-9a3.8 3.8 0 016.5-2.7A3.8 3.8 0 0117.5 9.5c0 5-6.5 9-6.5 9z"
        stroke="#0EA5A0" strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  )
}

function IconPencil() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" stroke="#0EA5A0" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M11 6l3 3" stroke="#0EA5A0" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const router = useRouter()

  const [loading,   setLoading]   = useState(true)
  const [showAuth,  setShowAuth]  = useState(false)
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      if (!session) {
        setShowAuth(true)
        setLoading(false)
        return
      }
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

  const menuItems: MenuItem[] = [
    { icon: <IconTicket />,  label: 'Meus ingressos', onClick: () => {} },
    { icon: <IconHeart />,   label: 'Eventos salvos', onClick: () => {} },
    { icon: <IconPencil />,  label: 'Editar perfil',  onClick: () => {} },
  ]

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

  // Se não logado: mostra tela em branco com AuthSheet aberto
  if (showAuth) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F9F9F9' }}>
        <AuthSheet
          isOpen
          onClose={() => router.push('/')}
        />
      </div>
    )
  }

  const initials = getInitials(name)

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 16px 14px',
        background: '#F9F9F9',
        borderBottom: '0.5px solid #EFEFEF',
        position: 'relative',
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          style={{
            background: 'none', border: 0, cursor: 'pointer',
            color: '#1A1A1A', padding: 4,
            display: 'flex', alignItems: 'center',
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
      <div style={{ flex: 1, padding: '32px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Avatar + nome + email */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 999,
            background: '#0EA5A0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: '#fff',
            letterSpacing: -0.5,
          }}>
            {initials}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', letterSpacing: -0.3 }}>
              {name}
            </div>
            <div style={{ fontSize: 14, color: '#6E6E73', marginTop: 3 }}>
              {email}
            </div>
          </div>
        </div>

        {/* Card de opções */}
        <div style={{
          background: '#fff',
          border: '1px solid #EFEFEF',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          {menuItems.map((item, i) => (
            <div key={item.label}>
              {i > 0 && <div style={{ height: '0.5px', background: '#F2F2F2', margin: '0 16px' }} />}
              <button
                onClick={item.onClick}
                style={{
                  width: '100%', background: 'none', border: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '15px 16px', textAlign: 'left',
                }}
              >
                <div style={{ flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>
                  {item.label}
                </div>
                <IconChevronRight />
              </button>
            </div>
          ))}
        </div>

        {/* Sair */}
        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: 0, cursor: 'pointer',
            fontSize: 15, fontWeight: 600, color: '#FF3B30',
            padding: '10px 0', alignSelf: 'center',
          }}
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
