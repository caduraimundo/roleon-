'use client';

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
  const iconSize = fullScreen ? 64 : 40
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
            <img
              src="/icons/icon-192.png"
              alt="Roleon"
              width={iconSize}
              height={iconSize}
              style={{ objectFit: 'contain', animation: 'pulse-opacity 1.6s ease-in-out infinite' }}
            />
          )}
          <style>{`
            @keyframes pulse-opacity {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
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
