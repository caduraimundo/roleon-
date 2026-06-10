'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function PortariaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [eventId, setEventId] = useState('')
  const [totalSold, setTotalSold] = useState(0)
  const [totalCheckins, setTotalCheckins] = useState(0)
  const [scanning, setScanning] = useState(true)
  const [feedback, setFeedback] = useState<null | 'success' | 'error'>(null)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [ticketType, setTicketType] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [loadingManual, setLoadingManual] = useState(false)
  const [token, setToken] = useState('')
  const [portariaLink, setPortariaLink] = useState('')
  const [loadingLink, setLoadingLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { id } = await params
      setEventId(id)

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/produtor'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'producer' && profile?.role !== 'admin') {
        router.push('/produtor')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token ?? ''
      setToken(accessToken)

      const tokenRes = await fetch(`/api/produtor/events/${id}/portaria-token`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json()
        if (tokenData.token) {
          setPortariaLink(
            `${window.location.origin}/portaria/${id}?token=${tokenData.token}`
          )
        }
      }

      const res = await fetch(`/api/produtor/checkin?event_id=${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTotalSold(data.total_sold ?? 0)
        setTotalCheckins(data.total_checkins ?? 0)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!eventId || !token) return

    let scanner: any

    const startScanner = async () => {
      const { default: QrScanner } = await import('qr-scanner')
      scanner = new QrScanner(
        videoRef.current!,
        (result: { data: string }) => handleScan(result.data),
        { preferredCamera: 'environment', highlightScanRegion: true }
      )
      await scanner.start()
    }

    startScanner().catch((err: unknown) => {
      console.error('[portaria] camera error:', err)
      setCameraError(true)
    })

    return () => {
      scanner?.destroy()
    }
  }, [eventId, token])

  const handleScan = async (data: string) => {
    if (!scanning) return
    setScanning(false)

    try {
      const res = await fetch('/api/produtor/checkin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: data, event_id: eventId }),
      })

      const json = await res.json()

      if (res.ok) {
        setFeedback('success')
        setFeedbackMsg(`${json.ticket_type} - Entrada confirmada`)
        setTicketType(json.ticket_type)
        setTotalCheckins(json.total_checkins)
        setTotalSold(json.total_sold)
        setTimeout(() => { setFeedback(null); setScanning(true) }, 2500)
      } else if (res.status === 409) {
        setFeedback('error')
        setFeedbackMsg('Ingresso já utilizado')
        setTimeout(() => { setFeedback(null); setScanning(true) }, 2500)
      } else {
        setFeedback('error')
        setFeedbackMsg(json.error || 'Ingresso inválido')
        setTimeout(() => { setFeedback(null); setScanning(true) }, 2500)
      }
    } catch {
      setFeedback('error')
      setFeedbackMsg('Ingresso inválido')
      setTimeout(() => { setFeedback(null); setScanning(true) }, 2500)
    }
  }

  const handleManual = () => {
    if (manualCode.trim() === '' || loadingManual) return
    setLoadingManual(true)
    handleScan(manualCode.trim().toUpperCase())
    setManualCode('')
    setLoadingManual(false)
  }

  const handleGenerateLink = async () => {
    setLoadingLink(true)
    try {
      const res = await fetch(`/api/produtor/events/${eventId}/portaria-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPortariaLink(
          `${window.location.origin}/portaria/${eventId}?token=${data.token}`
        )
        setCopied(false)
      }
    } finally {
      setLoadingLink(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portariaLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback silencioso
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F7F7',
      fontFamily: "'Noto Sans', sans-serif",
      paddingBottom: 80,
    }}>
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            color: '#1A1A1A',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 5L5 10l5 5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Voltar
        </button>
      </div>

      <div style={{
        margin: '0 20px',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
        aspectRatio: '1',
      }}>
        <video ref={videoRef} style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}/>

        {feedback && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: feedback === 'success'
              ? 'rgba(22,163,74,0.88)'
              : 'rgba(220,38,38,0.88)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}>
            {feedback === 'success' ? (
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" stroke="#fff" strokeWidth="2.5"/>
                <path d="M18 28l8 8 12-14" stroke="#fff" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" stroke="#fff" strokeWidth="2.5"/>
                <path d="M20 20l16 16M36 20L20 36" stroke="#fff" strokeWidth="3"
                  strokeLinecap="round"/>
              </svg>
            )}
            <div style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
              padding: '0 20px',
            }}>
              {feedbackMsg}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: '#9A9A9A',
          marginBottom: 10,
        }}>
          Ou digite o código manual
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={manualCode}
            onChange={e => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            placeholder="Ex: A5ADDF"
            maxLength={6}
            style={{
              flex: 1,
              padding: '12px 14px',
              border: '1px solid #E8E8E8',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              fontFamily: "'Noto Sans', sans-serif",
              background: '#fff',
              color: '#1A1A1A',
              textTransform: 'uppercase',
              outline: 'none',
            }}
          />
          <button
            onClick={handleManual}
            disabled={loadingManual || manualCode.trim().length === 0}
            style={{
              padding: '12px 20px',
              borderRadius: 10,
              background: '#0EA5A0',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Noto Sans', sans-serif",
              opacity: manualCode.trim().length === 0 ? 0.5 : 1,
            }}
          >
            Confirmar
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          textTransform: 'uppercase', color: '#9A9A9A', marginBottom: 12,
        }}>
          Link da portaria
        </div>

        {portariaLink ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              padding: '10px 14px',
              background: '#fff',
              border: '1px solid #E8E8E8',
              borderRadius: 10,
              fontSize: 12,
              color: '#6E6E73',
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}>
              {portariaLink}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCopyLink}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 10,
                  background: copied ? '#16A34A' : '#0EA5A0',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Noto Sans', sans-serif",
                  transition: 'background 0.2s',
                }}
              >
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={loadingLink}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: '#F7F7F7',
                  color: '#6E6E73',
                  border: 'none',
                  cursor: loadingLink ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Noto Sans', sans-serif",
                  opacity: loadingLink ? 0.6 : 1,
                }}
              >
                Revogar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleGenerateLink}
            disabled={loadingLink}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 10,
              background: '#F7F7F7',
              color: '#1A1A1A',
              border: 'none',
              cursor: loadingLink ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Noto Sans', sans-serif",
              opacity: loadingLink ? 0.6 : 1,
            }}
          >
            {loadingLink ? 'Gerando...' : 'Gerar link da portaria'}
          </button>
        )}
      </div>
    </div>
  )
}
