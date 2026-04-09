import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export type NavTab = 'explore' | 'my-moments' | 'create' | 'chats' | 'profile'

const TAB_PATH: Record<NavTab, string> = {
  'explore':    '/explore',
  'my-moments': '/moments',
  'create':     '/create',
  'chats':      '/chats',
  'profile':    '/profile',
}

function activeTabFromPath(pathname: string): NavTab {
  if (pathname.startsWith('/moments')) return 'my-moments'
  if (pathname.startsWith('/chats'))   return 'chats'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/create'))  return 'create'
  return 'explore'
}

const TABS: { id: NavTab; label: string; icon: (active: boolean) => React.ReactElement }[] = [
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
  {
    id: 'create',
    label: 'Create',
    icon: (a) => (
      <div
        style={{
          width: '36px', height: '36px',
          borderRadius: '9999px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: a
            ? 'linear-gradient(135deg, #1D4ED8 0%, #0D9488 100%)'
            : 'linear-gradient(135deg, rgba(29,78,216,0.12) 0%, rgba(13,148,136,0.12) 100%)',
          transition: 'background 150ms ease',
        }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
          stroke={a ? 'white' : '#1D4ED8'} strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
    ),
  },
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

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const active       = activeTabFromPath(pathname)
  const activeIndex  = TABS.findIndex(t => t.id === active)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background:     'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        boxShadow:      '0 -1px 0 rgba(226,232,240,0.6), 0 -8px 24px rgba(15,23,42,0.04)',
      }}>

      <div className="relative flex items-center max-w-lg mx-auto" style={{ height: '64px' }}>

        {/* Sliding active indicator — a 2px pill that glides between tabs */}
        <div
          aria-hidden
          style={{
            position:   'absolute',
            top:        0,
            left:       0,
            height:     '2px',
            width:      '20%',
            borderRadius: '0 0 3px 3px',
            background: 'linear-gradient(90deg, #1D4ED8, #0D9488)',
            transform:  `translateX(${activeIndex * 100}%)`,
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {TABS.map(tab => {
          const isActive = active === tab.id
          const isCreate = tab.id === 'create'
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(TAB_PATH[tab.id])}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 focus:outline-none"
              style={{ height: '100%', transition: 'transform 80ms ease' }}
            >
              {tab.icon(isActive)}
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{
                  color:      isCreate ? (isActive ? '#1D4ED8' : '#0D9488') : (isActive ? '#1D4ED8' : '#94A3B8'),
                  transition: 'color 200ms ease',
                }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
