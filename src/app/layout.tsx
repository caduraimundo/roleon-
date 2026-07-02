import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google"
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import Script from "next/script";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: {
    default: "Roleon",
    template: "%s | Roleon",
  },
  description: "Descubra shows, festas e eventos culturais perto de voce. Compre seu ingresso com seguranca.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Roleon",
  },
  openGraph: {
    type: "website",
    siteName: "Roleon",
    title: "Roleon - Eventos e Ingressos",
    description: "Descubra shows, festas e eventos culturais perto de voce. Compre seu ingresso com seguranca.",
    locale: "pt_BR",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,marker&v=beta&loading=async`}
          strategy="beforeInteractive"
        />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
