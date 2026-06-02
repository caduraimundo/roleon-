import { Noto_Sans } from 'next/font/google'
import ProducerHeader from './ProducerHeader'

const noto = Noto_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={noto.className} style={{ minHeight: '100vh', background: '#F9F9F9' }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #E8E8E8',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0EA5A0', letterSpacing: -0.5 }}>
          Roleon
        </span>
        <span style={{ width: 1, height: 18, background: '#E8E8E8' }} />
        <span style={{ fontSize: 13, color: '#6E6E73', fontWeight: 500 }}>
          Portal do Produtor
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <ProducerHeader />
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
