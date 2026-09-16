'use client'

import { createContext, useContext, useMemo, useRef, useState } from 'react'

interface MapShellContextValue {
  mapInstanceRef: React.RefObject<google.maps.Map | null>
  userLocationRef: React.RefObject<{ lat: number; lng: number } | null>
  mapReady: boolean
  setMapReady: (v: boolean) => void
  mapLoadError: boolean
  setMapLoadError: (v: boolean) => void
  retryKey: number
  setRetryKey: React.Dispatch<React.SetStateAction<number>>
  searchCenter: { lat: number; lng: number } | null
  setSearchCenter: (pos: { lat: number; lng: number } | null) => void
}

const MapShellContext = createContext<MapShellContextValue | null>(null)

export function MapShellProvider({ children }: { children: React.ReactNode }) {
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null)

  const [mapReady, setMapReady] = useState(false)
  const [mapLoadError, setMapLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null)

  const value = useMemo<MapShellContextValue>(() => ({
    mapInstanceRef,
    userLocationRef,
    mapReady,
    setMapReady,
    mapLoadError,
    setMapLoadError,
    retryKey,
    setRetryKey,
    searchCenter,
    setSearchCenter,
  }), [mapReady, mapLoadError, retryKey, searchCenter])

  return (
    <MapShellContext.Provider value={value}>
      {children}
    </MapShellContext.Provider>
  )
}

export function useMapShell(): MapShellContextValue {
  const ctx = useContext(MapShellContext)
  if (!ctx) {
    throw new Error('useMapShell deve ser usado dentro de um MapShellProvider')
  }
  return ctx
}
