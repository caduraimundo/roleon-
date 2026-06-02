'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function ProducerHeader() {
  const [name, setName] = useState('')
  const [initials, setInitials] = useState('')
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const supabase = createClientComponentClient()
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
    const supabase = createClientComponentClient()
    await supabase.auth.signOut()
    router.push('/produtor')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: '#0EA5A0', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
        flexShrink: 0,
      }}>
        {initials || '?'}
      </div>

      {name && (
        <span style={{
          fontSize: 13.5, fontWeight: 500, color: '#1A1A1A',
          maxWidth: 160, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
      )}

      <span style={{ width: 1, height: 18, background: '#E8E8E8', flexShrink: 0 }} />

      <button
        onClick={handleSignOut}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13.5, fontWeight: 500, color: '#6E6E73',
          padding: '4px 0',
        }}
      >
        Sair
      </button>
    </div>
  )
}
