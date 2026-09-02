'use client';

export default function AppLoadingScreen({ fullScreen = true, dark = false }: { fullScreen?: boolean; dark?: boolean }) {
  const iconSize = fullScreen ? 64 : 40
  return (
    <div style={{
      ...(fullScreen ? { minHeight: '100dvh' } : { paddingTop: 80 }),
      background: fullScreen ? (dark ? '#1A1A1A' : '#F7F7F7') : 'transparent',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    }}>
      <img
        src="/icons/icon-192.png"
        alt="Roleon"
        width={iconSize}
        height={iconSize}
        style={{ objectFit: 'contain', animation: 'pulse-opacity 1.6s ease-in-out infinite' }}
      />
      <style>{`
        @keyframes pulse-opacity {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#9A9A9A' : '#6E6E73', fontFamily: "'Noto Sans', sans-serif" }}>
        Carregando...
      </span>
    </div>
  )
}
