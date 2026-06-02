export default function AnalisesPage() {
  return (
    <div style={{
      maxWidth: 480, margin: '0 auto',
      padding: '48px 24px', textAlign: 'center',
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: '#E6F7F6', color: '#0EA5A0',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 20px',
      }}>
        <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
          <path d="M3 18.5h16" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round"/>
          <rect x="5" y="11" width="2.8" height="6" rx="0.6"
            fill="none" stroke="currentColor" strokeWidth="1.6"/>
          <rect x="9.6" y="7" width="2.8" height="10" rx="0.6"
            fill="none" stroke="currentColor" strokeWidth="1.6"/>
          <rect x="14.2" y="9.5" width="2.8" height="7.5" rx="0.6"
            fill="none" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A',
        margin: '0 0 8px', letterSpacing: -0.4 }}>
        Análises
      </h1>
      <p style={{ fontSize: 14, color: '#6E6E73',
        margin: 0, lineHeight: 1.6 }}>
        Em breve voce vai acompanhar o desempenho dos seus eventos,
        vendas por periodo e muito mais.
      </p>
    </div>
  )
}
