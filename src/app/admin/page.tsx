'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── TOKENS ──────────────────────────────────────────────────────────────────
const TEAL   = '#0EA5A0'
const TEAL_BG = '#E6F7F6'
const TEXT   = '#1A1A1A'
const DIM    = '#6E6E73'
const BG     = '#F7F7F7'
const WHITE  = '#FFFFFF'
const BORDER = '#E5E5EA'
const RED    = '#FF3B30'

// ── TIPOS ───────────────────────────────────────────────────────────────────
type Tab = 'moderacao' | 'produtores' | 'vendas' | 'mais'
type MaisSection = 'ingressos' | 'logs' | 'cupons' | null

// ── ÍCONES ──────────────────────────────────────────────────────────────────
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2.5L4 5.5v5c0 4.2 3 8.1 7 9 4-.9 7-4.8 7-9v-5L11 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M8.5 11l1.8 1.8 3.2-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="9" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M3 18.5c1-3 3-4.5 6-4.5s5 1.5 6 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="16" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M18.5 17.5c-.8-2.2-2.2-3.5-4-3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconBarChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="12" width="3.5" height="7" rx="1" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="9.2" y="7.5" width="3.5" height="11.5" rx="1" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="15.5" y="3.5" width="3.5" height="15.5" rx="1" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  )
}
function IconGrid() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="12.5" y="3" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="3" y="12.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="12.5" y="12.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  )
}
function IconTicket() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M3 8a2 2 0 012-2h12a2 2 0 012 2v1a2 2 0 000 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1a2 2 0 000-4V8z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M14 6.5v9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 2"/>
    </svg>
  )
}
function IconFileText() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M5 2h8.5L19 7.5V20H5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M13 2v6h6M8 10.5h6M8 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconTag() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M3 3h8l8 8-8 8-8-8V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/>
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="#C8C8C8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── HEADER ───────────────────────────────────────────────────────────────────
function AdminHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div style={{
      width: '100%',
      background: WHITE,
      borderBottom: `0.5px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 56,
      paddingLeft: 20, paddingRight: 20,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      flexShrink: 0,
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 30, height: 30, background: TEAL, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: WHITE, fontSize: 15, fontWeight: 800, flexShrink: 0,
        }}>R</div>
        <span style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>Roleon</span>
        <span style={{
          fontSize: 10, color: DIM,
          border: `1px solid ${BORDER}`, borderRadius: 4,
          padding: '2px 6px', letterSpacing: 0.5, fontWeight: 600,
          fontFamily: "'Noto Sans', sans-serif",
        }}>ADMIN</span>
      </div>
      <button
        onClick={onSignOut}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: RED, fontSize: 13, fontWeight: 600,
          fontFamily: "'Noto Sans', sans-serif",
          padding: '4px 0',
        }}
      >Sair</button>
    </div>
  )
}

// ── BOTTOM NAV ───────────────────────────────────────────────────────────────
function AdminBottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const items: { id: Tab; label: string; Icon: () => JSX.Element }[] = [
    { id: 'moderacao',  label: 'Moderacao',  Icon: IconShield   },
    { id: 'produtores', label: 'Produtores', Icon: IconUsers    },
    { id: 'vendas',     label: 'Vendas',     Icon: IconBarChart },
    { id: 'mais',       label: 'Mais',       Icon: IconGrid     },
  ]
  return (
    <div style={{
      width: '100%',
      background: WHITE,
      borderTop: `0.5px solid ${BORDER}`,
      display: 'flex',
      paddingTop: 10,
      paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
      flexShrink: 0,
    }}>
      {items.map(({ id, label, Icon }) => {
        const on = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: on ? TEAL : '#C7C7CC',
              fontFamily: "'Noto Sans', sans-serif",
              fontSize: 10, fontWeight: on ? 700 : 500,
              padding: '2px 0',
            }}
          >
            <Icon />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── PLACEHOLDER (sections ainda nao implementadas) ────────────────────────────
function PlaceholderSection({ title, icon, desc }: { title: string; icon: JSX.Element; desc: string }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '40px 32px', color: DIM,
      fontFamily: "'Noto Sans', sans-serif",
      textAlign: 'center',
    }}>
      <div style={{ color: '#C7C7CC' }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{desc}</div>
      <div style={{
        marginTop: 8, background: TEAL_BG, color: TEAL,
        borderRadius: 8, padding: '6px 14px',
        fontSize: 12, fontWeight: 600,
      }}>Em breve</div>
    </div>
  )
}

// ── SECAO "MAIS" ─────────────────────────────────────────────────────────────
function MaisSection({ onNavigate }: { onNavigate: (s: MaisSection) => void }) {
  const items = [
    { id: 'ingressos' as MaisSection, label: 'Ingressos',        desc: 'Buscar, ver detalhes e reembolsar', Icon: IconTicket   },
    { id: 'logs'      as MaisSection, label: 'Logs',             desc: 'Webhook e auditoria de tickets',   Icon: IconFileText },
    { id: 'cupons'    as MaisSection, label: 'Cupons',           desc: 'Listar e desativar cupons',        Icon: IconTag      },
  ]
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', fontFamily: "'Noto Sans', sans-serif" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 20, letterSpacing: -0.4 }}>Mais</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(({ id, label, desc, Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              background: WHITE, border: `0.5px solid ${BORDER}`,
              borderRadius: 12, padding: '13px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', cursor: 'pointer', textAlign: 'left',
              fontFamily: "'Noto Sans', sans-serif",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: TEAL_BG, color: TEAL,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: TEXT }}>{label}</div>
              <div style={{ fontSize: 12, color: DIM, marginTop: 2 }}>{desc}</div>
            </div>
            <IconChevronRight />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── PAGE ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('moderacao')
  const [maisSection, setMaisSection] = useState<MaisSection>(null)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile?.role !== 'admin') { router.replace('/'); return }
      setLoading(false)
    }
    check()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', background: BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="16" cy="16" r="13" stroke="#E0E0E0" strokeWidth="3"/>
          <path d="M16 3a13 13 0 0113 13" stroke={TEAL} strokeWidth="3" strokeLinecap="round"/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </svg>
      </div>
    )
  }

  // Resolve qual conteudo mostrar
  const renderContent = () => {
    // Aba "Mais" com subsecao aberta
    if (tab === 'mais' && maisSection === 'ingressos') {
      return (
        <>
          <div style={{ width: '100%', background: WHITE, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', height: 48, paddingLeft: 16, gap: 10, flexShrink: 0 }}>
            <button onClick={() => setMaisSection(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: 14, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif", padding: 0 }}>← Mais</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Noto Sans', sans-serif" }}>Ingressos</span>
          </div>
          <PlaceholderSection title="Gestao de Ingressos" icon={<IconTicket />} desc="Buscar ingresso por codigo, ver detalhes, emitir reembolso e historico de check-ins." />
        </>
      )
    }
    if (tab === 'mais' && maisSection === 'logs') {
      return (
        <>
          <div style={{ width: '100%', background: WHITE, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', height: 48, paddingLeft: 16, gap: 10, flexShrink: 0 }}>
            <button onClick={() => setMaisSection(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: 14, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif", padding: 0 }}>← Mais</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Noto Sans', sans-serif" }}>Logs</span>
          </div>
          <PlaceholderSection title="Logs e Monitoramento" icon={<IconFileText />} desc="Webhook logs do Pagar.me e historico de transicoes de status dos tickets." />
        </>
      )
    }
    if (tab === 'mais' && maisSection === 'cupons') {
      return (
        <>
          <div style={{ width: '100%', background: WHITE, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', height: 48, paddingLeft: 16, gap: 10, flexShrink: 0 }}>
            <button onClick={() => setMaisSection(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: 14, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif", padding: 0 }}>← Mais</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Noto Sans', sans-serif" }}>Cupons</span>
          </div>
          <PlaceholderSection title="Gestao de Cupons" icon={<IconTag />} desc="Listar todos os cupons ativos na plataforma e desativar em caso de abuso." />
        </>
      )
    }
    // Abas principais
    if (tab === 'moderacao') {
      return <PlaceholderSection title="Moderacao de Eventos" icon={<IconShield />} desc="Lista de eventos aguardando aprovacao. Aprovar, rejeitar com motivo ou cancelar eventos ativos." />
    }
    if (tab === 'produtores') {
      return <PlaceholderSection title="Gestao de Produtores" icon={<IconUsers />} desc="Lista de produtores, detalhe, conceder/remover selo Verificado e desativar/reativar conta." />
    }
    if (tab === 'vendas') {
      return <PlaceholderSection title="Vendas e Repasses" icon={<IconBarChart />} desc="Dashboard de vendas, repasses pendentes, status do cron D+3 e forcar repasse manual." />
    }
    // tab === 'mais' sem subsecao
    return <MaisSection onNavigate={(s) => setMaisSection(s)} />
  }

  return (
    <div style={{
      minHeight: '100dvh', background: BG,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      {/* Header full-width */}
      <AdminHeader onSignOut={handleSignOut} />

      {/* Conteudo centralizado 480px */}
      <div style={{
        flex: 1, width: '100%', maxWidth: 480, margin: '0 auto',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {renderContent()}
      </div>

      {/* Bottom nav full-width */}
      <div style={{ width: '100%' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <AdminBottomNav
            active={tab}
            onChange={(t) => { setTab(t); setMaisSection(null) }}
          />
        </div>
      </div>
    </div>
  )
}
