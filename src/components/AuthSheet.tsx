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

function IconEye({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M3 3l14 14M8.5 8.7A2 2 0 0011.3 11.5M6.5 5.8C4.6 7 3.2 8.8 2 10c2 3 5 5 8 5 1.4 0 2.7-.4 3.8-1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10.5 5.1C13.5 5.5 16 7.5 18 10c-.7.9-1.5 1.7-2.4 2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path d="M2 10c2-4 5-6 8-6s6 2 8 6c-2 4-5 6-8 6s-6-2-8-6z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuthSheetProps {
  isOpen: boolean
  onClose: () => void
}

type Mode = 'signin' | 'signup' | 'forgot' | 'producer'

// ── Estilos base ──────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', background: '#F6F6F6', border: 'none',
  borderRadius: 10, padding: '13px 14px', fontSize: 14.5,
  fontFamily: "'Noto Sans', sans-serif", color: '#1A1A1A',
  outline: 'none', boxSizing: 'border-box',
}

// ── Componente ────────────────────────────────────────────────────────────────

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials':  'E-mail ou senha incorretos',
  'Email not confirmed':        'Confirme seu e-mail antes de entrar.',
  'email_not_confirmed':        'Confirme seu e-mail antes de entrar.',
  'User already registered':    'E-mail já cadastrado. Tente fazer login.',
  'already registered':         'E-mail já cadastrado. Tente fazer login.',
  'user_already_exists':        'E-mail já cadastrado. Tente fazer login.',
}

function translateError(msg: string, status?: number): string {
  if (status === 429 || msg.includes('429') || msg.includes('Too Many Requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  }
  for (const [en, pt] of Object.entries(ERROR_MAP)) {
    if (msg.includes(en)) return pt
  }
  return 'Algo deu errado. Tente novamente.'
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

const REDIRECT_ROUTES: Record<string, string> = {
  ingressos: '/ingressos',
  perfil:    '/perfil',
}

export default function AuthSheet({ isOpen, onClose }: AuthSheetProps) {
  const router = useRouter()
  const [mode,         setMode]         = useState<Mode>('signin')
  const [forgotOrigin, setForgotOrigin] = useState<'signin' | 'producer'>('signin')
  const [signupContext, setSignupContext] = useState<'' | 'producer'>('')
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPwd,      setShowPwd]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [emailError,   setEmailError]   = useState<string | null>(null)
  const [passwordError,setPasswordError]= useState<string | null>(null)
  const [resetSent,    setResetSent]    = useState(false)

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
      setMode('signin')
      setForgotOrigin('signin')
      setSignupContext('')
    } else {
      const flag = sessionStorage.getItem('openAuthAsProducer')
      if (flag) {
        sessionStorage.removeItem('openAuthAsProducer')
        setMode('producer')
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const reset = () => { setError(null); setEmailError(null); setPasswordError(null); setResetSent(false) }

  const handleGoogle = async () => {
    reset()
    const next = (mode === 'producer' || (mode === 'signup' && signupContext === 'producer'))
      ? '/produtor/pos-login'
      : sessionStorage.getItem('redirectAfterLogin') || '/'
    const callbackUrl = `${window.location.origin}/auth/callback?popup=1&next=${encodeURIComponent(next)}`

    // Abre o popup ANTES do await para nao ser bloqueado pelo mobile
    const popup = window.open(
      '',
      'google-login',
      'width=520,height=620,left=' + Math.round(window.screenX + (window.outerWidth - 520) / 2) + ',top=' + Math.round(window.screenY + (window.outerHeight - 620) / 2)
    )

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

    if (data?.url && popup) {
      popup.location.href = data.url
    } else if (data?.url) {
      // Fallback: se popup foi bloqueado, redireciona normalmente
      window.location.href = data.url
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'ROLEON_AUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage)
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
    }
    window.addEventListener('message', handleMessage)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()

    // Validações inline
    let hasError = false
    if (!isValidEmail(email)) {
      setEmailError('Digite um e-mail válido')
      hasError = true
    }
    if (mode === 'signup' && password.length < 8) {
      setPasswordError('Mínimo 8 caracteres')
      hasError = true
    }
    if (hasError) return

    setLoading(true)
    if (mode === 'forgot') {
      // Verifica se a conta usa apenas Google antes de enviar o link
      try {
        const check = await fetch('/api/auth/check-provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const { provider } = await check.json()
        if (provider === 'google') {
          setLoading(false)
          setError('Essa conta usa login com Google. Entre pelo botão "Continuar com Google".')
          return
        }
      } catch {
        // Se a verificacao falhar, deixa prosseguir normalmente
      }

      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/callback',
      })
      setLoading(false)
      if (err) { setError(translateError(err.message)); return }
      setResetSent(true)
      return
    }
    if (mode === 'producer') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) { setError(translateError(err.message, err.status)); return }
      onClose()
      router.push('/produtor/pos-login')
      return
    }
    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) { setError(translateError(err.message, err.status)); return }
      const redirect = sessionStorage.getItem('redirectAfterLogin')
      if (redirect) {
        sessionStorage.removeItem('redirectAfterLogin')
        router.push(redirect)
      }
      onClose()
    } else {
      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      })
      setLoading(false)
      if (err) {
        const msg = translateError(err.message, err.status)
        if (msg.includes('E-mail já cadastrado')) setEmailError(msg)
        else setError(msg)
        return
      }
      if (!err) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          fetch('/api/send-verification-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              email: user.email,
              name: name,
            }),
          }).catch(() => {})
        }
        if (signupContext === 'producer') {
          onClose()
          router.push('/produtor/pos-login')
          return
        }
        const redirect = sessionStorage.getItem('redirectAfterLogin')
        if (redirect) {
          sessionStorage.removeItem('redirectAfterLogin')
          router.push(redirect)
        }
        onClose()
        return
      }
    }
  }

  const isProducerContext = mode === 'producer'
    || (mode === 'forgot' && forgotOrigin === 'producer')
    || (mode === 'signup' && signupContext === 'producer')

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

        {mode === 'producer' && (
          <button
            onClick={() => { setMode('signin'); reset() }}
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

        <>
            {/* Título */}
            {mode !== 'forgot' && (
              <div style={{ marginTop: mode === 'producer' ? 32 : 8, marginBottom: 6 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1A1A1A', letterSpacing: -0.3 }}>
                  {isProducerContext ? 'Acesse o Roleon Produtor' : 'Acesse o Roleon'}
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6E6E73', lineHeight: 1.5 }}>
                  {isProducerContext ? 'Gerencie seus eventos e ingressos' : 'Entre para comprar ingressos'}
                </p>
              </div>
            )}

            {/* Google + divisor */}
            {mode !== 'forgot' && (
              <>
                <button
                  onClick={handleGoogle}
                  style={{
                    width: '100%', marginTop: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: '#fff', border: '1.5px solid #E8E8E8',
                    borderRadius: 12, padding: '13px 18px',
                    fontSize: 14.5, fontWeight: 600, color: '#1A1A1A',
                    fontFamily: "'Noto Sans', sans-serif",
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <IconGoogleG />
                  Continuar com Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#EFEFEF' }} />
                  <span style={{ fontSize: 12, color: '#9A9A9A', fontWeight: 600 }}>ou</span>
                  <div style={{ flex: 1, height: 1, background: '#EFEFEF' }} />
                </div>
              </>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: mode === 'forgot' ? 8 : 0 }}>
              {mode === 'signup' && (
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={INPUT}
                />
              )}

              {mode === 'forgot' && (
                <p style={{ margin: '0 0 4px', fontSize: 14, color: '#6E6E73', lineHeight: 1.5, paddingRight: 36 }}>
                  Digite seu e-mail e enviaremos um link para você redefinir sua senha.
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
                  required
                  style={{ ...INPUT, ...(emailError ? { border: '1.5px solid #E05555' } : {}) }}
                />
                {emailError && (
                  <span style={{ fontSize: 12, color: '#E05555', fontWeight: 500, paddingLeft: 4 }}>
                    {emailError}
                  </span>
                )}
              </div>

              {mode !== 'forgot' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Senha"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(null) }}
                      required
                      style={{ ...INPUT, paddingRight: 44, ...(passwordError ? { border: '1.5px solid #E05555' } : {}) }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 0, cursor: 'pointer', color: '#9A9A9A',
                        display: 'flex', alignItems: 'center', padding: 0,
                      }}
                    >
                      <IconEye hidden={!showPwd} />
                    </button>
                  </div>
                  {passwordError ? (
                    <span style={{ fontSize: 12, color: '#E05555', fontWeight: 500, paddingLeft: 4 }}>
                      {passwordError}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#6E6E73', marginTop: 4, paddingLeft: 4 }}>
                      Mínimo 8 caracteres
                    </span>
                  )}
                </div>
              )}

              {/* Erro geral */}
              {error && (
                <div style={{ fontSize: 12.5, color: '#E05555', fontWeight: 500 }}>{error}</div>
              )}
              {resetSent && (
                <div style={{ fontSize: 12.5, color: '#0EA5A0', fontWeight: 500 }}>
                  E-mail enviado! Verifique sua caixa de entrada.
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: loading
                    ? (isProducerContext ? '#065e5a' : '#7DCFCD')
                    : (isProducerContext ? '#087A76' : '#0EA5A0'),
                  color: '#fff', border: 0, cursor: loading ? 'default' : 'pointer',
                  padding: '14px 18px', borderRadius: 12,
                  fontSize: 15, fontWeight: 700,
                  fontFamily: "'Noto Sans', sans-serif",
                  boxShadow: isProducerContext
                    ? '0 6px 16px rgba(8,122,118,0.25)'
                    : '0 6px 16px rgba(14,165,160,0.25)',
                  marginTop: 2,
                  transition: 'background 200ms',
                }}
              >
                {loading ? 'Aguarde...' : mode === 'forgot' ? 'Enviar link'
                  : (mode === 'signin' || mode === 'producer') ? 'Entrar'
                  : 'Criar conta'}
              </button>
            </form>

            {/* Links secundários */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: 16, fontSize: 13, fontWeight: 600,
            }}>
              {mode === 'forgot' ? (
                <button
                  type="button"
                  onClick={() => { setMode(forgotOrigin); reset() }}
                  style={{ background: 'none', border: 0, cursor: 'pointer', color: forgotOrigin === 'producer' ? '#087A76' : '#0EA5A0', padding: 0 }}
                >
                  Voltar ao login
                </button>
              ) : mode === 'producer' ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setSignupContext('producer'); setMode('signup'); reset() }}
                    style={{ background: 'none', border: 0, cursor: 'pointer', color: '#087A76', padding: 0 }}
                  >
                    Criar conta de produtor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotOrigin('producer'); setMode('forgot'); reset() }}
                    style={{ background: 'none', border: 0, cursor: 'pointer', color: '#087A76', padding: 0 }}
                  >
                    Esqueci a senha
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'signin') {
                        setMode('signup')
                      } else {
                        setMode(signupContext === 'producer' ? 'producer' : 'signin')
                        setSignupContext('')
                      }
                      reset()
                    }}
                    style={{ background: 'none', border: 0, cursor: 'pointer', color: '#0EA5A0', padding: 0 }}
                  >
                    {mode === 'signin' ? 'Criar conta' : 'Já tenho conta'}
                  </button>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setForgotOrigin('signin'); setMode('forgot'); reset() }}
                      style={{ background: 'none', border: 0, cursor: 'pointer', color: '#0EA5A0', padding: 0 }}
                    >
                      Esqueci a senha
                    </button>
                  )}
                </>
              )}
            </div>

            {mode === 'signin' && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setMode('producer'); reset() }}
                  style={{
                    background: 'transparent', border: 0, cursor: 'pointer',
                    color: '#9CA3AF', fontSize: 12,
                    fontFamily: "'Noto Sans', sans-serif",
                    padding: 0, lineHeight: 1.4,
                  }}
                >
                  É produtor? Acesse o portal →
                </button>
              </div>
            )}
        </>
      </div>
    </>
  )
}
