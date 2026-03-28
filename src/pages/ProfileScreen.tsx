import { useEffect, useState } from 'react'
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
    <div className="flex-1 flex flex-col items-center gap-1 rounded-2xl py-4 px-2"
      style={{ background: 'white', boxShadow: '0 4px 16px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04)' }}>
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
    <div className="rounded-2xl p-5"
      style={{ background: 'white', boxShadow: '0 4px 16px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)' }}>
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
  const [recentMoments, setRecentMoments] = useState<RecentMoment[]>([])
  const [bio,           setBio]           = useState('')
  const [bioFocus,      setBioFocus]      = useState(false)
  const [savingBio,     setSavingBio]     = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [loggingOut,    setLoggingOut]    = useState(false)

  useEffect(() => {
    async function load() {
      const [profileRes, createdRes, joinedRes, momentsRes] = await Promise.all([
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }} />
      </div>
    )
  }
  if (!profile) return null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-28" style={{ background: '#F8FAFC' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3"
        style={{ background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(12px)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94A3B8' }}>
          My Account
        </p>
        <h1 className="text-[26px] font-bold leading-tight" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          Profile 👤
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-5 pt-4">

        {/* ── Avatar + identity ───────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-2">

          {/* Avatar with glowing ring */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 0 3px #1D4ED8, 0 0 20px rgba(29,78,216,0.28)' }} />
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
    </div>
  )
}
