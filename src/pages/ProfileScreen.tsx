import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Profile {
  full_name:        string | null
  email:            string | null
  instagram_handle: string | null
  bio:              string | null
  avatar_url:       string | null
  travel_region:    string | null
  travel_vibe:      string | null
  created_at:       string | null
}

interface Stats {
  joinedLabel:   string   // e.g. "Mar 2026"
  created:       number   // moments the user posted
  joined:        number   // approved moment requests
}

interface Props {
  userId:    string
  onLogOut:  () => void
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function formatJoined(ts: string | null) {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(ts))
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 bg-white rounded-2xl py-4 px-2"
      style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04)' }}>
      <span className="text-2xl font-800 tracking-tight" style={{ color: '#0F172A', fontWeight: 800 }}>
        {value}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>
        {label}
      </span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileScreen({ userId, onLogOut }: Props) {
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [stats,     setStats]     = useState<Stats>({ joinedLabel: '—', created: 0, joined: 0 })
  const [bio,       setBio]       = useState('')
  const [bioFocus,  setBioFocus]  = useState(false)
  const [savingBio, setSavingBio] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [loggingOut,setLoggingOut]= useState(false)

  useEffect(() => {
    async function load() {
      const [profileRes, createdRes, joinedRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email, instagram_handle, bio, avatar_url, travel_region, travel_vibe, created_at')
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
      ])

      if (profileRes.data) {
        const p = profileRes.data as Profile
        setProfile(p)
        setBio(p.bio ?? '')
        setStats({
          joinedLabel: formatJoined(p.created_at),
          created:     createdRes.count  ?? 0,
          joined:      joinedRes.count   ?? 0,
        })
      }
      setLoading(false)
    }
    load()
  }, [userId])

  async function handleBioBlur() {
    setBioFocus(false)
    if (!profile) return
    const trimmed = bio.trim()
    if (trimmed === (profile.bio ?? '')) return   // no change
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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!profile) return null

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-28" style={{ background: '#F8FAFC' }}>

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3"
        style={{ background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(12px)' }}>
        <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>Profile</h1>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-6 pt-4">

        {/* ── Avatar + identity ─────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-2">

          {/* Avatar with glowing blue border */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 0 3px #1D4ED8, 0 0 20px rgba(29,78,216,0.30)' }} />
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

          {/* Name */}
          <div className="text-center">
            <h2 className="text-xl font-bold leading-tight" style={{ color: '#0F172A' }}>
              {profile.full_name ?? 'Your Name'}
            </h2>
            {profile.instagram_handle && (
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
                @{profile.instagram_handle}
              </p>
            )}
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────── */}
        <div className="flex gap-3">
          <StatCard value={stats.joinedLabel} label="Joined"   />
          <StatCard value={stats.created}     label="Created"  />
          <StatCard value={stats.joined}      label="Moments"  />
        </div>

        {/* ── Bio ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5"
          style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: '#64748B' }}>Bio</p>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 200))}
            onFocus={() => setBioFocus(true)}
            onBlur={handleBioBlur}
            placeholder="No bio yet — tap to add one."
            rows={3}
            className="w-full resize-none outline-none text-sm leading-relaxed bg-transparent"
            style={{
              color:       bio ? '#0F172A' : '#64748B',
              border:      bioFocus ? '1.5px solid #1D4ED8' : '1.5px solid transparent',
              borderRadius: '0.75rem',
              padding:     bioFocus ? '10px 12px' : '0',
              transition:  'all 150ms ease',
            }}
          />
          {savingBio && (
            <p className="text-[11px] text-right mt-1" style={{ color: '#64748B' }}>Saving…</p>
          )}
        </div>

        {/* ── Travel DNA ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5"
          style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#64748B' }}>Travel DNA</p>

          {/* Existing tags */}
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

          <button
            type="button"
            className="w-full py-3 rounded-full text-sm font-semibold transition-colors"
            style={{ background: '#F1F5F9', color: '#64748B' }}
            onClick={() => {/* future: open tag picker */}}
          >
            + Add travel tags
          </button>
        </div>

        {/* ── Log Out ───────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleLogOut}
          disabled={loggingOut}
          className="w-full py-3.5 rounded-full text-sm font-bold transition-all"
          style={{
            background: 'rgba(244,114,182,0.12)',
            color:      '#BE123C',
          }}
        >
          {loggingOut ? 'Signing out…' : 'Log Out'}
        </button>

      </div>
    </div>
  )
}
