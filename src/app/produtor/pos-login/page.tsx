'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function PosLogin() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/produtor'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'producer') {
        router.replace('/produtor/painel')
      } else {
        router.replace('/produtor/cadastro')
      }
    }
    check()
  }, [router])

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: 'calc(100vh - 56px)',
    }}>
      <p style={{ color: '#6E6E73', fontFamily: "'Noto Sans', sans-serif", fontSize: 14 }}>
        Carregando...
      </p>
    </div>
  )
}
