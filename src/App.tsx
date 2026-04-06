import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import WelcomeScreen  from './pages/WelcomeScreen'
import LoginForm      from './pages/LoginForm'
import RegisterStep1  from './pages/RegisterStep1'
import RegisterStep2  from './pages/RegisterStep2'
import RegisterStep3  from './pages/RegisterStep3'  // bio + vibe (optional last step)
import ExplorePage    from './pages/ExplorePage'
import CreateMoment   from './pages/CreateMoment'
import MyMoments      from './pages/MyMoments'
import ProfileScreen  from './pages/ProfileScreen'
import ChatList       from './pages/ChatList'
import ChatRoom            from './pages/ChatRoom'
import NotificationsPage  from './pages/NotificationsPage'
import MomentDetail       from './pages/MomentDetail'
import PublicProfile      from './pages/PublicProfile'
import BottomNav from './components/BottomNav'
import type { NavTab } from './components/BottomNav'

type Page =
  | 'welcome' | 'login' | 'step1' | 'step2' | 'step3'  // unauthenticated / onboarding (step3 = bio+vibe)
  | 'explore' | 'create'                                 // explore flow
  | 'my-moments'                                         // moments tab
  | 'chats' | 'chat-room'                                // chat flow
  | 'profile'                                            // profile tab
  | 'notifications'                                      // alerts overlay
  | 'moment-detail'                                      // full moment view
  | 'public-profile'                                     // read-only profile of another user

// Map page → active nav tab
function activeTab(page: Page): NavTab {
  if (page === 'chats' || page === 'chat-room') return 'chats'
  if (page === 'my-moments') return 'my-moments'
  if (page === 'profile')    return 'profile'
  return 'explore'
}

export default function App() {
  const [page,            setPage]           = useState<Page>('welcome')
  const [userId,          setUserId]         = useState<string | null>(null)
  const [socialLink,      setSocialLink]     = useState<string>('')
  const [chatId,          setChatId]         = useState<string | null>(null)
  const [chatPartner,     setChatPartner]    = useState<string>('Traveller')
  const [authReady,       setAuthReady]      = useState(false)
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null)
  const [viewedUserId,    setViewedUserId]   = useState<string | null>(null)
  // track where moment-detail was opened from so back works correctly
  const [momentDetailOrigin, setMomentDetailOrigin] = useState<Page>('explore')

  // ── Restore session on mount + listen for future auth events ──────────────
  useEffect(() => {
    // getSession() reads the token already stored in localStorage by the SDK
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        setPage('explore')
      }
      setAuthReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        // Only navigate away from unauthenticated pages
        setPage(prev =>
          prev === 'welcome' || prev === 'login' ? 'explore' : prev
        )
      } else {
        setUserId(null)
        setPage('welcome')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function goTab(tab: NavTab) {
    setPage(tab as Page)
  }

  // ── Splash while checking stored session ──────────────────────────────────

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse 130% 90% at 50% 60%, #0EA5E9 0%, #1D4ED8 45%, #1E3A8A 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-white text-sm font-semibold tracking-wide opacity-80">Mate</span>
        </div>
      </div>
    )
  }

  // ── Unauthenticated ───────────────────────────────────────────────────────

  if (page === 'welcome') {
    return (
      <WelcomeScreen
        onSignUp={() => setPage('step1')}
        onLogIn={()  => setPage('login')}
      />
    )
  }

  if (page === 'login') {
    return (
      <LoginForm
        onSuccess={id => { setUserId(id); setPage('explore') }}
        onBack={() => setPage('welcome')}
      />
    )
  }

  // ── Registration flow ─────────────────────────────────────────────────────

  if (page === 'step1') {
    return (
      <RegisterStep1
        onNext={(id, link) => { setUserId(id); setSocialLink(link); setPage('step2') }}
        onSignIn={() => setPage('login')}
      />
    )
  }

  if (page === 'step2') {
    return (
      <RegisterStep2
        userId={userId!}
        socialLink={socialLink}
        onNext={() => setPage('step3')}
      />
    )
  }

  // Step3: optional bio + travel vibe — shown after step2, leads to explore
  if (page === 'step3') {
    return (
      <RegisterStep3
        userId={userId!}
        onComplete={() => setPage('explore')}
      />
    )
  }

  // ── Fullscreen authenticated views (no bottom nav) ────────────────────────

  if (page === 'create') {
    return (
      <CreateMoment
        userId={userId!}
        onComplete={() => setPage('explore')}
        onBack={()    => setPage('explore')}
      />
    )
  }

  if (page === 'notifications') {
    return (
      <NotificationsPage
        userId={userId!}
        onBack={() => setPage('explore')}
        onOpenChat={(id, name) => {
          setChatId(id)
          setChatPartner(name)
          setPage('chat-room')
        }}
      />
    )
  }

  if (page === 'chat-room') {
    return (
      <ChatRoom
        chatId={chatId!}
        userId={userId!}
        otherUserName={chatPartner}
        onBack={() => setPage('chats')}
      />
    )
  }

  if (page === 'moment-detail') {
    return (
      <MomentDetail
        momentId={selectedMomentId!}
        userId={userId!}
        onBack={() => setPage(momentDetailOrigin)}
        onOpenChat={(id, name) => { setChatId(id); setChatPartner(name); setPage('chat-room') }}
        onViewProfile={id => { setViewedUserId(id); setPage('public-profile') }}
      />
    )
  }

  if (page === 'public-profile') {
    return (
      <PublicProfile
        userId={viewedUserId!}
        onBack={() => setPage('moment-detail')}
      />
    )
  }

  // ── Tabbed authenticated views (with bottom nav) ──────────────────────────

  return (
    <>
      {page === 'explore' && (
        <ExplorePage
          userId={userId!}
          onNotifications={() => setPage('notifications')}
          onOpenChat={(id, name) => { setChatId(id); setChatPartner(name); setPage('chat-room') }}
          onSelectMoment={id => { setSelectedMomentId(id); setMomentDetailOrigin('explore'); setPage('moment-detail') }}
        />
      )}

      {page === 'my-moments' && (
        <MyMoments
          userId={userId!}
          onOpenChat={(id, name) => { setChatId(id); setChatPartner(name); setPage('chat-room') }}
          onSelectMoment={id => { setSelectedMomentId(id); setMomentDetailOrigin('my-moments'); setPage('moment-detail') }}
        />
      )}

      {page === 'chats' && (
        <ChatList
          userId={userId!}
          onOpenChat={(id, name) => {
            setChatId(id)
            setChatPartner(name)
            setPage('chat-room')
          }}
        />
      )}

      {page === 'profile' && (
        <ProfileScreen
          userId={userId!}
          onLogOut={() => { supabase.auth.signOut() }}
          onSelectMoment={id => { setSelectedMomentId(id); setMomentDetailOrigin('profile'); setPage('moment-detail') }}
        />
      )}

      <BottomNav
        active={activeTab(page)}
        onChange={goTab}
        onAdd={() => setPage('create')}
      />
    </>
  )
}
