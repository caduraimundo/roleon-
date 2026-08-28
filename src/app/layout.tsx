import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google"
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import ChunkErrorReloader from "@/components/ChunkErrorReloader";
import Script from "next/script";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://www.roleon.com.br"),
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
    url: "https://www.roleon.com.br",
    images: [
      {
        url: "/og-image.png",
        alt: "Roleon",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
        <ChunkErrorReloader />
        {children}
      </body>
    </html>
  );
}
