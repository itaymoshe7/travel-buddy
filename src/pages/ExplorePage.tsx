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
  onCreateMoment: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVITY_EMOJI: Record<string, string> = {
  landing:   '✈️',
  stay:      '🏨',
  trip:      '🥾',
  nightlife: '🍻',
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return ''
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
      // Parse as local date to avoid UTC offset shifting the day
      new Date(d + 'T00:00:00'),
    )
  if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return fmt(start)
  return fmt(end!)
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
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
        className="w-10 h-10 rounded-full object-cover shrink-0 bg-slate-100"
      />
    )
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0 select-none">
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
    onToast('Request sent!', 'success')
  }

  const creator = moment.profiles
  const dateStr = formatDateRange(moment.start_date, moment.end_date)

  return (
    <div className="user-card p-5">
      {/* Top row: avatar + name + activity icon */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar url={creator?.avatar_url ?? null} name={creator?.full_name ?? null} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-main truncate">
            {creator?.full_name ?? 'Traveller'}
          </p>
          {creator?.bio && (
            <p className="text-xs text-slate-400 truncate">{creator.bio}</p>
          )}
        </div>
        <span className="text-2xl leading-none" title={moment.activity_type}>
          {ACTIVITY_EMOJI[moment.activity_type] ?? '📍'}
        </span>
      </div>

      {/* Middle: title, destination, dates */}
      <div className="mb-4">
        <h2 className="text-base font-bold text-text-main leading-snug mb-0.5">
          {moment.title}
        </h2>
        <p className="text-sm text-slate-500">
          📍 {moment.destination}
          {dateStr && (
            <span className="ml-2 text-slate-400">· {dateStr}</span>
          )}
        </p>
      </div>

      {/* Bottom: action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleImIn}
          disabled={requesting || alreadyRequested || isOwn}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
            ${isOwn
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed focus:ring-slate-300'
              : alreadyRequested
                ? 'bg-green-50 text-green-600 border border-green-200 cursor-default focus:ring-green-300'
                : 'bg-primary text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 focus:ring-primary'
            }`}
        >
          {requesting ? '…' : isOwn ? 'Your moment' : alreadyRequested ? '✓ Request sent' : "I'm in"}
        </button>

        <button
          type="button"
          onClick={() => {
            console.log('Chat coming soon — moment:', moment.id)
            onToast('Chat coming soon!', 'success')
          }}
          className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-accent-pink text-white hover:opacity-90 active:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent-pink focus:ring-offset-1"
        >
          Chat
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExplorePage({ userId, onCreateMoment }: Props) {
  const [moments,   setMoments]   = useState<MomentRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [requested, setRequested] = useState<Set<string>>(new Set())
  const [toasts,    setToasts]    = useState<ToastState[]>([])
  const toastCounter              = useRef(0)

  function pushToast(message: string, kind: 'success' | 'error') {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      // Fetch all moments with creator profile joined in one round-trip.
      // RLS (fixed — no recursive policy) now allows any authenticated user
      // to read all moments.
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

      // Pre-fetch IDs the user already requested so buttons render correctly on load
      const { data: reqs } = await supabase
        .from('moment_requests')
        .select('moment_id')
        .eq('user_id', userId)

      if (reqs) setRequested(new Set(reqs.map(r => r.moment_id)))

      setLoading(false)
    }

    load()
  }, [userId])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-bg-base">

      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur-sm border-b border-slate-100 px-4 py-4">
        <h1 className="text-2xl font-bold text-text-main tracking-tight">Explore Adventures</h1>
        <p className="text-xs text-slate-400 mt-0.5">Find travellers heading your way</p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="user-card p-5 animate-pulse">
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
                  <div className="flex-1 h-8 bg-slate-200 rounded-xl" />
                  <div className="flex-1 h-8 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="user-card p-6 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && moments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-5 select-none">🌍</div>
            <h2 className="text-lg font-bold text-text-main mb-2">
              No moments yet. Start the journey!
            </h2>
            <p className="text-sm text-slate-500 mb-8 max-w-xs">
              Be the first to drop a moment and connect with fellow travellers.
            </p>
            <button
              type="button"
              onClick={onCreateMoment}
              className="w-16 h-16 rounded-full bg-primary text-white text-3xl font-light shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center"
              aria-label="Create a moment"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        )}

        {!loading && !error && moments.length > 0 && (
          <div className="flex flex-col gap-6">
            {moments.map(moment => (
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

      {/* Toast stack — sits above the FAB */}
      <Toast toasts={toasts} />

      {/* FAB — bottom-20 clears the 64px BottomNav bar */}
      <button
        type="button"
        onClick={onCreateMoment}
        aria-label="Create a Moment"
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

    </div>
  )
}
