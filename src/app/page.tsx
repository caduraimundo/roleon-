'use client';

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from "next/dynamic";
import { supabase } from '../lib/supabase'

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-white text-gray-500">
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

  // Cobre login via popup (SIGNED_IN dispara quando popup fecha)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/auth/reset-password')
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()
        if (profile?.role === 'admin') router.replace('/admin')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="h-screen w-full">
      <MapClient />
    </div>
  );
}
