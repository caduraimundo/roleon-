'use client';

export default function LoadingError({
  message,
  onRetry,
  dark,
}: {
  message: string
  onRetry: () => void
  dark: boolean
}) {
  return (
    <>
      <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#9A9A9A' : '#6E6E73', fontFamily: "'Noto Sans', sans-serif", textAlign: 'center', padding: '0 32px' }}>
        {message}
      </span>
      <button
        onClick={onRetry}
        style={{
          marginTop: 8, height: 44, padding: '0 20px', borderRadius: 10,
          background: '#0EA5A0', color: '#fff', border: 0, cursor: 'pointer',
          fontSize: 13, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif",
          boxShadow: '0 6px 14px rgba(14,165,160,0.28)',
        }}
      >
        Tentar novamente
      </button>
    </>
  )
}
