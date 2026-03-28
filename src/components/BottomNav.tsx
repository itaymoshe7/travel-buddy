export type NavTab = 'explore' | 'my-requests' | 'chats' | 'profile'

interface Props {
  active: NavTab
  onChange: (tab: NavTab) => void
}

const TABS: { id: NavTab; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: 'explore',
    label: 'Explore',
    icon: (a) => (
      <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0V3m0 18c-2.5 0-4.5-4-4.5-9S9.5 3 12 3m0 18c2.5 0 4.5-4 4.5-9S14.5 3 12 3M3.6 9h16.8M3.6 15h16.8" />
      </svg>
    ),
  },
  {
    id: 'my-requests',
    label: 'Requests',
    icon: (a) => (
      <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    id: 'chats',
    label: 'Chats',
    icon: (a) => (
      <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (a) => (
      <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 safe-area-pb">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 h-16">
        {TABS.map(tab => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors focus:outline-none
                ${isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.icon(isActive)}
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
