'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function SpinnerSVG() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx="11" cy="11" r="9" stroke="#D0D0D0" strokeWidth="2.5"/>
      <path d="M11 2a9 9 0 019 9" stroke="#0EA5A0" strokeWidth="2.5" strokeLinecap="round"/>
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
  const qrCodeUrl = searchParams.get('qr_code_url') ?? ''
  const pixCode = searchParams.get('pix_code') ?? ''
  const expiresAt = searchParams.get('expires_at') ?? ''

  const [copied, setCopied] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!expiresAt) return 3600
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    return Math.max(0, diff)
  })

  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status/${orderId}`)
        const data = await res.json()
        if (data.status === 'paid') {
          clearInterval(pollingRef.current!)
          router.push('/')
        }
      } catch {}
    }, 5000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [orderId, router])

  const handleCopy = () => {
    navigator.clipboard?.writeText(pixCode).catch(() => {})
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isUrgent = secondsLeft < 300

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

        {/* QR Code */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: 20,
          border: '1px solid #EFEFEF',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          width: '100%', maxWidth: 300,
        }}>
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code PIX" width={200} height={200} style={{ borderRadius: 8 }} />
          ) : (
            <div style={{ width: 200, height: 200, background: '#F2F2F2', borderRadius: 8 }} />
          )}
          <div style={{ fontSize: 13, color: '#8A8A8A', textAlign: 'center' }}>
            Escaneie o QR Code com o app do seu banco
          </div>
        </div>

        {/* Código PIX copiável */}
        {pixCode && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#5A5A5A' }}>Ou copie o código PIX</div>
            <div style={{
              background: '#F2F2F2', borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                flex: 1, fontSize: 12, color: '#3A3A3A',
                fontFamily: 'monospace', wordBreak: 'break-all',
                overflow: 'hidden', maxHeight: 36,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {pixCode}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 8,
                  background: copied ? '#0EA5A0' : '#1A1A1A', color: '#fff',
                  border: 0, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "'Noto Sans', sans-serif",
                  transition: 'background 200ms',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* Timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 12, color: '#8A8A8A' }}>Expira em</div>
          <div style={{
            fontSize: 28, fontWeight: 700,
            color: isUrgent ? '#E53935' : '#1A1A1A',
            fontFamily: 'monospace',
            transition: 'color 400ms',
          }}>
            {pad(minutes)}:{pad(seconds)}
          </div>
        </div>

        {/* Status aguardando */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <SpinnerSVG />
          <div style={{ fontSize: 14, color: '#8A8A8A', fontWeight: 500 }}>
            Aguardando pagamento...
          </div>
        </div>
      </div>
    </div>
  )
}
