'use client';

import { computeLoadingContainerStyle } from './loadingScreenStyles'
import LoadingError from './LoadingError'

type AppLoadingScreenProps = {
  fullScreen?: boolean
  dark?: boolean
  absolute?: boolean
  background?: string
  bounds?: { top: number; bottom: number } | null
  zIndex?: number
  error?: { message: string; onRetry: () => void } | null
}

export default function AppLoadingScreen({
  fullScreen = true,
  dark = false,
  absolute = false,
  background,
  bounds,
  zIndex,
  error = null,
}: AppLoadingScreenProps) {
  const style = computeLoadingContainerStyle({ fullScreen, dark, absolute, background, bounds, zIndex })

  return (
    <div style={style}>
      {error ? (
        <LoadingError message={error.message} onRetry={error.onRetry} dark={dark} />
      ) : (
        <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#9A9A9A' : '#6E6E73', fontFamily: "'Noto Sans', sans-serif" }}>
          Carregando...
        </span>
      )}
    </div>
  )
}
