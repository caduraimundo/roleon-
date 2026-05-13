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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/auth/reset-password')
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
