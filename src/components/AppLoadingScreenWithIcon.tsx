'use client';

import { ICON_BASE64 } from './iconBase64'
import { computeLoadingContainerStyle } from './loadingScreenStyles'
import LoadingError from './LoadingError'

type AppLoadingScreenWithIconProps = {
  fullScreen?: boolean
  dark?: boolean
  absolute?: boolean
  background?: string
  bounds?: { top: number; bottom: number } | null
  zIndex?: number
  error?: { message: string; onRetry: () => void } | null
}

export default function AppLoadingScreenWithIcon({
  fullScreen = true,
  dark = false,
  absolute = false,
  background,
  bounds,
  zIndex,
  error = null,
}: AppLoadingScreenWithIconProps) {
  const iconSize = fullScreen ? 48 : 40
  const style = computeLoadingContainerStyle({ fullScreen, dark, absolute, background, bounds, zIndex })

  return (
    <div style={style}>
      {error ? (
        <LoadingError message={error.message} onRetry={error.onRetry} dark={dark} />
      ) : (
        <>
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
              width={iconSize - 6}
              height={iconSize - 6}
              style={{ objectFit: 'contain' }}
            />
          </div>
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
