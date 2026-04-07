import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { supabase } from './lib/supabase'

import WelcomeScreen      from './pages/WelcomeScreen'
import LoginForm          from './pages/LoginForm'
import RegisterStep1      from './pages/RegisterStep1'
import RegisterStep2      from './pages/RegisterStep2'
import RegisterStep3      from './pages/RegisterStep3'
import ExplorePage        from './pages/ExplorePage'
import CreateMoment       from './pages/CreateMoment'
import MyMoments          from './pages/MyMoments'
import ProfileScreen      from './pages/ProfileScreen'
import ChatList           from './pages/ChatList'
import ChatRoom           from './pages/ChatRoom'
import NotificationsPage  from './pages/NotificationsPage'
import MomentDetail       from './pages/MomentDetail'
import PublicProfile      from './pages/PublicProfile'
import ResetPassword      from './pages/ResetPassword'
import EditMoment         from './pages/EditMoment'
import BottomNav          from './components/BottomNav'

// ─── Auth gate ────────────────────────────────────────────────────────────────

function RequireAuth({ userId }: { userId: string | null }) {
  const location = useLocation()
  if (!userId) return <Navigate to="/welcome" state={{ from: location }} replace />
  return <Outlet />
}

// ─── Tab layout (bottom nav visible) ─────────────────────────────────────────

function TabLayout() {
  return (
    <>
      {/* Fixed-height scroll container — prevents document-level scrolling */}
      <div style={{ height: '100svh', overflowY: 'auto', overflowX: 'hidden', paddingBottom: '64px' }}>
        <Outlet />
      </div>
      <BottomNav />
    </>
  )
}

// ─── Splash ───────────────────────────────────────────────────────────────────

function Splash() {
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

// ─── Param wrappers (extract URL params → pass as props) ─────────────────────

function MomentDetailRoute({ userId }: { userId: string }) {
  const { momentId } = useParams<{ momentId: string }>()
  const navigate = useNavigate()
  return (
    <MomentDetail
      momentId={momentId!}
      userId={userId}
      onBack={() => navigate(-1)}
      onOpenChat={(id, name) => navigate(`/chat/${id}`, { state: { partnerName: name } })}
      onViewProfile={id => navigate(`/user/${id}`)}
    />
  )
}

function ChatRoomRoute({ userId }: { userId: string }) {
  const { chatId }   = useParams<{ chatId: string }>()
  const navigate     = useNavigate()
  const location     = useLocation()
  const partnerName  = (location.state as { partnerName?: string } | null)?.partnerName ?? 'Traveller'
  return (
    <ChatRoom
      chatId={chatId!}
      userId={userId}
      otherUserName={partnerName}
      onBack={() => navigate(-1)}
    />
  )
}

function EditMomentRoute({ userId }: { userId: string }) {
  const { momentId } = useParams<{ momentId: string }>()
  const navigate     = useNavigate()
  return (
    <EditMoment
      momentId={momentId!}
      userId={userId}
      onComplete={() => navigate('/moments', { replace: true })}
      onBack={() => navigate(-1)}
    />
  )
}

function PublicProfileRoute() {
  const { userId } = useParams<{ userId: string }>()
  const navigate   = useNavigate()
  return <PublicProfile userId={userId!} onBack={() => navigate(-1)} />
}

function RegisterStep2Route({ userId }: { userId: string }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const socialLink = (location.state as { socialLink?: string } | null)?.socialLink ?? ''
  return (
    <RegisterStep2
      userId={userId}
      socialLink={socialLink}
      onNext={() => navigate('/register/3')}
    />
  )
}

// ─── Inner router (needs to be inside BrowserRouter for hooks) ────────────────

function AppRoutes() {
  const [userId,    setUserId]    = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!authReady) return <Splash />

  // Helpers used inline in route elements
  const uid = userId!

  return (
    <Routes>

      {/* ── Unauthenticated ─────────────────────────────────────────────────── */}

      <Route path="/welcome" element={
        <WelcomeScreen
          onSignUp={() => navigate('/register/1')}
          onLogIn={() => navigate('/login')}
        />
      } />

      <Route path="/login" element={
        <LoginForm
          onSuccess={id => { setUserId(id); navigate('/explore', { replace: true }) }}
          onBack={() => navigate('/welcome')}
        />
      } />

      {/* Public — accessible without auth (Supabase embeds the token in the URL) */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ── Registration flow ───────────────────────────────────────────────── */}

      <Route path="/register/1" element={
        <RegisterStep1
          onNext={(id, link) => {
            setUserId(id)
            navigate('/register/2', { state: { socialLink: link } })
          }}
          onSignIn={() => navigate('/login')}
        />
      } />

      <Route path="/register/2" element={
        userId ? <RegisterStep2Route userId={userId} /> : <Navigate to="/register/1" replace />
      } />

      <Route path="/register/3" element={
        userId
          ? <RegisterStep3 userId={userId} onComplete={() => navigate('/explore', { replace: true })} />
          : <Navigate to="/register/1" replace />
      } />

      {/* ── Protected routes ────────────────────────────────────────────────── */}

      <Route element={<RequireAuth userId={userId} />}>

        {/* Tab pages — bottom nav visible */}
        <Route element={<TabLayout />}>

          <Route path="/explore" element={
            <ExplorePage
              userId={uid}
              onNotifications={() => navigate('/notifications')}
              onOpenChat={(id, name) => navigate(`/chat/${id}`, { state: { partnerName: name } })}
              onSelectMoment={id => navigate(`/moment/${id}`)}
              onEditMoment={id => navigate(`/edit/${id}`)}
            />
          } />

          <Route path="/moments" element={
            <MyMoments
              userId={uid}
              onOpenChat={(id, name) => navigate(`/chat/${id}`, { state: { partnerName: name } })}
              onSelectMoment={id => navigate(`/moment/${id}`)}
              onEditMoment={id => navigate(`/edit/${id}`)}
            />
          } />

          <Route path="/chats" element={
            <ChatList
              userId={uid}
              onOpenChat={(id, name) => navigate(`/chat/${id}`, { state: { partnerName: name } })}
            />
          } />

          <Route path="/profile" element={
            <ProfileScreen
              userId={uid}
              onLogOut={async () => { await supabase.auth.signOut(); navigate('/welcome', { replace: true }) }}
              onSelectMoment={id => navigate(`/moment/${id}`)}
              onEditMoment={id => navigate(`/edit/${id}`)}
            />
          } />

        </Route>

        {/* Fullscreen pages — no bottom nav */}

        <Route path="/create" element={
          <CreateMoment
            userId={uid}
            onComplete={() => navigate('/explore', { replace: true })}
            onBack={() => navigate(-1)}
          />
        } />

        <Route path="/notifications" element={
          <NotificationsPage
            userId={uid}
            onBack={() => navigate(-1)}
            onOpenChat={(id, name) => navigate(`/chat/${id}`, { state: { partnerName: name } })}
          />
        } />

        <Route path="/moment/:momentId" element={<MomentDetailRoute userId={uid} />} />
        <Route path="/edit/:momentId"   element={<EditMomentRoute   userId={uid} />} />
        <Route path="/chat/:chatId"     element={<ChatRoomRoute     userId={uid} />} />
        <Route path="/user/:userId"     element={<PublicProfileRoute />} />

      </Route>

      {/* ── Defaults ────────────────────────────────────────────────────────── */}

      <Route path="/" element={
        <Navigate to={userId ? '/explore' : '/welcome'} replace />
      } />
      <Route path="*" element={
        <Navigate to={userId ? '/explore' : '/welcome'} replace />
      } />

    </Routes>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
