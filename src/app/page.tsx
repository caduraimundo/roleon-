'use client';

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from "next/dynamic";
import { supabase } from '../lib/supabase'

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-white text-gray-500">
      Carregando o mapa...
    </div>
  ),
});

export default function Home() {
  const router = useRouter()

  // Cobre sessão já ativa (refresh de página com admin logado)
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()
      if (profile?.role === 'admin') router.replace('/admin')
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/auth/reset-password')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="h-dvh w-full">
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: 24, textAlign: 'center',
        background: '#fff',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
          Roleon
        </h1>
        <p style={{ fontSize: 14, color: '#6E6E73', maxWidth: 320, margin: 0 }}>
          Descubra shows, festas e eventos culturais perto de você. Compre seu ingresso com segurança.
        </p>
        <a href="/privacidade" style={{ fontSize: 13, color: '#0EA5A0', marginTop: 8 }}>
          Política de Privacidade
        </a>
      </div>
      <MapClient />
    </div>
  );
}
