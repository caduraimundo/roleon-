import { MapShellProvider } from './map-shell-context'

export default function ConsumidorLayout({
  children,
  map,
}: {
  children: React.ReactNode
  map: React.ReactNode
}) {
  return (
    <MapShellProvider>
      {map}
      {children}
    </MapShellProvider>
  )
}
