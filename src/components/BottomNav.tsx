import React from 'react'

export type NavTab = 'explore' | 'my-moments' | 'chats' | 'profile'

interface Props {
  active:   NavTab
  onChange: (tab: NavTab) => void
  onAdd:    () => void
}

// Left two tabs
const LEFT_TABS: { id: NavTab; label: string; icon: (active: boolean) => React.ReactElement }[] = [
  {
    id: 'explore',
    label: 'Explore',
    icon: (a) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        strokeWidth={a ? 2.2 : 1.8} style={{ color: a ? '#1D4ED8' : '#94A3B8' }}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
      </svg>
    ),
  },
  {
    id: 'my-moments',
    label: 'Moments',
    icon: (a) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        strokeWidth={a ? 2.2 : 1.8} style={{ color: a ? '#1D4ED8' : '#94A3B8' }}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
      </svg>
    ),
  },
]

// Right two tabs
const RIGHT_TABS: { id: NavTab; label: string; icon: (active: boolean) => React.ReactElement }[] = [
  {
    id: 'chats',
    label: 'Messages',
    icon: (a) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        strokeWidth={a ? 2.2 : 1.8} style={{ color: a ? '#1D4ED8' : '#94A3B8' }}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (a) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        strokeWidth={a ? 2.2 : 1.8} style={{ color: a ? '#1D4ED8' : '#94A3B8' }}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
]

function TabButton({ tab, active, onClick }: {
  tab: { id: NavTab; label: string; icon: (a: boolean) => React.ReactElement }
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-2 focus:outline-none transition-colors"
    >
      {tab.icon(active)}
      <span className="text-[10px] font-semibold tracking-wide"
        style={{ color: active ? '#1D4ED8' : '#94A3B8' }}>
        {tab.label}
      </span>
    </button>
  )
}

export default function BottomNav({ active, onChange, onAdd }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -1px 0 rgba(226,232,240,0.6), 0 -8px 24px rgba(15,23,42,0.04)',
      }}>

      <div className="flex items-center max-w-lg mx-auto px-2" style={{ height: '64px' }}>

        {/* Left tabs */}
        {LEFT_TABS.map(tab => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onClick={() => onChange(tab.id)}
          />
        ))}

        {/* Central FAB slot — wider to give the popped circle room */}
        <div className="relative flex items-center justify-center" style={{ width: '72px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onAdd}
            aria-label="Create a Moment"
            className="absolute flex items-center justify-center focus:outline-none transition-transform active:scale-95"
            style={{
              width:     '56px',
              height:    '56px',
              borderRadius: '9999px',
              background:   'linear-gradient(135deg, #1D4ED8 0%, #0D9488 100%)',
              boxShadow:    '0 4px 24px rgba(13,148,136,0.40), 0 2px 8px rgba(29,78,216,0.25)',
              bottom:       '12px',   // pops above the bar
            }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24"
              stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* Right tabs */}
        {RIGHT_TABS.map(tab => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onClick={() => onChange(tab.id)}
          />
        ))}

      </div>
    </nav>
  )
}
