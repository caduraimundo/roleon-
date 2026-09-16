'use client'

import { usePathname } from 'next/navigation'
import GoogleMapCanvas from '@/components/GoogleMapCanvas'
import { useMapShell } from '../map-shell-context'

export default function MapSlot() {
  const { mapInstanceRef, userLocationRef, setMapReady, setMapLoadError, retryKey, setSearchCenter } = useMapShell()
  const pathname = usePathname()

  return (
    <div style={{ position: 'absolute', inset: 0, visibility: pathname === '/' ? 'visible' : 'hidden' }}>
      <GoogleMapCanvas
        retryKey={retryKey}
        onMapReady={(map) => { mapInstanceRef.current = map; setMapReady(true) }}
        onLoadError={() => setMapLoadError(true)}
        onUserLocationUpdate={(pos) => { userLocationRef.current = pos }}
        onSearchCenterRestore={(pos) => setSearchCenter(pos)}
      />
    </div>
  )
}
