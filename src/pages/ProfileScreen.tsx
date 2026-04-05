import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  full_name:     string | null
  email:         string | null
  social_link:   string | null
  bio:           string | null
  avatar_url:    string | null
  travel_region: string | null
  travel_vibe:   string | null
  gender:        string | null
  age:           number | null
  created_at:    string | null
}

interface Stats {
  joinedLabel: string
  created:     number
  joined:      number
}

interface RecentMoment {
  id:            string
  title:         string
  destination:   string
  activity_type: string
  start_date:    string | null
}

interface JoinedMoment {
  id:            string
  title:         string
  destination:   string
  activity_type: string
  start_date:    string | null
}

interface Props {
  userId:   string
  onLogOut: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVITY_EMOJI: Record<string, string> = {
  landing: '✈️', stay: '🏨', trip: '🥾', nightlife: '🍻',
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function formatJoined(ts: string | null) {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(ts))
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(d + 'T00:00:00'))
}

function socialLabel(url: string | null) {
  if (!url) return null
  try {
    const host = new URL(url).hostname.replace('www.', '')
    return host
  } catch {
    return url
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 rounded-3xl py-4 px-2"
      style={{ background: 'white', boxShadow: '0 2px 4px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.10), 0 24px 48px rgba(15,23,42,0.05)' }}>
      <span className="text-2xl tracking-tight" style={{ color: '#0F172A', fontWeight: 800 }}>
        {value}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>
        {label}
      </span>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl p-5"
      style={{ background: 'white', boxShadow: '0 2px 4px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.10), 0 24px 48px rgba(15,23,42,0.05)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748B' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileScreen({ userId, onLogOut }: Props) {
  const [profile,       setProfile]       = useState<Profile | null>(null)
  const [stats,         setStats]         = useState<Stats>({ joinedLabel: '—', created: 0, joined: 0 })
  const [recentMoments,  setRecentMoments]  = useState<RecentMoment[]>([])
  const [joinedMoments,  setJoinedMoments]  = useState<JoinedMoment[]>([])
  const [bio,           setBio]           = useState('')
  const [bioFocus,      setBioFocus]      = useState(false)
  const [savingBio,     setSavingBio]     = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [loggingOut,    setLoggingOut]    = useState(false)

  // ── Three-dots menu ──────────────────────────────────────────────────────────
  const [menuOpen,        setMenuOpen]        = useState(false)
  const [activeModal,     setActiveModal]     = useState<null | 'edit' | 'moments' | 'delete'>(null)
  // Edit profile
  const avatarInputRef    = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [editBio,         setEditBio]         = useState('')
  const [savingEdit,      setSavingEdit]       = useState(false)
  // Manage moments
  const [allMoments,      setAllMoments]      = useState<RecentMoment[]>([])
  const [loadingMoments,  setLoadingMoments]  = useState(false)
  const [deletingId,      setDeletingId]      = useState<string | null>(null)
  // Delete account
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    async function load() {
      const [profileRes, createdRes, joinedRes, momentsRes, joinedMomentsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email, social_link, bio, avatar_url, travel_region, travel_vibe, gender, age, created_at')
          .eq('id', userId)
          .single(),

        supabase
          .from('moments')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', userId),

        supabase
          .from('moment_requests')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'accepted'),

        supabase
          .from('moments')
          .select('id, title, destination, activity_type, start_date')
          .eq('creator_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('moment_requests')
          .select('moments!moment_id(id, title, destination, activity_type, start_date)')
          .eq('user_id', userId)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (profileRes.data) {
        const p = profileRes.data as Profile
        setProfile(p)
        setBio(p.bio ?? '')
        setStats({
          joinedLabel: formatJoined(p.created_at),
          created:     createdRes.count ?? 0,
          joined:      joinedRes.count  ?? 0,
        })
      }
      setRecentMoments((momentsRes.data as RecentMoment[]) ?? [])

      // Supabase returns the FK join as an array even for many-to-one — unwrap it
      type RawJoined = { moments: JoinedMoment | JoinedMoment[] | null }
      const joined = ((joinedMomentsRes.data as RawJoined[]) ?? [])
        .map(r => (Array.isArray(r.moments) ? r.moments[0] : r.moments))
        .filter(Boolean) as JoinedMoment[]
      setJoinedMoments(joined)

      setLoading(false)
    }
    load()
  }, [userId])

  async function handleBioBlur() {
    setBioFocus(false)
    if (!profile) return
    const trimmed = bio.trim()
    if (trimmed === (profile.bio ?? '')) return
    setSavingBio(true)
    const { error } = await supabase
      .from('profiles')
      .update({ bio: trimmed || null })
      .eq('id', userId)
    setSavingBio(false)
    if (!error) setProfile(prev => prev ? { ...prev, bio: trimmed || null } : prev)
  }

  async function handleLogOut() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    onLogOut()
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `avatars/${userId}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('moment-images')
      .upload(path, file, { upsert: true })
    if (uploadError) { setUploadingAvatar(false); return }
    const { data: { publicUrl } } = supabase.storage.from('moment-images').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
    setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)
    setUploadingAvatar(false)
  }

  async function handleSaveEdit() {
    setSavingEdit(true)
    const trimmed = editBio.trim()
    const { error } = await supabase.from('profiles').update({ bio: trimmed || null }).eq('id', userId)
    setSavingEdit(false)
    if (!error) {
      setProfile(prev => prev ? { ...prev, bio: trimmed || null } : prev)
      setBio(trimmed)
      setActiveModal(null)
    }
  }

  async function openManageMoments() {
    setActiveModal('moments')
    setLoadingMoments(true)
    const { data } = await supabase
      .from('moments')
      .select('id, title, destination, activity_type, start_date')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
    setAllMoments((data as RecentMoment[]) ?? [])
    setLoadingMoments(false)
  }

  async function handleDeleteMoment(id: string) {
    setDeletingId(id)
    await supabase.from('moments').delete().eq('id', id)
    setAllMoments(prev => prev.filter(m => m.id !== id))
    setRecentMoments(prev => prev.filter(m => m.id !== id))
    setStats(prev => ({ ...prev, created: Math.max(0, prev.created - 1) }))
    setDeletingId(null)
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true)
    // Requires `delete_my_account` RPC — see supabase/migrations/..._delete_account.sql
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      // RPC not found: fall back to sign-out only
      setDeletingAccount(false)
      return
    }
    await supabase.auth.signOut()
    onLogOut()
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }} />
      </div>
    )
  }
  if (!profile) return null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-28" style={{ background: 'transparent' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 px-5 pt-5 pb-3"
        style={{ background: 'rgba(240,253,252,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 0 rgba(226,232,240,0.8)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94A3B8' }}>
              My Account
            </p>
            <h1 className="text-[26px] font-bold leading-tight" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
              Profile 👤
            </h1>
          </div>

          {/* Three-dots menu */}
          <div
            className="relative mt-1"
            tabIndex={-1}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenuOpen(false) }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center focus:outline-none transition-colors"
              style={{ background: '#F1F5F9', color: '#64748B' }}
              aria-label="More options"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="4"  r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-52 rounded-2xl overflow-hidden z-50"
                style={{
                  background: 'white',
                  boxShadow: '0 4px 6px rgba(15,23,42,0.06), 0 10px 32px rgba(15,23,42,0.14)',
                  border: '1px solid rgba(226,232,240,0.8)',
                }}
              >
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setEditBio(profile?.bio ?? ''); setActiveModal('edit') }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left focus:outline-none transition-colors"
                  style={{ color: '#0F172A' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  ✏️ Edit Profile
                </button>
                <div style={{ height: '1px', background: '#F1F5F9' }} />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); openManageMoments() }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left focus:outline-none transition-colors"
                  style={{ color: '#0F172A' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  🗂️ Manage Moments
                </button>
                <div style={{ height: '1px', background: '#F1F5F9' }} />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setActiveModal('delete') }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left focus:outline-none transition-colors"
                  style={{ color: '#DC2626' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  🗑️ Delete Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-5 pt-4">

        {/* ── Avatar + identity ───────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-2">

          {/* Avatar with glowing ring */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 0 3px #0D9488, 0 0 0 6px rgba(13,148,136,0.15), 0 0 24px rgba(13,148,136,0.35)' }} />
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar"
                className="w-24 h-24 rounded-full object-cover relative z-10"
                style={{ border: '3px solid white' }} />
            ) : (
              <div className="w-24 h-24 rounded-full relative z-10 flex items-center justify-center select-none text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1D4ED8', border: '3px solid white' }}>
                {initials(profile.full_name)}
              </div>
            )}
          </div>

          {/* Name + social link */}
          <div className="text-center">
            <h2 className="text-xl font-bold leading-tight" style={{ color: '#0F172A' }}>
              {profile.full_name ?? 'Your Name'}
            </h2>
            {profile.social_link && (
              <a
                href={profile.social_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm mt-0.5 inline-block"
                style={{ color: '#1D4ED8' }}
              >
                {socialLabel(profile.social_link)}
              </a>
            )}
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <StatCard value={stats.joinedLabel} label="Joined"  />
          <StatCard value={stats.created}     label="Created" />
          <StatCard value={stats.joined}      label="Joined"  />
        </div>

        {/* ── Bio ─────────────────────────────────────────────────────────── */}
        <Section label="Bio">
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 200))}
            onFocus={() => setBioFocus(true)}
            onBlur={handleBioBlur}
            placeholder="No bio yet — tap to add one."
            rows={3}
            className="w-full resize-none outline-none text-sm leading-relaxed bg-transparent"
            style={{
              color:        bio ? '#0F172A' : '#64748B',
              border:       bioFocus ? '1.5px solid #1D4ED8' : '1.5px solid transparent',
              borderRadius: '0.75rem',
              padding:      bioFocus ? '10px 12px' : '0',
              transition:   'all 150ms ease',
            }}
          />
          {savingBio && (
            <p className="text-[11px] text-right mt-1" style={{ color: '#64748B' }}>Saving…</p>
          )}
        </Section>

        {/* ── My Journeys ─────────────────────────────────────────────────── */}
        <Section label="My Journeys">
          {joinedMoments.length === 0 ? (
            <p className="text-sm text-center py-2" style={{ color: '#94A3B8' }}>
              No approved journeys yet — start exploring!
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1"
              style={{ scrollbarWidth: 'none' }}>
              {joinedMoments.map(m => (
                <div key={m.id} className="shrink-0 w-36 rounded-2xl p-3 flex flex-col gap-2"
                  style={{
                    background: 'linear-gradient(145deg,rgba(239,246,255,0.9),rgba(220,252,231,0.6))',
                    border: '1px solid rgba(134,239,172,0.35)',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
                  }}>
                  {/* Activity bubble */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: 'white', boxShadow: '0 1px 4px rgba(15,23,42,0.08)' }}>
                    {ACTIVITY_EMOJI[m.activity_type] ?? '📍'}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-snug line-clamp-2" style={{ color: '#0F172A' }}>
                      {m.title}
                    </p>
                    <p className="text-[11px] mt-1 truncate" style={{ color: '#64748B' }}>
                      📍 {m.destination}
                    </p>
                    {m.start_date && (
                      <p className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
                        {formatDate(m.start_date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Travel DNA ──────────────────────────────────────────────────── */}
        <Section label="Travel DNA">
          {(profile.travel_region || profile.travel_vibe) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.travel_region && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                  📍 {profile.travel_region}
                </span>
              )}
              {profile.travel_vibe && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: '#FDF2F8', color: '#BE185D' }}>
                  {profile.travel_vibe.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              )}
            </div>
          )}
          <button type="button"
            className="w-full py-2.5 rounded-full text-sm font-semibold"
            style={{ background: '#F1F5F9', color: '#64748B' }}
            onClick={() => {}}>
            + Add travel tags
          </button>
        </Section>

        {/* ── Personal Info ───────────────────────────────────────────────── */}
        <Section label="Personal Info">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#64748B' }}>Gender</span>
              <span className="text-sm font-medium capitalize" style={{ color: '#0F172A' }}>
                {profile.gender ?? '—'}
              </span>
            </div>
            <div style={{ height: '1px', background: '#F1F5F9' }} />
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#64748B' }}>Age</span>
              <span className="text-sm font-medium" style={{ color: '#0F172A' }}>
                {profile.age ?? '—'}
              </span>
            </div>
          </div>
        </Section>

        {/* ── My Recent Moments ───────────────────────────────────────────── */}
        <Section label="My Recent Moments">
          {recentMoments.length === 0 ? (
            <p className="text-sm text-center py-2" style={{ color: '#94A3B8' }}>
              No moments yet — tap + to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {recentMoments.map(m => (
                <div key={m.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'linear-gradient(145deg,rgba(253,242,248,0.7),rgba(239,246,255,0.7))', border: '1px solid rgba(226,232,240,0.6)' }}>
                  {/* Activity bubble */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                    style={{ background: 'white', boxShadow: '0 1px 4px rgba(15,23,42,0.08)' }}>
                    {ACTIVITY_EMOJI[m.activity_type] ?? '📍'}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
                      {m.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#64748B' }}>
                      📍 {m.destination}
                      {m.start_date && (
                        <span style={{ color: '#94A3B8' }}> · {formatDate(m.start_date)}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Log Out ─────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleLogOut}
          disabled={loggingOut}
          className="w-full py-3.5 rounded-full text-sm font-bold transition-all"
          style={{ background: 'rgba(244,114,182,0.12)', color: '#BE123C' }}
        >
          {loggingOut ? 'Signing out…' : 'Log Out'}
        </button>

      </div>

      {/* ── Edit Profile Modal ──────────────────────────────────────────────── */}
      {activeModal === 'edit' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl px-6 pt-6 pb-12"
            style={{ background: 'white' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E2E8F0' }} />

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Edit Profile</h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none"
                style={{ background: '#F1F5F9', color: '#64748B' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <div
                className="relative cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-20 h-20 rounded-full object-cover"
                    style={{ border: '3px solid white', boxShadow: '0 2px 12px rgba(15,23,42,0.14)' }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold select-none"
                    style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1D4ED8', border: '3px solid white', boxShadow: '0 2px 12px rgba(15,23,42,0.14)' }}
                  >
                    {initials(profile?.full_name ?? null)}
                  </div>
                )}
                <div
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: '#1D4ED8', boxShadow: '0 2px 6px rgba(29,78,216,0.4)' }}
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              {uploadingAvatar && (
                <p className="text-xs font-medium" style={{ color: '#64748B' }}>Uploading photo…</p>
              )}
              {!uploadingAvatar && (
                <p className="text-xs" style={{ color: '#94A3B8' }}>Tap photo to change</p>
              )}
            </div>

            {/* Bio */}
            <div className="mb-6">
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748B' }}>
                Bio
              </label>
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value.slice(0, 200))}
                placeholder="Tell travellers about yourself…"
                rows={4}
                className="w-full resize-none outline-none text-sm leading-relaxed rounded-2xl px-4 py-3"
                style={{
                  color: '#0F172A',
                  border: '1.5px solid #E2E8F0',
                  background: '#F8FAFC',
                }}
              />
              <p className="text-[11px] text-right mt-1" style={{ color: '#CBD5E1' }}>
                {editBio.length}/200
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit || uploadingAvatar}
              className="w-full py-3.5 rounded-full text-sm font-bold transition-all"
              style={{ background: '#1D4ED8', color: 'white', opacity: (savingEdit || uploadingAvatar) ? 0.6 : 1 }}
            >
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Manage Moments Modal ────────────────────────────────────────────── */}
      {activeModal === 'moments' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl px-6 pt-6 pb-12"
            style={{ background: 'white', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E2E8F0' }} />

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Manage Moments</h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none"
                style={{ background: '#F1F5F9', color: '#64748B' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingMoments ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }} />
              </div>
            ) : allMoments.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#94A3B8' }}>
                You haven't created any moments yet.
              </p>
            ) : (
              <div className="space-y-2">
                {allMoments.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                      style={{ background: 'white', boxShadow: '0 1px 4px rgba(15,23,42,0.08)' }}
                    >
                      {ACTIVITY_EMOJI[m.activity_type] ?? '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
                        {m.title}
                      </p>
                      <p className="text-xs truncate" style={{ color: '#64748B' }}>
                        📍 {m.destination}
                        {m.start_date && <span style={{ color: '#94A3B8' }}> · {formatDate(m.start_date)}</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMoment(m.id)}
                      disabled={deletingId === m.id}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none transition-colors"
                      style={{ background: 'rgba(239,68,68,0.10)', color: '#DC2626', opacity: deletingId === m.id ? 0.5 : 1 }}
                    >
                      {deletingId === m.id ? '…' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Account Confirmation ─────────────────────────────────────── */}
      {activeModal === 'delete' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(15,23,42,0.60)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6"
            style={{
              background: 'white',
              boxShadow: '0 20px 60px rgba(15,23,42,0.20)',
            }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.10)' }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>Delete Account?</h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: '#64748B' }}>
              This will permanently delete your account, all moments you've created, and your profile data.
              <span className="font-semibold" style={{ color: '#DC2626' }}> This cannot be undone.</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-3 rounded-full text-sm font-semibold focus:outline-none"
                style={{ background: '#F1F5F9', color: '#64748B' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-3 rounded-full text-sm font-bold focus:outline-none transition-all"
                style={{ background: '#DC2626', color: 'white', opacity: deletingAccount ? 0.6 : 1 }}
              >
                {deletingAccount ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
