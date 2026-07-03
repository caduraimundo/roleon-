import { Noto_Sans } from 'next/font/google'
import PortalHeader from './PortalHeader'
import BottomNav from './BottomNav'

const noto = Noto_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={noto.className}
      style={{ minHeight: '100vh', background: '#F7F7F7' }}>
      <PortalHeader />
      <main style={{ paddingBottom: 80 }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
