import type { CSSProperties } from 'react'

type LoadingContainerStyleArgs = {
  fullScreen: boolean
  dark: boolean
  absolute: boolean
  background?: string
  bounds?: { top: number; bottom: number } | null
  zIndex?: number
}

export function computeLoadingContainerStyle({
  fullScreen,
  dark,
  absolute,
  background,
  bounds,
  zIndex,
}: LoadingContainerStyleArgs): CSSProperties {
  const inOverlayMode = bounds !== undefined

  const positionStyle = inOverlayMode
    ? (bounds
        ? { position: 'absolute' as const, top: bounds.top, left: 0, right: 0, height: bounds.bottom - bounds.top }
        : { position: 'absolute' as const, inset: 0 })
    : (fullScreen
        ? (absolute ? { position: 'absolute' as const, inset: 0 } : { minHeight: '100dvh' })
        : { paddingTop: 80 })

  const resolvedBackground = background ?? (fullScreen ? (dark ? '#1A1A1A' : '#F7F7F7') : 'transparent')

  return {
    ...positionStyle,
    background: resolvedBackground,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...(zIndex != null ? { zIndex } : {}),
  }
}
