'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// ── Ícones ────────────────────────────────────────────────────────────────────

function IconGoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuthSheetProps {
  isOpen: boolean
  onClose: () => void
}

const REDIRECT_ROUTES: Record<string, string> = {
  ingressos: '/ingressos',
  perfil:    '/perfil',
}

export default function AuthSheet({ isOpen, onClose }: AuthSheetProps) {
  const router = useRouter()
  const [isProducerContext, setIsProducerContext] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) return
      try {
        const tab = sessionStorage.getItem('auth-redirect-tab')
        if (tab && REDIRECT_ROUTES[tab]) {
          sessionStorage.removeItem('auth-redirect-tab')
          router.push(REDIRECT_ROUTES[tab])
        }
      } catch {}
    })
    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (!isOpen) {
      setIsProducerContext(false)
    } else {
      const flag = sessionStorage.getItem('openAuthAsProducer')
      if (flag) {
        sessionStorage.removeItem('openAuthAsProducer')
        setIsProducerContext(true)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleGoogle = async () => {
    setLoading(true)
    const next = isProducerContext
      ? '/produtor/pos-login'
      : sessionStorage.getItem('redirectAfterLogin') || '/'
    const callbackUrl = `${window.location.origin}/auth/callback?popup=1&next=${encodeURIComponent(next)}`

    let popup: Window | null = null

    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (data?.url) {
      popup = window.open(
        data.url,
        'google-login',
        'width=520,height=620,left=' + Math.round(window.screenX + (window.outerWidth - 520) / 2) + ',top=' + Math.round(window.screenY + (window.outerHeight - 620) / 2)
      )

      if (!popup) {
        window.location.href = data.url
      } else {
        setTimeout(() => {
          try {
            if (!popup!.closed && popup!.location.href === 'about:blank') {
              popup!.close()
              window.location.href = data.url
            }
          } catch {
            // Acesso a popup.location pode lançar erro de cross-origin se a navegação
            // de fato aconteceu (sinal de sucesso) — nesse caso, não faz nada.
          }
        }, 2500)
      }
    } else {
      setLoading(false)
    }

    const finalizeLogin = () => {
      window.removeEventListener('storage', handleStorageChange)
      popup?.close()
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle()
            onClose()
            window.location.href = profile?.role === 'admin' ? '/admin' : next
          } catch (_) {
            onClose()
            window.location.href = next
          }
        }
      })
    }
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'roleon_auth_success' && event.newValue) {
        try { localStorage.removeItem('roleon_auth_success') } catch (e) {}
        finalizeLogin()
      }
    }
    window.addEventListener('storage', handleStorageChange)
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 200,
          animation: 'fadeIn 200ms ease',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0,
        bottom: 0,
        background: '#fff',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        zIndex: 201,
        padding: '0 24px calc(env(safe-area-inset-bottom, 0px) + 48px)',
        animation: 'sheetUp 300ms cubic-bezier(.2,.9,.3,1)',
        fontFamily: "'Noto Sans', sans-serif",
        maxHeight: '92dvh',
        overflowY: 'auto',
      }}>
        <style>{`
          @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
          @keyframes sheetUp { from { transform: translateY(100%) } to { transform: none } }
        `}</style>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: '#D6D6D6' }} />
        </div>

        {/* Botão fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: 'absolute', top: 14, right: 20,
            width: 28, height: 28, borderRadius: 999,
            background: '#F0F0F0', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6E6E73',
          }}
        >
          <IconClose />
        </button>

        {isProducerContext && (
          <button
            onClick={() => setIsProducerContext(false)}
            aria-label="Voltar"
            style={{
              position: 'absolute', top: 14, left: 20,
              width: 28, height: 28, borderRadius: 999,
              background: '#F0F0F0', border: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6E6E73',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L5 9l6 5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Título */}
        <div style={{ marginTop: isProducerContext ? 32 : 8, marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1A1A1A', letterSpacing: -0.3 }}>
            {isProducerContext ? 'Acesse o Roleon Produtor' : 'Acesse o Roleon'}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6E6E73', lineHeight: 1.5 }}>
            {isProducerContext ? 'Gerencie seus eventos e ingressos' : 'Entre para comprar ingressos'}
          </p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', marginTop: 20,
            height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#fff', border: '1.5px solid #E8E8E8',
            borderRadius: 12, padding: '0 18px',
            fontSize: 14.5, fontWeight: 600, color: '#1A1A1A',
            fontFamily: "'Noto Sans', sans-serif",
            cursor: loading ? 'default' : 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <IconGoogleG />
          {loading ? 'Aguarde...' : 'Continuar com Google'}
        </button>

        {!isProducerContext && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setIsProducerContext(true)}
              style={{
                background: 'transparent', border: 0, cursor: 'pointer',
                color: '#6E6E73', fontSize: 12,
                fontFamily: "'Noto Sans', sans-serif",
                padding: 0, lineHeight: 1.4,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              É produtor? Acesse o portal
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor"
                  strokeWidth="1.6" strokeLinecap="round"
                  strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
