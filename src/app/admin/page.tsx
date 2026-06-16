'use client'

import React, { useEffect, useState } from 'react'
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
      paddingLeft: 24, paddingRight: 24,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      flexShrink: 0,
      fontFamily: "'Noto Sans', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, background: TEAL, borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: WHITE, fontSize: 14, fontWeight: 800, flexShrink: 0,
        }}>R</div>
        <span style={{ fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: -0.5 }}>Roleon</span>
        <span style={{
          fontSize: 9.5, color: TEAL,
          background: TEAL_BG, borderRadius: 999,
          padding: '4px 10px', letterSpacing: 0.4, fontWeight: 800,
          textTransform: 'uppercase' as const,
          fontFamily: "'Noto Sans', sans-serif",
          lineHeight: 1,
        }}>ADMIN</span>
      </div>
      <button
        onClick={onSignOut}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: DIM, fontSize: 13, fontWeight: 500,
          fontFamily: "'Noto Sans', sans-serif",
          padding: '4px 0',
        }}
      >Sair</button>
    </div>
  )
}

// ── BOTTOM NAV ───────────────────────────────────────────────────────────────
function AdminBottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const items: { id: Tab; label: string; Icon: () => React.JSX.Element }[] = [
    { id: 'moderacao',  label: 'Moderação',  Icon: IconShield   },
    { id: 'produtores', label: 'Produtores', Icon: IconUsers    },
    { id: 'vendas',     label: 'Vendas',     Icon: IconBarChart },
    { id: 'mais',       label: 'Mais',       Icon: IconGrid     },
  ]
  return (
    <div style={{
      width: '100%',
      background: WHITE,
      borderTop: '1px solid #EAEAEA',
      boxShadow: '0 -4px 14px rgba(0,0,0,0.04)',
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
              fontSize: 10.5, fontWeight: on ? 600 : 500,
              padding: '2px 0',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', top: 4, width: 48, height: 26, borderRadius: 999, background: on ? TEAL_BG : 'transparent' }} />
            <span style={{ position: 'relative', zIndex: 1 }}><Icon /></span>
            <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── PLACEHOLDER (sections ainda nao implementadas) ────────────────────────────
function PlaceholderSection({ title, icon, desc }: { title: string; icon: React.JSX.Element; desc: string }) {
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
function MaisSection({ onNavigate, onSignOut }: { onNavigate: (s: MaisSection) => void; onSignOut: () => void }) {
  const router = useRouter()
  const items = [
    { id: 'ingressos' as MaisSection, label: 'Ingressos',        desc: 'Buscar, ver detalhes e reembolsar', Icon: IconTicket   },
    { id: 'logs'      as MaisSection, label: 'Logs',             desc: 'Webhook e auditoria de tickets',   Icon: IconFileText },
    { id: 'cupons'    as MaisSection, label: 'Cupons',           desc: 'Listar e desativar cupons',        Icon: IconTag      },
  ]

  const handleVoltar = () => router.push('/')

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
        <button
          onClick={onSignOut}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: '#9A9A9A',
            padding: '6px 0', marginTop: 16,
            letterSpacing: 0.1,
            fontFamily: "'Noto Sans', sans-serif",
            width: '100%',
          }}
        >
          Sair da conta
        </button>
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

  // Moderacao
  const [pendingEvents, setPendingEvents] = useState<any[]>([])
  const [activeEvents, setActiveEvents] = useState<any[]>([])
  const [modLoading, setModLoading] = useState(false)
  const [modFilter, setModFilter] = useState<'pending' | 'active' | 'cancelled' | 'rejected' | 'todos'>('pending')
  const [actionId, setActionId] = useState<string | null>(null)
  const [motivoSheet, setMotivoSheet] = useState<{ id: string; tipo: 'rejeitar' | 'cancelar' } | null>(null)
  const [motivo, setMotivo] = useState('')
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const [modSearch, setModSearch] = useState('')
  const [detailEvent, setDetailEvent] = useState<any | null>(null)
  const [detailData, setDetailData] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Produtores
  const [producers, setProducers] = useState<any[]>([])
  const [prodLoading, setProdLoading] = useState(false)
  const [prodFilter, setProdFilter] = useState<'todos' | 'verificados' | 'desativados'>('todos')
  const [prodSearch, setProdSearch] = useState('')
  const [prodDetail, setProdDetail] = useState<any | null>(null)
  const [prodDetailData, setProdDetailData] = useState<{ producer: any; events: any[] } | null>(null)
  const [prodDetailLoading, setProdDetailLoading] = useState(false)
  const [prodActionLoading, setProdActionLoading] = useState(false)
  const [prodFeedback, setProdFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

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

  const loadModeracao = async () => {
    setModLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    const [r1, r2] = await Promise.all([
      fetch('/api/admin/fila', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/admin/events/active', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const d1 = await r1.json()
    const d2 = await r2.json()
    setPendingEvents(d1.events ?? [])
    setActiveEvents(d2.events ?? [])
    setModLoading(false)
  }

  const openDetail = async (ev: any) => {
    setDetailEvent(ev)
    setDetailLoading(true)
    const { data } = await supabase
      .from('events')
      .select('id, title, description, genre, event_date, location_name, price, is_free, cover_image, producer_id, profiles!producer_id(name, email, avatar_initials), ticket_types(id, name, price, quantity, quantity_sold)')
      .eq('id', ev.id)
      .maybeSingle()
    setDetailData(data)
    setDetailLoading(false)
  }

  const aprovar = async (eventId: string) => {
    setActionId(eventId)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/events/${eventId}/approve`, {
      method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    if (res.ok) {
      setPendingEvents(prev => prev.filter(e => e.id !== eventId))
      setFeedback({ tipo: 'ok', msg: 'Evento aprovado e produtor notificado.' })
    } else {
      setFeedback({ tipo: 'erro', msg: 'Erro ao aprovar evento.' })
    }
    setActionId(null)
    setTimeout(() => setFeedback(null), 3500)
  }

  const confirmarMotivo = async () => {
    if (!motivoSheet || !motivo.trim()) return
    setActionId(motivoSheet.id)
    const { data: { session } } = await supabase.auth.getSession()
    const endpoint = motivoSheet.tipo === 'rejeitar'
      ? `/api/admin/events/${motivoSheet.id}/reject`
      : `/api/admin/events/${motivoSheet.id}/cancel`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ motivo }),
    })
    if (res.ok) {
      if (motivoSheet.tipo === 'rejeitar') {
        setPendingEvents(prev => prev.filter(e => e.id !== motivoSheet.id))
        setFeedback({ tipo: 'ok', msg: 'Evento rejeitado e produtor notificado.' })
      } else {
        setActiveEvents(prev => prev.map(e => e.id === motivoSheet.id ? { ...e, status: 'cancelled' } : e))
        setFeedback({ tipo: 'ok', msg: 'Evento cancelado e produtor notificado.' })
      }
    } else {
      setFeedback({ tipo: 'erro', msg: 'Erro ao processar ação.' })
    }
    setMotivoSheet(null)
    setMotivo('')
    setActionId(null)
    setTimeout(() => setFeedback(null), 3500)
  }

  const loadProdutores = async () => {
    setProdLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/producers', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const d = await res.json()
    setProducers(d.producers ?? [])
    setProdLoading(false)
  }

  const openProdDetail = async (p: any) => {
    setProdDetail(p)
    setProdDetailLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/producers/${p.id}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const d = await res.json()
    setProdDetailData(d)
    setProdDetailLoading(false)
  }

  const prodAction = async (id: string, field: 'verified' | 'producer_disabled', value: boolean) => {
    setProdActionLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/producers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      setProducers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
      if (prodDetail?.id === id) setProdDetail((prev: any) => ({ ...prev, [field]: value }))
      if (prodDetailData?.producer?.id === id) {
        setProdDetailData(prev => prev ? { ...prev, producer: { ...prev.producer, [field]: value } } : prev)
      }
      const msgs: Record<string, string> = {
        'verified-true':           'Selo Verificado concedido.',
        'verified-false':          'Selo Verificado removido.',
        'producer_disabled-true':  'Produtor desativado.',
        'producer_disabled-false': 'Produtor reativado.',
      }
      setProdFeedback({ tipo: 'ok', msg: msgs[`${field}-${value}`] ?? 'Atualizado.' })
    } else {
      setProdFeedback({ tipo: 'erro', msg: 'Erro ao atualizar produtor.' })
    }
    setProdActionLoading(false)
    setTimeout(() => setProdFeedback(null), 3000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  useEffect(() => {
    if (tab === 'moderacao' && !modLoading && pendingEvents.length === 0 && activeEvents.length === 0) {
      loadModeracao()
    }
    if (tab === 'produtores' && !prodLoading && producers.length === 0) {
      loadProdutores()
    }
  }, [tab])

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
          <div style={{ width: '100%', background: WHITE, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56, position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setMaisSection(null)} style={{ position: 'absolute', left: 16, width: 36, height: 36, borderRadius: '50%', background: '#F7F7F7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Noto Sans', sans-serif" }}>Ingressos</span>
          </div>
          <PlaceholderSection title="Gestao de Ingressos" icon={<IconTicket />} desc="Buscar ingresso por codigo, ver detalhes, emitir reembolso e historico de check-ins." />
        </>
      )
    }
    if (tab === 'mais' && maisSection === 'logs') {
      return (
        <>
          <div style={{ width: '100%', background: WHITE, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56, position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setMaisSection(null)} style={{ position: 'absolute', left: 16, width: 36, height: 36, borderRadius: '50%', background: '#F7F7F7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Noto Sans', sans-serif" }}>Logs</span>
          </div>
          <PlaceholderSection title="Logs e Monitoramento" icon={<IconFileText />} desc="Webhook logs do Pagar.me e historico de transicoes de status dos tickets." />
        </>
      )
    }
    if (tab === 'mais' && maisSection === 'cupons') {
      return (
        <>
          <div style={{ width: '100%', background: WHITE, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56, position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setMaisSection(null)} style={{ position: 'absolute', left: 16, width: 36, height: 36, borderRadius: '50%', background: '#F7F7F7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Noto Sans', sans-serif" }}>Cupons</span>
          </div>
          <PlaceholderSection title="Gestao de Cupons" icon={<IconTag />} desc="Listar todos os cupons ativos na plataforma e desativar em caso de abuso." />
        </>
      )
    }
    // Abas principais
    if (tab === 'moderacao') {

      // Tela de detalhe do evento
      if (detailEvent) {
        const ev = detailData
        const badge: Record<string, { label: string; bg: string; color: string; border: string }> = {
          pending:   { label: 'Aguardando', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
          active:    { label: 'Ativo',      bg: '#E6F7F6', color: '#0A7A76', border: '#A7E8E6' },
          cancelled: { label: 'Cancelado',  bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
          rejected:  { label: 'Recusado',   bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
        }
        const b = badge[detailEvent.status] ?? badge.pending
        const producer = ev?.profiles as any
        const tickets = (ev?.ticket_types ?? []) as any[]
        const formatDate = (d: string) => d ? new Date(d.replace(' ', 'T')).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
        const formatPrice = (p: number) => p ? `R$ ${Number(p).toFixed(2).replace('.', ',')}` : 'Gratuito'

        return (
          <>
            <div style={{ width: '100%', background: WHITE, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56, position: 'relative', flexShrink: 0 }}>
              <button onClick={() => { setDetailEvent(null); setDetailData(null) }} style={{ position: 'absolute', left: 16, width: 36, height: 36, borderRadius: '50%', background: '#F7F7F7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Noto Sans', sans-serif" }}>Detalhe do Evento</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', fontFamily: "'Noto Sans', sans-serif" }}>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: DIM }}>Carregando...</div>
            ) : (
              <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Badge + título + produtor */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 6, padding: '3px 10px' }}>{b.label}</span>
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, color: TEXT, textAlign: 'center', lineHeight: 1.3, marginBottom: 4 }}>{detailEvent.title}</div>
                <div style={{ fontSize: 13, color: DIM, textAlign: 'center', marginBottom: 16 }}>{detailEvent.producer_name}</div>

                <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: 14 }} />

                {/* Informações */}
                <div style={{ fontSize: 11, fontWeight: 600, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Informações do Evento</div>
                {[
                  { label: 'Data',      value: formatDate(detailEvent.event_date) },
                  { label: 'Local',     value: detailEvent.location_name || '—' },
                  { label: 'Gênero',    value: Array.isArray(detailEvent.genre) ? detailEvent.genre.join(', ') : (detailEvent.genre || '—') },
                  { label: 'Descrição', value: ev?.description || '—' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: `1px solid #F7F7F7`, gap: 12 }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{f.label}</span>
                    <span style={{ fontSize: 13, color: TEXT, textAlign: 'right', lineHeight: 1.4 }}>{f.value}</span>
                  </div>
                ))}

                {/* Ingressos */}
                {tickets.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 6 }}>Ingressos Configurados</div>
                    {tickets.map((tk: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid #F7F7F7`, gap: 8 }}>
                        <span style={{ fontSize: 13, color: TEXT }}>{tk.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {tk.quantity && <span style={{ fontSize: 11, color: '#9CA3AF' }}>Qtd: {tk.quantity}</span>}
                          <span style={{ fontSize: 13, fontWeight: 600, color: TEAL }}>{formatPrice(tk.price)}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {ev?.is_free && tickets.length === 0 && (
                  <div style={{ fontSize: 13, color: DIM, marginTop: 12 }}>Evento gratuito</div>
                )}

                {/* Produtor */}
                <div style={{ fontSize: 11, fontWeight: 600, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 8 }}>Produtor</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: TEAL, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 13, fontWeight: 700 }}>
                    {producer?.avatar_initials || (producer?.name?.slice(0,1) ?? 'P')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{producer?.name || detailEvent.producer_name}</div>
                    <div style={{ fontSize: 12, color: DIM, marginTop: 2 }}>{producer?.email || detailEvent.producer_email}</div>
                  </div>
                </div>

                {/* Ações */}
                <div style={{ fontSize: 11, fontWeight: 600, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 20, marginBottom: 10 }}>Ações</div>
                {detailEvent.status === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => { aprovar(detailEvent.id); setDetailEvent(null); setDetailData(null) }} style={{ width: '100%', padding: 13, background: TEAL, color: WHITE, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}>Aprovar evento</button>
                    <button onClick={() => { setDetailEvent(null); setDetailData(null); setMotivoSheet({ id: detailEvent.id, tipo: 'rejeitar' }); setMotivo('') }} style={{ width: '100%', padding: 13, background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}>Rejeitar evento</button>
                  </div>
                )}
                {detailEvent.status === 'active' && (
                  <button onClick={() => { setDetailEvent(null); setDetailData(null); setMotivoSheet({ id: detailEvent.id, tipo: 'cancelar' }); setMotivo('') }} style={{ width: '100%', padding: 13, background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}>Cancelar evento</button>
                )}
              </div>
            )}
          </div>
          </>
        )
      }

      const allEvents = [...pendingEvents.map(e => ({ ...e, status: 'pending' })), ...activeEvents]
      const byStatus = modFilter === 'pending'
        ? pendingEvents.map(e => ({ ...e, status: 'pending' }))
        : activeEvents.filter(e => e.status === modFilter)

      const filtered = modSearch.trim()
        ? byStatus.filter(e =>
            e.title?.toLowerCase().includes(modSearch.toLowerCase()) ||
            e.producer_name?.toLowerCase().includes(modSearch.toLowerCase())
          )
        : byStatus

      const formatDate = (d: string) => {
        if (!d) return ''
        return new Date(d.replace(' ', 'T')).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
      }

      const formatPrice = (e: any) => e.is_free ? 'Gratuito' : `R$ ${Number(e.price ?? 0).toFixed(2).replace('.', ',')}`

      const badgeMap: Record<string, { label: string; bg: string; color: string; border: string }> = {
        pending:   { label: 'Aguardando', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
        active:    { label: 'Ativo',      bg: '#E6F7F6', color: '#0A7A76', border: '#A7E8E6' },
        cancelled: { label: 'Cancelado',  bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
        rejected:  { label: 'Recusado',   bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
      }

      return (
        <>
          <div style={{ flex: 1, padding: '16px 16px 24px', fontFamily: "'Noto Sans', sans-serif" }}>
            {/* Titulo + reload */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, letterSpacing: -0.4 }}>Moderação</div>
                <button onClick={loadModeracao} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: 13, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif", paddingBottom: 2 }}>
                  Atualizar
                </button>
              </div>
              {pendingEvents.length > 0 && (
                <div style={{ fontSize: 12, color: '#92400E', fontWeight: 600, marginTop: 4 }}>
                  {pendingEvents.length} aguardando aprovação
                </div>
              )}
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }} className="no-scrollbar">
              {([
                { id: 'pending',   label: `Aguardando (${pendingEvents.length})` },
                { id: 'active',    label: 'Ativos' },
                { id: 'cancelled', label: 'Cancelados' },
                { id: 'rejected',  label: 'Recusados' },
              ] as const).map(f => {
                const on = modFilter === f.id
                return (
                  <button key={f.id} onClick={() => setModFilter(f.id)} style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: on ? 700 : 500,
                    background: on ? TEAL : WHITE, color: on ? WHITE : '#374151',
                    border: on ? 'none' : `1px solid ${BORDER}`,
                    cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif",
                  }}>{f.label}</button>
                )
              })}
            </div>

            {/* Busca */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: DIM, pointerEvents: 'none' }}>
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                value={modSearch}
                onChange={e => setModSearch(e.target.value)}
                placeholder="Buscar por evento ou produtor"
                style={{
                  width: '100%', border: `1px solid ${BORDER}`, borderRadius: 10,
                  padding: '10px 12px 10px 34px', fontSize: 14,
                  fontFamily: "'Noto Sans', sans-serif", outline: 'none',
                  color: TEXT, background: WHITE, boxSizing: 'border-box' as const,
                }}
              />
            </div>

            {/* Feedback */}
            {feedback && (
              <div style={{
                background: feedback.tipo === 'ok' ? '#E6F7F6' : '#FEF2F2',
                color: feedback.tipo === 'ok' ? '#0A7A76' : '#991B1B',
                border: `1px solid ${feedback.tipo === 'ok' ? '#A7E8E6' : '#FECACA'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 12,
                fontSize: 13, fontWeight: 600,
              }}>{feedback.msg}</div>
            )}

            {/* Loading */}
            {modLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: DIM, fontSize: 14 }}>Carregando...</div>
            )}

            {/* Lista vazia */}
            {!modLoading && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: DIM }}>
                <div style={{ fontSize: 14 }}>Nenhum evento nesta categoria.</div>
              </div>
            )}

            {/* Cards de evento */}
            {!modLoading && filtered.map((ev: any) => {
              const badge = badgeMap[ev.status] ?? badgeMap.pending
              return (
                <div key={ev.id} style={{
                  background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
                  padding: 14, marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, lineHeight: 1.3, flex: 1 }}>{ev.title}</div>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, flexShrink: 0,
                      background: badge.bg, color: badge.color,
                      border: `1px solid ${badge.border}`,
                      borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap',
                    }}>{badge.label}</span>
                  </div>

                  <div style={{ fontSize: 12, color: DIM, marginTop: 5 }}>
                    {ev.producer_name && <span>Por {ev.producer_name} · </span>}
                    {ev.event_date && <span>{formatDate(ev.event_date)} · </span>}
                    <span>{formatPrice(ev)}</span>
                  </div>

                  {ev.location_name && (
                    <div style={{ fontSize: 11.5, color: DIM, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.location_name}</div>
                  )}

                  {/* Acoes */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => openDetail(ev)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1.5px solid ${TEAL}`, background: WHITE, color: TEAL, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}
                    >Ver</button>
                    {ev.status === 'pending' && (
                      <>
                        <button
                          onClick={() => aprovar(ev.id)}
                          disabled={actionId === ev.id}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: TEAL, color: WHITE, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: actionId === ev.id ? 0.6 : 1, fontFamily: "'Noto Sans', sans-serif" }}
                        >{actionId === ev.id ? '...' : 'Aprovar'}</button>
                        <button
                          onClick={() => { setMotivoSheet({ id: ev.id, tipo: 'rejeitar' }); setMotivo('') }}
                          disabled={actionId === ev.id}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid #FF3B30', background: 'transparent', color: '#FF3B30', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}
                        >Rejeitar</button>
                      </>
                    )}
                    {ev.status === 'active' && (
                      <button
                        onClick={() => { setMotivoSheet({ id: ev.id, tipo: 'cancelar' }); setMotivo('') }}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid #FF3B30', background: 'transparent', color: '#FF3B30', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}
                      >Cancelar evento</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom sheet de motivo */}
          {motivoSheet && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ background: WHITE, borderRadius: '16px 16px 0 0', padding: '24px 20px', width: '100%', maxWidth: 480 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                  {motivoSheet.tipo === 'rejeitar' ? 'Motivo da rejeição' : 'Motivo do cancelamento'}
                </div>
                <div style={{ fontSize: 13, color: DIM, marginBottom: 16 }}>
                  {motivoSheet.tipo === 'rejeitar'
                    ? 'Esse motivo será enviado por e-mail ao produtor.'
                    : 'O produtor será notificado por e-mail com o motivo.'}
                </div>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo..."
                  style={{
                    width: '100%', height: 100, padding: '12px 14px',
                    border: `1px solid ${BORDER}`, borderRadius: 10,
                    fontSize: 14, resize: 'none', boxSizing: 'border-box',
                    fontFamily: "'Noto Sans', sans-serif", color: TEXT, outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    onClick={() => { setMotivoSheet(null); setMotivo('') }}
                    style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, background: WHITE, color: DIM, fontSize: 14, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}
                  >Cancelar</button>
                  <button
                    onClick={confirmarMotivo}
                    disabled={!motivo.trim() || actionId !== null}
                    style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#FF3B30', color: WHITE, fontSize: 14, fontWeight: 600, cursor: motivo.trim() ? 'pointer' : 'not-allowed', opacity: !motivo.trim() || actionId !== null ? 0.6 : 1, fontFamily: "'Noto Sans', sans-serif" }}
                  >{actionId !== null ? 'Enviando...' : 'Confirmar'}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )
    }
    if (tab === 'produtores') {
      const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

      const statusBadge = (p: any) => {
        if (p.producer_disabled) return { label: 'Desativado', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' }
        if (p.verified)          return { label: 'Verificado', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' }
        return                          { label: 'Ativo',      bg: '#E6F7F6', color: '#0A7A76', border: '#A7E8E6' }
      }

      // Tela de detalhe do produtor
      if (prodDetail) {
        const p = prodDetailData?.producer ?? prodDetail
        const evs = prodDetailData?.events ?? []
        const sb = statusBadge(p)
        const initials = p.avatar_initials || p.name?.slice(0,2)?.toUpperCase() || 'P'

        return (
          <>
            <div style={{ width: '100%', background: WHITE, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56, position: 'relative', flexShrink: 0 }}>
              <button onClick={() => { setProdDetail(null); setProdDetailData(null) }} style={{ position: 'absolute', left: 16, width: 36, height: 36, borderRadius: '50%', background: '#F7F7F7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span style={{ fontSize: 17, fontWeight: 700, color: TEXT, fontFamily: "'Noto Sans', sans-serif" }}>Detalhe do Produtor</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', fontFamily: "'Noto Sans', sans-serif" }}>

            {prodDetailLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: DIM }}>Carregando...</div>
            ) : (
              <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 20 }}>
                {/* Avatar + nome + badge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 20, fontWeight: 700 }}>{initials}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{p.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, background: sb.bg, color: sb.color, border: `1px solid ${sb.border}`, borderRadius: 6, padding: '3px 10px' }}>{sb.label}</span>
                </div>

                <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: 14 }} />

                {/* Feedback */}
                {prodFeedback && (
                  <div style={{ background: prodFeedback.tipo === 'ok' ? '#E6F7F6' : '#FEF2F2', color: prodFeedback.tipo === 'ok' ? '#0A7A76' : '#991B1B', border: `1px solid ${prodFeedback.tipo === 'ok' ? '#A7E8E6' : '#FECACA'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{prodFeedback.msg}</div>
                )}

                {/* Informações */}
                <div style={{ fontSize: 11, fontWeight: 600, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Informações</div>
                {[
                  { label: 'Email',       value: p.email },
                  { label: 'CPF',         value: p.cpf || '-' },
                  { label: 'Cadastro',    value: formatDate(p.created_at) },
                  { label: 'Recipient ID', value: p.pagar_me_recipient_id || '-' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: `1px solid #F7F7F7`, gap: 12 }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{f.label}</span>
                    <span style={{ fontSize: f.label === 'Recipient ID' ? 10 : 13, color: TEXT, textAlign: 'right', wordBreak: 'break-all', fontFamily: f.label === 'Recipient ID' ? 'monospace' : 'inherit' }}>{f.value}</span>
                  </div>
                ))}

                {/* Eventos */}
                {evs.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 6 }}>Eventos</div>
                    {evs.map((ev: any) => {
                      const eb = ({ pending: { label: 'Aguardando', color: '#92400E' }, active: { label: 'Ativo', color: '#0A7A76' }, cancelled: { label: 'Cancelado', color: '#991B1B' }, rejected: { label: 'Recusado', color: '#991B1B' } } as Record<string, {label:string;color:string}>)[ev.status] ?? { label: ev.status, color: DIM }
                      return (
                        <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid #F7F7F7`, gap: 8 }}>
                          <span style={{ fontSize: 13, color: TEXT, flex: 1 }}>{ev.title}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: eb.color, flexShrink: 0 }}>{eb.label}</span>
                        </div>
                      )
                    })}
                  </>
                )}

                {evs.length === 0 && !prodDetailLoading && (
                  <div style={{ fontSize: 13, color: DIM, marginTop: 12 }}>Nenhum evento cadastrado.</div>
                )}

                {/* Ações */}
                <div style={{ fontSize: 11, fontWeight: 600, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 20, marginBottom: 10 }}>Ações</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!p.producer_disabled && !p.verified && (
                    <button onClick={() => prodAction(p.id, 'verified', true)} disabled={prodActionLoading} style={{ width: '100%', padding: 12, background: TEAL, color: WHITE, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif", opacity: prodActionLoading ? 0.6 : 1 }}>Conceder selo Verificado</button>
                  )}
                  {p.verified && !p.producer_disabled && (
                    <button onClick={() => prodAction(p.id, 'verified', false)} disabled={prodActionLoading} style={{ width: '100%', padding: 12, background: 'transparent', border: '1.5px solid #F59E0B', color: '#92400E', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif", opacity: prodActionLoading ? 0.6 : 1 }}>Remover verificação</button>
                  )}
                  {!p.producer_disabled ? (
                    <button onClick={() => prodAction(p.id, 'producer_disabled', true)} disabled={prodActionLoading} style={{ width: '100%', padding: 12, background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif", opacity: prodActionLoading ? 0.6 : 1 }}>Desativar produtor</button>
                  ) : (
                    <button onClick={() => prodAction(p.id, 'producer_disabled', false)} disabled={prodActionLoading} style={{ width: '100%', padding: 12, background: TEAL, color: WHITE, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif", opacity: prodActionLoading ? 0.6 : 1 }}>Reativar produtor</button>
                  )}
                </div>
              </div>
            )}
          </div>
          </>
        )
      }

      // Lista de produtores
      const filtered = producers
        .filter(p => {
          if (prodFilter === 'verificados') return p.verified && !p.producer_disabled
          if (prodFilter === 'desativados') return p.producer_disabled
          return true
        })
        .filter(p => !prodSearch.trim() || p.name?.toLowerCase().includes(prodSearch.toLowerCase()) || p.email?.toLowerCase().includes(prodSearch.toLowerCase()))

      return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', fontFamily: "'Noto Sans', sans-serif" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, letterSpacing: -0.4 }}>Produtores</div>
              <button onClick={loadProdutores} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, fontSize: 13, fontWeight: 600, fontFamily: "'Noto Sans', sans-serif", paddingBottom: 2 }}>Atualizar</button>
            </div>
            <div style={{ fontSize: 12, color: DIM, marginTop: 4 }}>{producers.length} cadastrados</div>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {([{ id: 'todos', label: 'Todos' }, { id: 'verificados', label: 'Verificados' }, { id: 'desativados', label: 'Desativados' }] as const).map(f => {
              const on = prodFilter === f.id
              return <button key={f.id} onClick={() => setProdFilter(f.id)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: on ? 700 : 500, background: on ? TEAL : WHITE, color: on ? WHITE : '#374151', border: on ? 'none' : `1px solid ${BORDER}`, cursor: 'pointer', fontFamily: "'Noto Sans', sans-serif" }}>{f.label}</button>
            })}
          </div>

          {/* Busca */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: DIM, pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={prodSearch} onChange={e => setProdSearch(e.target.value)} placeholder="Buscar por nome ou email" style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px 10px 34px', fontSize: 14, fontFamily: "'Noto Sans', sans-serif", outline: 'none', color: TEXT, background: WHITE, boxSizing: 'border-box' as const }} />
          </div>

          {prodLoading && <div style={{ textAlign: 'center', padding: '40px 0', color: DIM, fontSize: 14 }}>Carregando...</div>}

          {!prodLoading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: DIM, fontSize: 14 }}>Nenhum produtor encontrado.</div>
          )}

          {!prodLoading && filtered.map((p: any) => {
            const sb = statusBadge(p)
            const initials = p.avatar_initials || p.name?.slice(0,2)?.toUpperCase() || 'P'
            return (
              <div key={p.id} onClick={() => openProdDetail(p)} style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: TEAL, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 14, fontWeight: 700 }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: DIM, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>
                  <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{formatDate(p.created_at)}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, background: sb.bg, color: sb.color, border: `1px solid ${sb.border}`, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>{sb.label}</span>
              </div>
            )
          })}
        </div>
      )
    }
    if (tab === 'vendas') {
      return <PlaceholderSection title="Vendas e Repasses" icon={<IconBarChart />} desc="Dashboard de vendas, repasses pendentes, status do cron D+3 e forcar repasse manual." />
    }
    // tab === 'mais' sem subsecao
    return <MaisSection onNavigate={(s) => setMaisSection(s)} onSignOut={handleSignOut} />
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
        display: 'flex', flexDirection: 'column', overflowY: 'auto' as const,
        paddingBottom: 72,
      }}>
        {renderContent()}
      </div>

      {/* Bottom nav fixed */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}>
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
