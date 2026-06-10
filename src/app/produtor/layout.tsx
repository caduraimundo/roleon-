import { Noto_Sans } from 'next/font/google'
import ProducerHeader from './ProducerHeader'
import BottomNav from './BottomNav'

const noto = Noto_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={noto.className}
      style={{ minHeight: '100vh', background: '#F7F7F7' }}>

      <header style={{
        background: '#fff',
        borderBottom: '1px solid #E8E8E8',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky' as const,
        top: 0,
        zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 26, height: 26, borderRadius: 7,
            background: '#0EA5A0', color: '#fff',
            display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800, fontSize: 14, letterSpacing: -0.5,
          }}>R</span>
          <span style={{
            fontSize: 17, fontWeight: 800,
            color: '#1A1A1A', letterSpacing: -0.5,
          }}>Roleon</span>
          <span style={{
            background: '#E6F7F6', color: '#0EA5A0',
            fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4,
            textTransform: 'uppercase' as const,
            padding: '4px 10px', borderRadius: 999,
            lineHeight: 1,
          }}>Produtor</span>
        </div>
        <ProducerHeader />
      </header>

      <main style={{ paddingBottom: 80 }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
