'use client'

const PRIMARY = '#0EA5A0'

type TabId = 'explorar' | 'ingressos' | 'perfil'

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

function IconCompass({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8.2" stroke="currentColor" strokeWidth="1.6"/>
      <path
        d="M14 8l-1.2 4.2L8.6 14l1.2-4.2L14 8z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

function IconTicket({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M3 8a2 2 0 012-2h12a2 2 0 012 2v1.5a1.5 1.5 0 000 3V14a2 2 0 01-2 2H5a2 2 0 01-2-2v-1.5a1.5 1.5 0 000-3V8z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}
      />
      <path d="M13 6.5v9" stroke="currentColor" strokeWidth="1.6" strokeDasharray="1.5 1.8"/>
    </svg>
  )
}

function IconUser({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}/>
      <path d="M4 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

const NAV_ITEMS: { id: TabId; label: string }[] = [
  { id: 'explorar',  label: 'Explorar'  },
  { id: 'ingressos', label: 'Ingressos' },
  { id: 'perfil',    label: 'Perfil'    },
]

function NavIcon({ id, active }: { id: TabId; active: boolean }) {
  if (id === 'explorar')  return <IconCompass active={active} />
  if (id === 'ingressos') return <IconTicket  active={active} />
  return <IconUser active={active} />
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      background: '#ffffff', borderTop: '0.5px solid #EAEAEA',
      paddingTop: '10px',
      paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
      display: 'flex', zIndex: 50,
      boxShadow: '0 -4px 14px rgba(0,0,0,0.04)',
    }}>
      {NAV_ITEMS.map((item) => {
        const active = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              flex: 1, background: 'transparent', border: 0, cursor: 'pointer',
              padding: '6px 0 4px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: active ? PRIMARY : '#9A9A9A',
              fontFamily: "'Noto Sans', sans-serif",
              fontSize: 10.5, fontWeight: active ? 600 : 500,
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: 4, width: 48, height: 26,
              borderRadius: 999,
              background: active ? '#E6F7F6' : 'transparent',
              transition: 'background 200ms', zIndex: 0,
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <NavIcon id={item.id} active={active} />
            </div>
            <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export type { TabId }
