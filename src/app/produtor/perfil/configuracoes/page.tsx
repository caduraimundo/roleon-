'use client'

import { useRouter } from 'next/navigation'

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="#C8C8C8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '0.5px solid #E5E5EA',
  borderRadius: 12,
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  textAlign: 'left',
  textDecoration: 'none',
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: 0.5,
  color: '#6E6E73',
  marginBottom: 8,
  textTransform: 'uppercase',
}

export default function ConfiguracoesProdutorPage() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100dvh', background: '#F7F7F7',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 16, paddingRight: 16,
        background: '#fff',
        borderBottom: '0.5px solid #EFEFEF',
        position: 'relative',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            position: 'absolute', left: 16,
            width: 36, height: 36, borderRadius: '50%',
            background: '#F7F7F7', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4.5L6.5 9L11 13.5" stroke="#1A1A1A" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 700, color: '#1A1A1A',
        }}>
          Configuracoes
        </div>
      </div>

      {/* Conteudo */}
      <div style={{ flex: 1, padding: '28px 20px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* PRIVACIDADE */}
        <div>
          <div style={sectionLabelStyle}>PRIVACIDADE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="/privacidade" style={cardStyle}>
              <span style={{ fontSize: 15, color: '#1A1A1A' }}>Politica de privacidade</span>
              <IconChevronRight />
            </a>
            <a href="/termos" style={cardStyle}>
              <span style={{ fontSize: 15, color: '#1A1A1A' }}>Termos do produtor</span>
              <IconChevronRight />
            </a>
          </div>
        </div>

      </div>

    </div>
  )
}
