'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function ProducerHeader() {
  const [name, setName] = useState('')
  const [initials, setInitials] = useState('')
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_initials')
        .eq('id', user.id)
        .single()
      if (profile) {
        setName(profile.name ?? '')
        setInitials(profile.avatar_initials ?? '')
      }
    })()
  }, [])

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
      {name && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 4px 5px 10px',
          background: '#fff',
          border: '0.5px solid #E8E8E8',
          borderRadius: 999,
        }}>
          <span style={{
            fontSize: 12.5, fontWeight: 700, color: '#1A1A1A',
            maxWidth: 110, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</span>
          <span style={{
            background: '#E6F7F6', color: '#0EA5A0',
            fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4,
            textTransform: 'uppercase' as const,
            padding: '3px 8px', borderRadius: 999,
            lineHeight: 1,
          }}>Produtor</span>
        </div>
      )}
      <button
        onClick={() => router.push('/')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, color: '#6E6E73',
          padding: '4px 0', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path d="M3 9.5L10 3l7 6.5" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 8v8a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V8"
            stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Roleon
      </button>
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
