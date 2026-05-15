'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

interface CheckoutSession {
  order_id?: string
  event_id?: string
  event_title?: string
  total?: number
  quantity?: number
  ticket_id?: string
  qr_code_url?: string
  pix_code?: string
  expires_at?: string
}

function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function IconPix() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
      <path fill="none" stroke="#0EA5A0" strokeWidth="2.5" strokeLinejoin="round" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
      <path fill="none" stroke="#0EA5A0" strokeWidth="2.5" strokeLinejoin="round" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
      <path fill="none" stroke="#0EA5A0" strokeWidth="2.5" strokeLinejoin="round" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
    </svg>
  )
}

function SpinnerSVG() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="#D0D0D0" strokeWidth="2.5"/>
      <path d="M12 2a10 10 0 0110 10" stroke="#0EA5A0" strokeWidth="2.5" strokeLinecap="round"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </svg>
  )
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function PagamentoPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const orderId = String(params.order_id)

  const [session] = useState<CheckoutSession | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('roleon_checkout')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  const [qrCodeUrl, setQrCodeUrl] = useState<string>(
    session?.qr_code_url ||
    searchParams.get('qr_code_url') ||
    'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ROLEON_PIX_MOCK'
  )

  const [pixCode, setPixCode] = useState<string>(
    session?.pix_code ||
    searchParams.get('pix_code') ||
    '00020101021226870014br.gov.bcb.pix2565api.roleon.com.br/pix/v2/key/roleon5204000053039865802BR5925Roleon Eventos Ltda6009Sao Paulo62070503***63041234'
  )

  const expiresAt =
    session?.expires_at ||
    searchParams.get('expires_at') ||
    ''

  const ticketId = session?.ticket_id || 'mock_ticket_001'

  const [currentOrderId, setCurrentOrderId] = useState(orderId)
  const [retrying, setRetrying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expired, setExpired] = useState(false)
  const [paid, setPaid] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!expiresAt) return 900
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    return Math.max(0, diff)
  })

  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!)
          setExpired(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (expired) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      return
    }
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status?order_id=${currentOrderId}`)
        const data = await res.json()
        if (data.status === 'paid') {
          clearInterval(pollingRef.current!)
          clearInterval(timerRef.current!)
          setPaid(true)
        } else if (data.status === 'expired') {
          clearInterval(pollingRef.current!)
          setExpired(true)
        }
      } catch {}
    }, 3000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [currentOrderId, router, expired, ticketId])

  const handleRetry = async () => {
    if (retrying) return
    setRetrying(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const token = authSession?.access_token || ''
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          event_id: session?.event_id,
          quantity: session?.quantity ?? 1,
          payment_method: 'pix',
        }),
      })
      if (!res.ok) throw new Error('Falha ao gerar novo PIX')
      const data = await res.json()
      setQrCodeUrl(data.qr_code_url || '')
      setPixCode(data.pix_code || '')
      setCurrentOrderId(data.order_id || orderId)
      setExpired(false)
      setSecondsLeft(900)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(timerRef.current!)
            setExpired(true)
            return 0
          }
          return s - 1
        })
      }, 1000)
    } catch (e) {
      console.error('[retry pix]', e)
    }
    setRetrying(false)
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(pixCode).catch(() => {})
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isUrgent = secondsLeft > 0 && secondsLeft < 300

  if (paid) return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 24, textAlign: 'center',
    }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#0EA5A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A' }}>Pagamento confirmado!</div>
        <div style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.5 }}>Seu ingresso está garantido. Aproveite o rolê!</div>
      </div>
      <button onClick={() => router.replace('/ingressos')} style={{ width: '100%', maxWidth: 320, height: 52, background: '#0EA5A0', color: '#fff', border: 0, borderRadius: 14, fontSize: 16, fontWeight: 700, fontFamily: "'Noto Sans', sans-serif", cursor: 'pointer' }}>
        Ver meu ingresso
      </button>
      <button onClick={() => router.replace('/')} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 15, color: '#6E6E73', fontFamily: "'Noto Sans', sans-serif", fontWeight: 500 }}>
        Voltar ao mapa
      </button>
    </div>
  )

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(249,249,249,0.95)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px',
      }}>
        <button
          onClick={() => router.replace('/')}
          aria-label="Cancelar"
          style={{
            position: 'absolute', left: 16,
            top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
            width: 36, height: 36, borderRadius: 999,
            background: 'transparent', border: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1A1A1A',
          }}
        >
          <IconX />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Pagar com PIX</span>
      </div>

      <div style={{ flex: 1, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* Card principal */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #EFEFEF',
          width: '100%', maxWidth: 360,
        }}>
          {/* Ícone + instrução */}
          <div style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <IconPix />
            <div style={{ fontSize: 14, color: '#3A3A3A', textAlign: 'center', lineHeight: 1.5 }}>
              Escaneie o QR Code com o app do seu banco
            </div>
          </div>

          {/* QR Code */}
          <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'center' }}>
            {expired ? (
              <div style={{
                width: 200, height: 200, background: '#F2F2F2', borderRadius: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 8,
              }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" stroke="#C0C0C0" strokeWidth="2"/>
                  <path d="M16 9v8M16 21v2" stroke="#C0C0C0" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 12, color: '#8A8A8A', textAlign: 'center', padding: '0 16px' }}>QR Code expirado</span>
              </div>
            ) : (
              <img
                src={qrCodeUrl}
                alt="QR Code PIX"
                width={200} height={200}
                style={{ borderRadius: 8, display: 'block' }}
              />
            )}
          </div>

          {/* Timer */}
          <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {expired ? (
              <div style={{ fontSize: 13, color: '#E53935', fontWeight: 600 }}>PIX expirado. Tente novamente.</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: '#8A8A8A' }}>Expira em</div>
                <div style={{
                  fontSize: 28, fontWeight: 700,
                  color: isUrgent ? '#E53935' : '#1A1A1A',
                  fontFamily: 'monospace',
                  transition: 'color 400ms',
                }}>
                  {pad(minutes)}:{pad(seconds)}
                </div>
                {isUrgent && (
                  <div style={{ fontSize: 12, color: '#E53935', fontWeight: 500, marginTop: 2 }}>
                    Expirando em breve
                  </div>
                )}
              </>
            )}
          </div>

          {/* Divisória */}
          <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#EFEFEF' }} />
            <span style={{ fontSize: 13, color: '#8A8A8A' }}>ou</span>
            <div style={{ flex: 1, height: 1, background: '#EFEFEF' }} />
          </div>

          {/* Código PIX copiável */}
          <div style={{ padding: '16px 20px 20px' }}>
            <div style={{
              background: '#F2F2F2', borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            }}>
              <div style={{
                flex: 1, fontSize: 12, color: '#3A3A3A',
                fontFamily: 'monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {pixCode}
              </div>
              <button
                onClick={handleCopy}
                disabled={expired}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 8,
                  background: copied ? '#0EA5A0' : '#1A1A1A', color: '#fff',
                  border: 0, cursor: expired ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "'Noto Sans', sans-serif",
                  transition: 'background 200ms',
                  whiteSpace: 'nowrap',
                  opacity: expired ? 0.4 : 1,
                }}
              >
                {copied ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>
          </div>
        </div>

        {/* Botão voltar ao checkout se expirado */}
        {expired && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            style={{
              padding: '14px 32px', borderRadius: 12,
              background: '#0EA5A0', color: '#fff',
              border: 0, cursor: retrying ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700,
              fontFamily: "'Noto Sans', sans-serif",
              opacity: retrying ? 0.7 : 1,
            }}
          >
            {retrying ? 'Gerando...' : 'Tentar novamente'}
          </button>
        )}

        {/* Aguardando */}
        {!expired && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <SpinnerSVG />
            <div style={{ fontSize: 14, color: '#8A8A8A', fontWeight: 500 }}>
              Aguardando confirmação do pagamento...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
