'use client';

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from "next/dynamic";
import Script from "next/script";
import { supabase } from '../lib/supabase'
import AppLoadingScreen from '../components/AppLoadingScreen'

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => <AppLoadingScreen absolute background="#fff" />,
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
    <>
    <Script
      src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,marker&v=beta&loading=async`}
      strategy="beforeInteractive"
    />
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
          Descubra shows, festas e eventos culturais perto de você. Entre com sua conta Google pra comprar ingressos com segurança e salvar seus eventos favoritos.
        </p>
        <a href="/privacidade" style={{ fontSize: 13, color: '#0EA5A0', marginTop: 8 }}>
          Política de Privacidade
        </a>
      </div>
      <MapClient />
    </div>
    </>
  );
}
