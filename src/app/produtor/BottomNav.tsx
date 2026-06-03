'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HIDDEN = ['/produtor', '/produtor/cadastro', '/produtor/pos-login']

function getActiveTab(pathname: string): string {
  if (pathname.startsWith('/produtor/analises')) return 'analises'
  if (pathname.startsWith('/produtor/perfil'))   return 'perfil'
  if (pathname.startsWith('/produtor/eventos'))  return 'eventos'
  if (pathname.startsWith('/produtor/painel'))   return 'inicio'
  return 'inicio'
}

const tabs = [
  { id: 'inicio',   label: 'Início',   href: '/produtor/painel' },
  { id: 'eventos',  label: 'Eventos',  href: '/produtor/eventos' },
  { id: 'analises', label: 'Análises', href: '/produtor/analises' },
  { id: 'perfil',   label: 'Perfil',   href: '/produtor/perfil' },
]

function IconInicio() {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L11 3.5l8 7V18a1.5 1.5 0 01-1.5 1.5h-3v-5h-7v5h-3A1.5 1.5 0 013 18v-7.5z"/>
    </svg>
  )
}

function IconEventos() {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M3 9h16M7 2.5v4M15 2.5v4"/>
    </svg>
  )
}

function IconAnalises() {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="2" y="9.5" width="5" height="11" rx="1.5"/>
      <rect x="8.5" y="13.5" width="5" height="7" rx="1.5"/>
      <rect x="15" y="5.5" width="5" height="15" rx="1.5"/>
    </svg>
  )
}

function IconPerfil() {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M4 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/>
    </svg>
  )
}

const icons: Record<string, () => React.ReactElement> = {
  inicio:   IconInicio,
  eventos:  IconEventos,
  analises: IconAnalises,
  perfil:   IconPerfil,
}

export default function BottomNav() {
  const pathname = usePathname()

  if (!pathname || HIDDEN.includes(pathname)) return null

  const activeTab = getActiveTab(pathname)

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      background: '#fff',
      borderTop: '1px solid #EAEAEA',
      display: 'flex',
      zIndex: 50,
      boxShadow: '0 -4px 14px rgba(0,0,0,0.04)',
      paddingTop: '10px',
      paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
    }}>
      {tabs.map(item => {
        const active = activeTab === item.id
        const Icon = icons[item.id]
        return (
          <Link key={item.id} href={item.href} style={{
            flex: 1,
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 0 4px',
            gap: 3,
            color: active ? '#0EA5A0' : '#9A9A9A',
            fontFamily: "'Noto Sans', sans-serif",
            fontSize: 10.5,
            fontWeight: active ? 600 : 500,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: 4,
              width: 48,
              height: 26,
              borderRadius: 999,
              background: active ? '#E6F7F6' : 'transparent',
              transition: 'background 200ms',
            }}/>
            <span style={{ position: 'relative', zIndex: 1 }}>
              <Icon />
            </span>
            <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
