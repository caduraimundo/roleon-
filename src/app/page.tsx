'use client';
import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-white text-gray-500">
      Carregando o mapa...
    </div>
  ),
});

export default function Home() {
  return (
    <div className="h-screen w-full">
      <MapClient />
    </div>
  );
}
