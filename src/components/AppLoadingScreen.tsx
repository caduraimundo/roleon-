'use client';

import { ICON_BASE64 } from './iconBase64'

type AppLoadingScreenProps = {
  fullScreen?: boolean
  dark?: boolean
  showIcon?: boolean
  absolute?: boolean
  background?: string
  bounds?: { top: number; bottom: number } | null
  zIndex?: number
  error?: { message: string; onRetry: () => void } | null
}

export default function AppLoadingScreen({
  fullScreen = true,
  dark = false,
  showIcon = true,
  absolute = false,
  background,
  bounds,
  zIndex,
  error = null,
}: AppLoadingScreenProps) {
  const iconSize = fullScreen ? 48 : 40
  const inOverlayMode = bounds !== undefined

  const positionStyle = inOverlayMode
    ? (bounds
        ? { position: 'absolute' as const, top: bounds.top, left: 0, right: 0, height: bounds.bottom - bounds.top }
        : { position: 'absolute' as const, inset: 0 })
    : (fullScreen
        ? (absolute ? { position: 'absolute' as const, inset: 0 } : { minHeight: '100dvh' })
        : { paddingTop: 80 })

  const resolvedBackground = background ?? (fullScreen ? (dark ? '#1A1A1A' : '#F7F7F7') : 'transparent')

  return (
    <div style={{
      ...positionStyle,
      background: resolvedBackground,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      ...(zIndex != null ? { zIndex } : {}),
    }}>
      {error ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#9A9A9A' : '#6E6E73', fontFamily: "'Noto Sans', sans-serif", textAlign: 'center', padding: '0 32px' }}>
            {error.message}
          </span>
          <button
            onClick={error.onRetry}
            style={{
              marginTop: 8, height: 44, padding: '0 20px', borderRadius: 10,
              background: '#0EA5A0', color: '#fff', border: 0, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif",
              boxShadow: '0 6px 14px rgba(14,165,160,0.28)',
            }}
          >
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          {showIcon && (
            <div style={{ position: 'relative', width: iconSize + 16, height: iconSize + 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg
                width={iconSize + 16}
                height={iconSize + 16}
                viewBox="0 0 64 64"
                style={{ position: 'absolute', top: 0, left: 0, animation: 'spin-ring 1s linear infinite', transformOrigin: '50% 50%' }}
              >
                <circle cx="32" cy="32" r="27" fill="none" stroke="#E0E0E0" strokeWidth="4" />
                <circle cx="32" cy="32" r="27" fill="none" stroke="#0EA5A0" strokeWidth="4" strokeLinecap="round" strokeDasharray="42 128" />
              </svg>
              <img
                src={`data:image/png;base64,${ICON_BASE64}`}
                alt="Roleon"
                width={iconSize}
                height={iconSize}
                style={{ objectFit: 'contain' }}
              />
            </div>
          )}
          <style>{`
            @keyframes spin-ring {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#9A9A9A' : '#6E6E73', fontFamily: "'Noto Sans', sans-serif" }}>
            Carregando...
          </span>
        </>
      )}
    </div>
  )
}
