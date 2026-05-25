'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { BackButton } from '../../../components/BackButton'

// ── Ícones ────────────────────────────────────────────────────────────────────

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="#C8C8C8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: checked ? '#0EA5A0' : '#D1D1D6',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
        }}
      />
    </button>
  )
}

// ── Card base ─────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '0.5px solid #E5E5EA',
  borderRadius: 12,
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  textAlign: 'left',
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: 0.5,
  color: '#6E6E73',
  marginBottom: 8,
  textTransform: 'uppercase',
}

// ── Push helpers ──────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const trimmed = base64String.trim()
  const padding = '='.repeat((4 - (trimmed.length % 4)) % 4)
  const base64 = (trimmed + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from(Array.from(rawData, (c) => c.charCodeAt(0))).buffer as ArrayBuffer
}

async function subscribeToPush() {
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: existing.toJSON() })
    })
    return true
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return false
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    )
  })
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON() })
  })
  return true
}

async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
  await fetch('/api/push/unsubscribe', { method: 'POST' })
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [nearby, setNearby] = useState(false)
  const [reminders, setReminders] = useState(false)
  const [isGoogle, setIsGoogle] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/perfil'); return }

      setIsGoogle(session.user.app_metadata?.provider === 'google')

      const { data: profile } = await supabase
        .from('profiles')
        .select('notifications_nearby, notifications_reminders')
        .eq('id', session.user.id)
        .maybeSingle()

      setNearby(profile?.notifications_nearby ?? false)
      setReminders(profile?.notifications_reminders ?? false)
      setLoading(false)
    }
    load()
  }, [router])

  const handleToggle = async (field: 'notifications_nearby' | 'notifications_reminders', value: boolean) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await fetch('/api/profile/update-notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ field, value }),
    })
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
    })

    if (res.ok) {
      await supabase.auth.signOut()
      router.push('/')
      return
    }

    setDeleting(false)
    setShowDeleteModal(false)
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

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 16, paddingRight: 16,
        background: '#fff',
        borderBottom: '0.5px solid #EFEFEF',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 16 }}>
          <BackButton />
        </div>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 700, color: '#1A1A1A',
        }}>
          Configurações
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: '28px 20px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* SEÇÃO 1 — NOTIFICAÇÕES */}
        <div>
          <div style={sectionLabelStyle}>NOTIFICAÇÕES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            <div style={cardStyle}>
              <span style={{ fontSize: 15, color: '#1A1A1A' }}>Eventos próximos</span>
              <Toggle
                checked={nearby}
                onChange={async (v) => {
                  if (v) {
                    setNearby(true)
                    const ok = await subscribeToPush()
                    if (!ok) {
                      setNearby(false)
                      setToast('Ative as notificações nas configurações do seu navegador')
                      setTimeout(() => setToast(null), 4000)
                      return
                    }
                  } else {
                    setNearby(false)
                    await unsubscribeFromPush()
                  }
                  handleToggle('notifications_nearby', v)
                }}
              />
            </div>

            <div style={cardStyle}>
              <span style={{ fontSize: 15, color: '#1A1A1A' }}>Lembretes de eventos salvos</span>
              <Toggle
                checked={reminders}
                onChange={(v) => {
                  setReminders(v)
                  handleToggle('notifications_reminders', v)
                }}
              />
            </div>

          </div>
        </div>

        {/* SEÇÃO 2 — PRIVACIDADE */}
        <div>
          <div style={sectionLabelStyle}>PRIVACIDADE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            <a href="/privacidade" style={{ textDecoration: 'none', ...cardStyle }}>
              <span style={{ fontSize: 15, color: '#1A1A1A' }}>Política de privacidade</span>
              <IconChevronRight />
            </a>

            <a href="/termos" style={{ textDecoration: 'none', ...cardStyle }}>
              <span style={{ fontSize: 15, color: '#1A1A1A' }}>Termos de uso</span>
              <IconChevronRight />
            </a>

          </div>
        </div>

        {/* SEÇÃO 3 — CONTA */}
        <div>
          <div style={sectionLabelStyle}>CONTA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {!isGoogle && (
              <button
                onClick={() => router.push('/perfil/alterar-senha')}
                style={{ ...cardStyle, cursor: 'pointer', border: '0.5px solid #E5E5EA' }}
              >
                <span style={{ fontSize: 15, color: '#1A1A1A' }}>Alterar senha</span>
                <IconChevronRight />
              </button>
            )}

            <button
              onClick={() => setShowDeleteModal(true)}
              style={{ ...cardStyle, cursor: 'pointer', border: '0.5px solid #E5E5EA', justifyContent: 'flex-start', gap: 12 }}
            >
              <IconTrash />
              <span style={{ fontSize: 15, color: '#FF3B30', fontWeight: 500 }}>Excluir conta</span>
            </button>

          </div>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1A1A1A', color: '#fff',
          padding: '12px 20px', borderRadius: 12,
          fontSize: 14, fontWeight: 500,
          zIndex: 2000, maxWidth: 'calc(100vw - 40px)',
          textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          {toast}
        </div>
      )}

      {/* Modal de confirmação */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 1000,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div style={{
            background: '#fff',
            borderRadius: '20px 20px 0 0',
            padding: '28px 24px 32px',
            width: '100%',
            maxWidth: 480,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FF3B30', textAlign: 'center' }}>
              Excluir conta
            </div>

            <div style={{ fontSize: 15, color: '#3A3A3A', lineHeight: 1.55, textAlign: 'center' }}>
              Seus dados pessoais serão removidos permanentemente.
              Ingressos comprados ficam registrados por 5 anos por obrigação fiscal.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  padding: '14px 0',
                  borderRadius: 14,
                  background: '#FF3B30',
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  fontFamily: "'Noto Sans', sans-serif",
                  cursor: deleting ? 'default' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {deleting ? 'Excluindo...' : 'Excluir minha conta'}
              </button>

              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  padding: '14px 0',
                  borderRadius: 14,
                  background: '#F4F4F4',
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1A1A1A',
                  fontFamily: "'Noto Sans', sans-serif",
                  cursor: deleting ? 'default' : 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
