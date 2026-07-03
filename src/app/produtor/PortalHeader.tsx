'use client'
import { usePathname, useRouter } from 'next/navigation'
import ProducerHeader from './ProducerHeader'

export default function PortalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const isCadastro = pathname === '/produtor/cadastro'

  if (isCadastro) {
    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff',
        boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ position: 'absolute', left: 16 }}>
          <button
            onClick={() => router.push('/')}
            aria-label="Voltar"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#F7F7F7', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'none', flexShrink: 0,
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', letterSpacing: -0.5 }}>
          Portal do Produtor
        </span>
      </div>
    )
  }

  return (
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
  )
}
