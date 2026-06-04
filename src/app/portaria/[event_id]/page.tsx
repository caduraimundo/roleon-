'use client'

import { useEffect, useRef, useState } from 'react'

export default function PortariaPublicaPage({
  params,
}: {
  params: Promise<{ event_id: string }>
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [eventId, setEventId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [totalSold, setTotalSold] = useState(0)
  const [totalCheckins, setTotalCheckins] = useState(0)
  const [scanning, setScanning] = useState(true)
  const [feedback, setFeedback] = useState<null | 'success' | 'error'>(null)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [loadingManual, setLoadingManual] = useState(false)
  const [tokenError, setTokenError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { event_id } = await params
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token') ?? ''

      setEventId(event_id)
      setAccessToken(token)

      if (!token) {
        setTokenError(true)
        setLoading(false)
        return
      }

      const res = await fetch(`/api/portaria/${event_id}?token=${token}`)
      if (!res.ok) {
        setTokenError(true)
        setLoading(false)
        return
      }

      const data = await res.json()
      setEventTitle(data.event_title)
      setTotalSold(data.total_sold ?? 0)
      setTotalCheckins(data.total_checkins ?? 0)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!eventId || !accessToken || tokenError || loading) return

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

    startScanner()
    return () => { scanner?.destroy() }
  }, [eventId, accessToken, tokenError, loading])

  const handleScan = async (checkin_token: string) => {
    if (!scanning) return
    setScanning(false)

    try {
      const res = await fetch(`/api/portaria/${eventId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken, checkin_token }),
      })
      const json = await res.json()

      if (res.ok) {
        setFeedback('success')
        setFeedbackMsg(`${json.ticket_type} - Entrada confirmada`)
        setTotalCheckins(json.total_checkins)
        setTotalSold(json.total_sold)
      } else if (res.status === 409) {
        setFeedback('error')
        setFeedbackMsg('Ingresso ja utilizado')
      } else {
        setFeedback('error')
        setFeedbackMsg(json.error || 'Ingresso invalido')
      }
      setTimeout(() => { setFeedback(null); setScanning(true) }, 2500)
    } catch {
      setFeedback('error')
      setFeedbackMsg('Ingresso invalido')
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#1A1A1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto Sans', sans-serif", color: '#6E6E73', fontSize: 15,
      }}>
        Carregando...
      </div>
    )
  }

  if (tokenError) {
    return (
      <div style={{
        minHeight: '100vh', background: '#1A1A1A',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto Sans', sans-serif",
        padding: '0 32px', textAlign: 'center', gap: 12,
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="#6E6E73" strokeWidth="2"/>
          <path d="M16 16l16 16M32 16L16 32" stroke="#6E6E73" strokeWidth="2.5"
            strokeLinecap="round"/>
        </svg>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Link invalido</div>
        <div style={{ fontSize: 14, color: '#6E6E73' }}>
          Este link de portaria nao e valido ou foi revogado pelo produtor.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1A1A1A',
      fontFamily: "'Noto Sans', sans-serif", paddingBottom: 32,
    }}>
      <div style={{ padding: '20px 20px 12px', textAlign: 'center' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1,
          textTransform: 'uppercase', color: '#0EA5A0', marginBottom: 4,
        }}>
          Portaria
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          {eventTitle}
        </div>
        <div style={{
          display: 'inline-flex', gap: 16,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 10, padding: '8px 20px',
        }}>
          <span style={{ fontSize: 13, color: '#9A9A9A' }}>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>
              {totalCheckins}
            </span>{' '}entraram
          </span>
          <span style={{ color: '#333' }}>|</span>
          <span style={{ fontSize: 13, color: '#9A9A9A' }}>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>
              {totalSold}
            </span>{' '}total
          </span>
        </div>
      </div>

      <div style={{
        margin: '0 20px', borderRadius: 16, overflow: 'hidden',
        position: 'relative', background: '#000', aspectRatio: '1',
      }}>
        <video ref={videoRef} style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
        }} />

        {feedback && (
          <div style={{
            position: 'absolute', inset: 0,
            background: feedback === 'success'
              ? 'rgba(22,163,74,0.88)' : 'rgba(220,38,38,0.88)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
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
              fontSize: 17, fontWeight: 700, color: '#fff',
              textAlign: 'center', padding: '0 20px',
            }}>
              {feedbackMsg}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10,
        }}>
          Ou digite o codigo manual
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={manualCode}
            onChange={e => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            placeholder="Ex: A5ADDF"
            maxLength={6}
            style={{
              flex: 1, padding: '12px 14px',
              border: '1px solid #333', borderRadius: 10,
              fontSize: 16, fontWeight: 700, letterSpacing: 2,
              fontFamily: "'Noto Sans', sans-serif",
              background: '#2A2A2A', color: '#fff',
              textTransform: 'uppercase', outline: 'none',
            }}
          />
          <button
            onClick={handleManual}
            disabled={loadingManual || manualCode.trim().length === 0}
            style={{
              padding: '12px 20px', borderRadius: 10,
              background: '#0EA5A0', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
              fontFamily: "'Noto Sans', sans-serif",
              opacity: manualCode.trim().length === 0 ? 0.5 : 1,
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
