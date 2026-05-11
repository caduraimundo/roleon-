'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

interface CheckoutSession {
  order_id?: string
  event_id?: string
  event_title?: string
  total?: number
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
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <path d="M26 4L48 26L26 48L4 26L26 4Z" fill="#32BCAD"/>
      <path d="M17 22 Q21 17 26 22 Q31 27 35 22" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
      <path d="M17 30 Q21 25 26 30 Q31 35 35 30" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
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

  const qrCodeUrl =
    session?.qr_code_url ||
    searchParams.get('qr_code_url') ||
    'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ROLEON_PIX_MOCK'

  const pixCode =
    session?.pix_code ||
    searchParams.get('pix_code') ||
    '00020101021226870014br.gov.bcb.pix2565api.roleon.com.br/pix/v2/key/roleon5204000053039865802BR5925Roleon Eventos Ltda6009Sao Paulo62070503***63041234'

  const expiresAt =
    session?.expires_at ||
    searchParams.get('expires_at') ||
    ''

  const ticketId = session?.ticket_id || 'mock_ticket_001'

  const [copied, setCopied] = useState(false)
  const [expired, setExpired] = useState(false)
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
        const res = await fetch(`/api/checkout/status/${orderId}`)
        const data = await res.json()
        if (data.status === 'paid') {
          clearInterval(pollingRef.current!)
          router.push(`/ingresso/${ticketId}`)
        } else if (data.status === 'expired') {
          clearInterval(pollingRef.current!)
          setExpired(true)
        }
      } catch {}
    }, 5000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [orderId, router, expired, ticketId])

  const handleCopy = () => {
    navigator.clipboard?.writeText(pixCode).catch(() => {})
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isUrgent = secondsLeft > 0 && secondsLeft < 300

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
          onClick={() => router.back()}
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
              <div style={{ fontSize: 13, color: '#E53935', fontWeight: 600 }}>QR Code expirado</div>
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

        {/* Botão gerar novo se expirado */}
        {expired && (
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '14px 32px', borderRadius: 12,
              background: '#0EA5A0', color: '#fff',
              border: 0, cursor: 'pointer',
              fontSize: 15, fontWeight: 700,
              fontFamily: "'Noto Sans', sans-serif",
            }}
          >
            Gerar novo código
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
