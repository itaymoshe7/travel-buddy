import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  full_name:   string | null
  avatar_url:  string | null
  bio:         string | null
  gender:      string | null
  age:         number | null
  social_link: string | null
  travel_vibe: string | null
  created_at:  string | null
}

interface Props {
  userId: string
  onBack: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function formatJoined(ts: string | null) {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(ts))
}

function socialHostname(url: string | null) {
  if (!url) return null
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

const GENDER_EMOJI: Record<string, string> = { male: '👨', female: '👩', other: '🧑' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <span className="text-sm" style={{ color: '#64748B' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{value}</span>
    </div>
  )
}

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function PublicProfile({ userId, onBack }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [created, setCreated] = useState(0)
  const [joined,  setJoined]  = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [profileRes, createdRes, joinedRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, avatar_url, bio, gender, age, social_link, travel_vibe, created_at')
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

      if (profileRes.data) setProfile(profileRes.data as Profile)
      setCreated(createdRes.count ?? 0)
      setJoined(joinedRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [userId])

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: '#64748B' }}>Profile not found.</p>
          <button type="button" onClick={onBack} className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>← Back</button>
        </div>
      </div>
    )
  }

  const vibeLabel = profile.travel_vibe
    ? profile.travel_vibe.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-10" style={{ background: '#F8FAFC' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3"
        style={{ background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
            Traveller Profile
          </p>
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none"
            style={{ background: '#F1F5F9', color: '#64748B' }}
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <h1 className="text-[22px] font-bold leading-tight" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          {profile.full_name ?? 'Traveller'}
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-4 space-y-5">

        {/* ── Avatar + identity ───────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 0 3px #1D4ED8, 0 0 20px rgba(29,78,216,0.20)' }} />
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar"
                className="w-24 h-24 rounded-full object-cover relative z-10"
                style={{ border: '3px solid white' }} />
            ) : (
              <div className="w-24 h-24 rounded-full relative z-10 flex items-center justify-center text-2xl font-bold select-none"
                style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1D4ED8', border: '3px solid white' }}>
                {initials(profile.full_name)}
              </div>
            )}
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>
              {profile.full_name ?? 'Traveller'}
            </h2>
            {profile.social_link && (
              <a
                href={profile.social_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm mt-0.5 inline-block"
                style={{ color: '#1D4ED8' }}
              >
                {socialHostname(profile.social_link)}
              </a>
            )}
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <StatCard value={formatJoined(profile.created_at)} label="Member since" />
          <StatCard value={created} label="Created" />
          <StatCard value={joined}  label="Joined" />
        </div>

        {/* ── Bio ─────────────────────────────────────────────────────────── */}
        {profile.bio && (
          <div className="rounded-2xl p-5"
            style={{ background: 'white', boxShadow: '0 4px 16px rgba(15,23,42,0.07)', border: '1px solid rgba(226,232,240,0.7)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748B' }}>Bio</p>
            <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{profile.bio}</p>
          </div>
        )}

        {/* ── Personal info ───────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5"
          style={{ background: 'white', boxShadow: '0 4px 16px rgba(15,23,42,0.07)', border: '1px solid rgba(226,232,240,0.7)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#64748B' }}>About</p>
          <InfoRow
            label="Gender"
            value={profile.gender
              ? <span>{GENDER_EMOJI[profile.gender] ?? ''} <span className="capitalize">{profile.gender}</span></span>
              : '—'}
          />
          <InfoRow label="Age" value={profile.age ?? '—'} />
          {vibeLabel && (
            <div className="pt-3">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#94A3B8' }}>Travel vibe</p>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: '#FDF2F8', color: '#BE185D' }}>
                {vibeLabel}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
