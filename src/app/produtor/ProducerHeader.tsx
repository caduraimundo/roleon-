'use client'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function ProducerHeader() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
<button
        onClick={handleSignOut}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, color: '#6E6E73',
          padding: '4px 0', flexShrink: 0,
        }}
      >
        Sair
      </button>
    </div>
  )
}
