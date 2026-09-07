'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginActivityLogger() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        fetch('/api/auth/log-session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => {})
      }
    })
    return () => subscription.unsubscribe()
  }, [])
  return null
}
