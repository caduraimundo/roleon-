'use client'
import * as Sentry from "@sentry/nextjs"

export default function SentryTest() {
  const handleTest = () => {
    try {
      throw new Error('Teste Sentry Roleon - ' + new Date().toISOString())
    } catch (e) {
      Sentry.captureException(e)
      alert('Erro enviado ao Sentry!')
    }
  }

  return (
    <button onClick={handleTest}>
      Disparar erro de teste
    </button>
  )
}
