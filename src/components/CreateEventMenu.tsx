'use client'

import { useRouter } from 'next/navigation'

interface CreateEventMenuProps {
  open: boolean
  onClose: () => void
}

function OptionRow({ title, description, icon, onClick }: {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 14px',
        borderRadius: 14,
        border: '1px solid #E8E8E8',
        background: '#fff',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: "'Noto Sans', sans-serif",
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: '#E6F7F6', color: '#0EA5A0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: '#6E6E73', marginTop: 2, lineHeight: 1.4 }}>{description}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M6 4l4 4-4 4" stroke="#C8C8C8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

export default function CreateEventMenu({ open, onClose }: CreateEventMenuProps) {
  const router = useRouter()

  if (!open) return null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 240,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%',
        background: '#fff',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        display: 'flex', flexDirection: 'column',
        animation: 'fsUp 280ms cubic-bezier(.2,.9,.3,1)',
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        <style>{`@keyframes fsUp { from { transform: translateY(100%); } to { transform: none; } }`}</style>

        {/* Grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: '#D6D6D6' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 16px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Criar</div>
        </div>

        {/* Opções */}
        <div style={{ padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <OptionRow
            title="Evento único"
            description="Um evento em uma data específica"
            onClick={() => { onClose(); router.push('/produtor/eventos/novo') }}
            icon={
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 2v4M15 2v4M3 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            }
          />
          <OptionRow
            title="Evento recorrente"
            description="Mesmo local, toda semana ou quinzena, atração variando"
            onClick={() => { onClose(); router.push('/produtor/series/novo') }}
            icon={
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M4 11a7 7 0 0112.5-4.3M18 11a7 7 0 01-12.5 4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M16.5 3.5v3.5H13M5.5 18.5V15H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          />
        </div>
      </div>
    </div>
  )
}
