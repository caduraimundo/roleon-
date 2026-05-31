'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function PortalEntrada() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
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

  if (loading) return null

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 56px)',
    }}>
      <div style={{
        background: '#fff',
        width: 400,
        borderRadius: 16,
        padding: 40,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
          Portal do Produtor
        </p>
        <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 6, marginBottom: 0 }}>
          Acesse sua conta para gerenciar seus eventos
        </p>
        <div style={{ marginTop: 28 }}>
          <button
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/auth/callback?next=/produtor/pos-login`,
                },
              })
            }
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 10,
              background: '#0EA5A0',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#fff"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#fff"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#fff"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#fff"/>
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    </div>
  )
}
