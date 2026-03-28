import { useState } from 'react'
import WelcomeScreen  from './pages/WelcomeScreen'
import LoginForm      from './pages/LoginForm'
import RegisterStep1  from './pages/RegisterStep1'
import RegisterStep2  from './pages/RegisterStep2'
import RegisterStep3  from './pages/RegisterStep3'
import ExplorePage    from './pages/ExplorePage'
import CreateMoment   from './pages/CreateMoment'
import MyMoments      from './pages/MyMoments'
import ProfileScreen  from './pages/ProfileScreen'
import ChatList       from './pages/ChatList'
import ChatRoom       from './pages/ChatRoom'
import BottomNav from './components/BottomNav'
import type { NavTab } from './components/BottomNav'

type Page =
  | 'welcome' | 'login' | 'step1' | 'step2' | 'step3'  // unauthenticated / onboarding
  | 'explore' | 'create'                                 // explore flow
  | 'my-moments'                                         // moments tab
  | 'chats' | 'chat-room'                                // chat flow
  | 'profile'                                            // profile tab

// Map page → active nav tab
function activeTab(page: Page): NavTab {
  if (page === 'chats' || page === 'chat-room') return 'chats'
  if (page === 'my-moments') return 'my-moments'
  if (page === 'profile')    return 'profile'
  return 'explore'
}

export default function App() {
  const [page,          setPage]         = useState<Page>('welcome')
  const [userId,        setUserId]       = useState<string | null>(null)
  const [socialLink,    setSocialLink]   = useState<string>('')
  const [chatId,        setChatId]       = useState<string | null>(null)
  const [chatPartner,   setChatPartner]  = useState<string>('Traveller')

  function goTab(tab: NavTab) {
    setPage(tab as Page)
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

  // ── Tabbed authenticated views (with bottom nav) ──────────────────────────

  return (
    <>
      {page === 'explore' && (
        <ExplorePage userId={userId!} />
      )}

      {page === 'my-moments' && (
        <MyMoments userId={userId!} />
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
          onLogOut={() => { setUserId(null); setPage('welcome') }}
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
