'use client'
export default function SentryTest() {
  return (
    <button onClick={() => { throw new Error('Teste Sentry Roleon') }}>
      Disparar erro de teste
    </button>
  )
}
