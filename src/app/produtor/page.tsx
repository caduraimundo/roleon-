'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function PortalEntrada() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        sessionStorage.setItem('openAuthAsProducer', '1')
        router.replace('/')
        return
      }
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
    })
  }, [router])

  return null
}
