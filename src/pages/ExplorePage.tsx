import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MomentRow {
  id: string
  title: string
  destination: string
  start_date: string | null
  end_date: string | null
  activity_type: string
  creator_id: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
    bio: string | null
  } | null
}

interface Props {
  userId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVITY_EMOJI: Record<string, string> = {
  landing:   '✈️',
  stay:      '🏨',
  trip:      '🥾',
  nightlife: '🍻',
}

// Rough spots-left badge derived from a hash of the moment id (stable per card)
function spotsLeft(id: string): number {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return (n % 4) + 1   // 1–4
}

type FilterId = 'all' | 'stay' | 'trip' | 'landing'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',     label: '⚡ All'       },
  { id: 'stay',    label: '🏠 Stays'     },
  { id: 'trip',    label: '🏔️ Adventure' },
  { id: 'landing', label: '✈️ Flights'   },
]

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return ''
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
      new Date(d + 'T00:00:00'),
    )
  if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return fmt(start)
  return fmt(end!)
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  id: number
  message: string
  kind: 'success' | 'error'
}

function Toast({ toasts }: { toasts: ToastState[] }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-36 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg text-white pointer-events-auto
            ${t.kind === 'success' ? 'bg-primary' : 'bg-red-500'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? 'avatar'}
        className="w-10 h-10 rounded-full object-cover shrink-0"
        style={{ border: '2px solid white', boxShadow: '0 1px 4px rgba(15,23,42,0.12)' }}
      />
    )
  }
  return (
    <div className="w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center shrink-0 select-none"
      style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1D4ED8', border: '2px solid white', boxShadow: '0 1px 4px rgba(15,23,42,0.12)' }}>
      {initials(name)}
    </div>
  )
}

// ─── Moment Card ──────────────────────────────────────────────────────────────

function MomentCard({
  moment,
  userId,
  alreadyRequested,
  onRequested,
  onToast,
}: {
  moment: MomentRow
  userId: string
  alreadyRequested: boolean
  onRequested: (id: string) => void
  onToast: (msg: string, kind: 'success' | 'error') => void
}) {
  const [requesting, setRequesting] = useState(false)
  const isOwn = moment.creator_id === userId

  async function handleImIn() {
    if (alreadyRequested || isOwn) return
    setRequesting(true)
    const { error } = await supabase.from('moment_requests').insert({
      moment_id: moment.id,
      user_id: userId,
    })
    setRequesting(false)
    if (error) {
      onToast(error.code === '23505' ? 'Already requested!' : error.message, 'error')
      return
    }
    onRequested(moment.id)
    onToast('Request sent! ✈️', 'success')
  }

  const creator = moment.profiles
  const dateStr = formatDateRange(moment.start_date, moment.end_date)
  const spots   = spotsLeft(moment.id)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background:  'linear-gradient(145deg, rgba(253,242,248,0.9) 0%, rgba(239,246,255,0.9) 100%)',
        boxShadow:   '0 2px 12px rgba(15,23,42,0.07), 0 1px 3px rgba(15,23,42,0.05)',
        border:      '1px solid rgba(226,232,240,0.7)',
      }}>

      <div className="p-5">
        {/* Top row: avatar + name + activity icon */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar url={creator?.avatar_url ?? null} name={creator?.full_name ?? null} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
              {creator?.full_name ?? 'Traveller'}
            </p>
            {creator?.bio && (
              <p className="text-xs truncate" style={{ color: '#94A3B8' }}>{creator.bio}</p>
            )}
          </div>
          <span className="text-xl leading-none" title={moment.activity_type}>
            {ACTIVITY_EMOJI[moment.activity_type] ?? '📍'}
          </span>
        </div>

        {/* Middle: title, destination, dates */}
        <div className="mb-4">
          <h2 className="text-base font-bold leading-snug mb-1" style={{ color: '#0F172A' }}>
            {moment.title}
          </h2>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm" style={{ color: '#64748B' }}>
              📍 {moment.destination}
              {dateStr && <span className="ml-2" style={{ color: '#94A3B8' }}>· {dateStr}</span>}
            </p>
            {/* Spots left badge */}
            <span className="shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(244,114,182,0.12)', color: '#BE185D' }}>
              {spots} spot{spots !== 1 ? 's' : ''} left
            </span>
          </div>
        </div>

        {/* Bottom: action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleImIn}
            disabled={requesting || alreadyRequested || isOwn}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all focus:outline-none"
            style={
              isOwn
                ? { background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }
                : alreadyRequested
                  ? { background: 'rgba(34,197,94,0.1)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)', cursor: 'default' }
                  : { background: '#F472B6', color: 'white' }
            }
          >
            {requesting ? '…' : isOwn ? 'Your moment' : alreadyRequested ? '✓ Sent' : "I'm in"}
          </button>

          <button
            type="button"
            onClick={() => onToast('Chat coming soon!', 'success')}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all focus:outline-none"
            style={{ background: 'rgba(29,78,216,0.08)', color: '#1D4ED8' }}
          >
            Chat
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExplorePage({ userId }: Props) {
  const [moments,    setMoments]    = useState<MomentRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [requested,  setRequested]  = useState<Set<string>>(new Set())
  const [toasts,     setToasts]     = useState<ToastState[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')
  const toastCounter = useRef(0)

  function pushToast(message: string, kind: 'success' | 'error') {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('moments')
        .select(`
          id,
          title,
          destination,
          start_date,
          end_date,
          activity_type,
          creator_id,
          profiles!creator_id (
            full_name,
            avatar_url,
            bio
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setMoments((data as unknown as MomentRow[]) ?? [])
      }

      const { data: reqs } = await supabase
        .from('moment_requests')
        .select('moment_id')
        .eq('user_id', userId)

      if (reqs) setRequested(new Set(reqs.map(r => r.moment_id)))

      setLoading(false)
    }

    load()
  }, [userId])

  const filtered = activeFilter === 'all'
    ? moments
    : moments.filter(m => m.activity_type === activeFilter)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen" style={{ background: '#F8FAFC' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-0"
        style={{ background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(12px)' }}>

        {/* Label row + bell */}
        <div className="flex items-start justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
            Your Crew
          </p>
          {/* Bell button */}
          <button
            type="button"
            aria-label="Notifications"
            className="w-8 h-8 rounded-full flex items-center justify-center -mt-0.5 transition-colors focus:outline-none"
            style={{ background: '#F1F5F9', color: '#64748B' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h1 className="text-[26px] font-bold leading-tight mb-3" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          Live feed 🌍
        </h1>

        {/* Filter pills — horizontally scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all focus:outline-none"
              style={
                activeFilter === f.id
                  ? { background: '#1D4ED8', color: 'white', border: '1px solid #1D4ED8' }
                  : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-28">

        {loading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-5 animate-pulse"
                style={{ background: 'linear-gradient(145deg,rgba(253,242,248,0.9),rgba(239,246,255,0.9))', border: '1px solid rgba(226,232,240,0.7)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-2 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-9 bg-slate-200 rounded-xl" />
                  <div className="flex-1 h-9 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="user-card p-6 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button type="button" onClick={() => window.location.reload()}
              className="text-xs font-semibold" style={{ color: '#1D4ED8' }}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-5 select-none">🌍</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>
              {activeFilter === 'all' ? 'No moments yet. Start the journey!' : 'No moments in this category.'}
            </h2>
            <p className="text-sm max-w-xs" style={{ color: '#64748B' }}>
              {activeFilter === 'all'
                ? 'Be the first to drop a moment and connect with fellow travellers. Tap + below!'
                : 'Try a different filter or tap + to create a new moment.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-4">
            {filtered.map(moment => (
              <MomentCard
                key={moment.id}
                moment={moment}
                userId={userId}
                alreadyRequested={requested.has(moment.id)}
                onRequested={id => setRequested(prev => new Set([...prev, id]))}
                onToast={pushToast}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Toasts ─────────────────────────────────────────────────────────── */}
      <Toast toasts={toasts} />

    </div>
  )
}
