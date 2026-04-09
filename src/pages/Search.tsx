import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserResult {
  id:         string
  full_name:  string | null
  avatar_url: string | null
  bio:        string | null
}

interface Props {
  onBack:        () => void
  onViewProfile: (userId: string) => void
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const initials = (name ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ''}
        className="w-11 h-11 rounded-full object-cover shrink-0"
        style={{ border: '2px solid white', boxShadow: '0 1px 4px rgba(15,23,42,0.10)' }}
      />
    )
  }
  return (
    <div
      className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-sm font-bold select-none"
      style={{
        background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
        color: '#1D4ED8',
        border: '2px solid white',
        boxShadow: '0 1px 4px rgba(15,23,42,0.10)',
      }}
    >
      {initials}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Search({ onBack, onViewProfile }: Props) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)   // true once user has typed anything
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = query.trim()

    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio')
        .ilike('full_name', `%${trimmed}%`)
        .limit(20)

      setResults((data as UserResult[]) ?? [])
      setLoading(false)
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  const trimmed  = query.trim()
  const isEmpty  = !trimmed
  const noResult = touched && !loading && trimmed && results.length === 0

  return (
    <div style={{ background: 'transparent' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 px-5 pt-5 pb-4"
        style={{
          background:     'rgba(240,253,252,0.95)',
          backdropFilter: 'blur(12px)',
          boxShadow:      '0 1px 0 rgba(226,232,240,0.8)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
            Discover
          </p>
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center -mt-0.5 focus:outline-none"
            style={{ background: '#F1F5F9', color: '#64748B' }}
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
            style={{ color: '#94A3B8' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setTouched(true) }}
            placeholder="Search travellers by name…"
            className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm focus:outline-none"
            style={{
              background:   '#F8FAFC',
              border:       '1.5px solid #E2E8F0',
              color:        '#0F172A',
              fontFamily:   'inherit',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center focus:outline-none"
              style={{ background: '#CBD5E1', color: 'white' }}
              aria-label="Clear search"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-5 pt-4">

        {/* Skeleton while loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 px-1 py-1 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state — waiting for input */}
        {!loading && isEmpty && (
          <div className="flex flex-col items-center gap-3 pt-12 pb-8">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(29,78,216,0.08),rgba(13,148,136,0.08))' }}
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: '#1D4ED8' }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-center" style={{ color: '#64748B' }}>
              Search for travellers by name
            </p>
          </div>
        )}

        {/* No results */}
        {noResult && (
          <div className="flex flex-col items-center gap-3 pt-12 pb-8">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: '#F1F5F9' }}
            >
              <span className="text-3xl">🔍</span>
            </div>
            <p className="text-sm font-medium" style={{ color: '#64748B' }}>
              No travellers found for <span className="font-semibold" style={{ color: '#0F172A' }}>"{trimmed}"</span>
            </p>
          </div>
        )}

        {/* Result rows */}
        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-1">
            {results.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => onViewProfile(user.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors focus:outline-none"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(241,245,249,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar url={user.avatar_url} name={user.full_name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
                    {user.full_name ?? 'Traveller'}
                  </p>
                  {user.bio && (
                    <p className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>
                      {user.bio}
                    </p>
                  )}
                </div>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2} style={{ color: '#CBD5E1' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
