'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import AuthSheet from '../../components/AuthSheet'
import { BackButton } from '../../components/BackButton'
import BottomNav from '../../components/BottomNav'

// ── Ícones ────────────────────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7"/>
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
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 6.5v9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.8"/>
    </svg>
  )
}


function IconGear() {
  return (
    <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.22 4.22l1.42 1.42M16.36 16.36l1.42 1.42M4.22 17.78l1.42-1.42M16.36 5.64l1.42-1.42"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconHelp() {
  return (
    <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8.5 8.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="11" cy="16" r="0.8" fill="currentColor"/>
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
  const [initials, setInitials] = useState('')
  const [role,     setRole]     = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setShowAuth(true); setLoading(false); return }
      const user = session.user
      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_initials, role')
        .eq('id', user.id)
        .maybeSingle()

      setName(profile?.name ?? '')
      setInitials(profile?.avatar_initials ?? '')
      setRole(profile?.role ?? '')
      setLoading(false)
    }
    load()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#F7F7F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto Sans', sans-serif", fontSize: 14, color: '#6E6E73',
      }}>
        Carregando...
      </div>
    )
  }

  if (showAuth) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F7F7F7' }}>
        <AuthSheet isOpen onClose={() => router.push('/')} />
      </div>
    )
  }

  const menuItems = [
    { icon: <IconTicket />,                      label: 'Meus ingressos',  onClick: () => router.push('/ingressos') },
    { icon: <IconPencilSquare color="#0EA5A0" />, label: 'Editar perfil',   onClick: () => router.push('/perfil/editar') },
    { icon: <IconGear />,                        label: 'Configurações',   onClick: () => router.push('/perfil/configuracoes') },
    { icon: <IconHelp />,                        label: 'Ajuda',           onClick: () => router.push('/perfil/ajuda') },
  ]

  return (
    <div style={{ background: '#F7F7F7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
    {/* Header - full width */}
    <div style={{
      display: 'flex', alignItems: 'center',
      height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 16, paddingRight: 16,
        background: '#fff',
        borderBottom: '0.5px solid #EFEFEF',
        position: 'relative',
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        <div style={{ position: 'absolute', left: 16 }}>
          <BackButton />
        </div>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 700, color: '#1A1A1A', letterSpacing: -0.5,
        }}>
          Perfil
        </div>
      </div>
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', flex: 1,
      fontFamily: "'Noto Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: '28px 20px 108px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Avatar + nome + subtítulo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>

          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: 20,
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

        {/* Cards de menu + Seja um produtor (gap uniforme 8px) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                background: '#fff',
                border: '0.5px solid #E5E5EA',
                borderRadius: 12,
                padding: '13px 14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: '#E6F7F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: '#0EA5A0',
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: '#1A1A1A' }}>
                {item.label}
              </div>
              <IconChevronRight />
            </button>
          ))}

          {role === 'admin' ? (
            /* admin: acessa o painel admin */
            <div
              onClick={() => router.push('/admin')}
              style={{
                background: '#fff',
                border: '0.5px solid #E5E5EA',
                borderRadius: 12,
                padding: '13px 14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: '#E6F7F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2.5L4 5.5v5c0 4.2 3 8.1 7 9 4-.9 7-4.8 7-9v-5L11 2.5z" stroke="#0EA5A0" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M8.5 11l1.8 1.8 3.2-3.8" stroke="#0EA5A0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#1A1A1A' }}>Painel Admin</div>
                <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 1 }}>Gerenciar o Roleon</div>
              </div>
            </div>
          ) : role === 'producer' ? (
            /* produtor ja cadastrado: acessa o painel */
            <div
              onClick={() => router.push('/produtor/painel')}
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
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M13 3l4 4-9 9-4.5 1 1-4.5 8.5-9.5z"
                    stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A7A76', letterSpacing: -0.2 }}>
                  Acessar portal do produtor
                </div>
                <div style={{ fontSize: 13, color: '#4AA8A4', marginTop: 2, fontWeight: 500 }}>
                  Painel de eventos e check-in
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="#0EA5A0" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ) : (
            /* consumidor: convida a ser produtor */
            <div
              onClick={() => router.push('/produtor')}
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
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M13 3l4 4-9 9-4.5 1 1-4.5 8.5-9.5z"
                    stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                </svg>
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
                <path d="M6 4l4 4-4 4" stroke="#0EA5A0" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}

        </div>{/* fim wrapper menu+produtor */}

        {/* Sair - pequeno e sutil */}
        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: 0, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: '#9A9A9A',
            padding: '6px 0', alignSelf: 'center',
            letterSpacing: 0.1, marginTop: 12,
          }}
        >
          Sair da conta
        </button>

      </div>

      <BottomNav activeTab="perfil" onTabChange={(tab) => {
        if (tab === 'explorar')  router.push('/')
        if (tab === 'ingressos') router.push('/ingressos')
      }} />
    </div>
    </div>
  )
}
