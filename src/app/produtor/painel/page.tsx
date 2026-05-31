'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function PainelPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/produtor'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'producer') { router.replace('/produtor/cadastro'); return }

      setUserName(profile?.name ?? '')
      setUserEmail(profile?.email ?? user.email ?? '')
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <p style={{ color: '#6E6E73', fontSize: 14 }}>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
          Bem-vindo, {userName}!
        </p>
        <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 4, marginBottom: 0 }}>
          {userEmail}
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid #F0F0F0', margin: '24px 0' }} />

        <div style={{ background: '#F0FAFA', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0EA5A0', margin: 0 }}>
            Seu portal está sendo construído.
          </p>
          <p style={{ fontSize: 13, color: '#6E6E73', marginTop: 4, marginBottom: 0 }}>
            Em breve você poderá gerenciar seus eventos, acompanhar vendas e fazer check-in.
          </p>
        </div>

        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace('/produtor') }}
          style={{
            marginTop: 28,
            background: 'transparent',
            border: '1px solid #E8E8E8',
            borderRadius: 10,
            padding: '10px 20px',
            color: '#6E6E73',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>
    </div>
  )
}
