import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MomentRow {
  id: string
  title: string
  destination: string
  region: string
  start_date: string | null
  end_date: string | null
  activity_type: string
  creator_id: string
  total_spots: number
  created_at: string
  image_url: string | null
  description: string | null
  profiles: {
    full_name:   string | null
    avatar_url:  string | null
    bio:         string | null
    gender:      string | null
    social_link: string | null
  } | null
}

interface RequestInfo {
  status:  string        // 'pending' | 'accepted' | 'declined'
  chatId:  string | null
}

interface Participant {
  full_name:  string | null
  avatar_url: string | null
}

interface Props {
  userId:          string
  onNotifications: () => void
  onOpenChat:      (chatId: string, name: string) => void
  onSelectMoment:  (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVITY_EMOJI: Record<string, string> = {
  landing:   '✈️',
  stay:      '🏡',
  trip:      '🥾',
  nightlife: '🍻',
}

// Activity filters
type ActivityFilter = 'all' | 'stay' | 'trip' | 'landing' | 'nightlife'
const ACTIVITY_FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: 'all',       label: '⚡ All'       },
  { id: 'stay',      label: '🏠 Stays'     },
  { id: 'trip',      label: '🏔️ Adventure' },
  { id: 'landing',   label: '✈️ Flights'   },
  { id: 'nightlife', label: '🍻 Nightlife' },
]

// Region filters — slugs must match DB CHECK constraint
const REGION_META: Record<string, { label: string; emoji: string }> = {
  'south-america':         { label: 'South America',         emoji: '🌎' },
  'central-north-america': { label: 'Central & North America', emoji: '🗽' },
  'europe':                { label: 'Europe',                 emoji: '🏰' },
  'australia':             { label: 'Australia',              emoji: '🐨' },
  'africa':                { label: 'Africa',                 emoji: '🦁' },
  'asia':                  { label: 'Asia',                   emoji: '⛩️' },
}
const REGION_FILTER_IDS = Object.keys(REGION_META)

function regionLabel(slug: string): string {
  const m = REGION_META[slug]
  return m ? `${m.emoji} ${m.label}` : slug
}

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

function timeAgo(ts: string): string {
  const diff  = Date.now() - new Date(ts).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  const weeks = Math.floor(days / 7)
  if (mins  <  1) return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  <  7) return `${days}d ago`
  if (weeks <  5) return `${weeks}w ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(ts))
}

function formatPostedDate(ts: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ts))
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

// ─── Participant Avatars ──────────────────────────────────────────────────────

const MAX_SHOWN = 3

function ParticipantAvatars({ participants, mut = '#94A3B8' }: { participants: Participant[]; mut?: string }) {
  if (participants.length === 0) return null
  const shown = participants.slice(0, MAX_SHOWN)
  const extra = participants.length - MAX_SHOWN

  return (
    <div className="flex items-center gap-1.5 mt-3">
      <div className="flex items-center">
        {shown.map((p, i) => (
          <div key={i} className="rounded-full overflow-hidden shrink-0"
            style={{
              width: 22, height: 22,
              border: '1.5px solid white',
              boxShadow: '0 1px 3px rgba(15,23,42,0.12)',
              marginLeft: i === 0 ? 0 : -6,
              zIndex: shown.length - i,
              position: 'relative',
            }}>
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.full_name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, color: '#1D4ED8',
              }}>
                {initials(p.full_name)}
              </div>
            )}
          </div>
        ))}
        {extra > 0 && (
          <div style={{
            width: 22, height: 22,
            borderRadius: '50%',
            border: '1.5px solid white',
            background: '#E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, color: '#64748B',
            marginLeft: -6, position: 'relative', zIndex: 0,
          }}>
            +{extra}
          </div>
        )}
      </div>
      <p className="text-[11px]" style={{ color: mut }}>
        {participants.length === 1
          ? `${participants[0].full_name ?? 'Someone'} joined`
          : `${participants.length} travellers joined`}
      </p>
    </div>
  )
}

// ─── Activity pill colours ────────────────────────────────────────────────────

const ACTIVITY_PILL_COLORS: Record<ActivityFilter, string> = {
  all:       '#1D4ED8',
  stay:      '#EA580C',
  trip:      '#059669',
  landing:   '#7C3AED',
  nightlife: '#DB2777',
}

// ─── Moment Card ──────────────────────────────────────────────────────────────

function MomentCard({
  moment,
  userId,
  requestInfo,
  acceptedCount,
  participants,
  onRequested,
  onToast,
  onOpenChat,
  onSelect,
}: {
  moment:        MomentRow
  userId:        string
  requestInfo:   RequestInfo | null
  acceptedCount: number
  participants:  Participant[]
  onRequested:   (id: string) => void
  onToast:       (msg: string, kind: 'success' | 'error') => void
  onOpenChat:    (chatId: string, name: string) => void
  onSelect:      () => void
}) {
  const [requesting, setRequesting] = useState(false)
  const [chatting,   setChatting]   = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const isOwn      = moment.creator_id === userId
  const status     = requestInfo?.status ?? null
  const isPending  = status === 'pending'
  const isAccepted = status === 'accepted'
  const spotsLeft  = moment.total_spots - acceptedCount
  const isFull     = spotsLeft <= 0
  const hasImage   = !!moment.image_url

  async function handleSendRequest() {
    if (status || isOwn || isFull) return
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

  async function handleChat() {
    if (isOwn || chatting) return
    setChatting(true)
    const { data: chatId, error } = await supabase.rpc('find_or_create_dm', {
      other_user_id: moment.creator_id,
    })
    setChatting(false)
    if (error || !chatId) {
      onToast('Could not open chat. Try again.', 'error')
      return
    }
    const creatorName = creator?.full_name ?? 'Traveller'
    onOpenChat(chatId as string, creatorName)
  }

  // ── Photo-hero layout (image_url present) ────────────────────────────────
  if (hasImage) {
    return (
      <div
        className="relative rounded-3xl overflow-hidden cursor-pointer"
        style={{ minHeight: 300, boxShadow: '0 4px 24px rgba(15,23,42,0.18), 0 1px 4px rgba(15,23,42,0.10)' }}
        onClick={() => { setMenuOpen(false); onSelect() }}
      >
        {/* Full-bleed background image */}
        <img
          src={moment.image_url!}
          alt={moment.title}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dual overlay: bottom gradient keeps bottom text readable, top gradient keeps creator readable */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, transparent 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, transparent 42%)' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-5" style={{ minHeight: 300 }}>

          {/* Top: creator row + three-dots menu */}
          <div className="flex items-center gap-2.5">
            <Avatar url={creator?.avatar_url ?? null} name={creator?.full_name ?? null} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#FFFFFF', textShadow: '0 1px 4px rgba(0,0,0,0.60)' }}>
                {creator?.full_name ?? 'Traveller'}
              </p>
              {creator?.social_link ? (
                <a
                  href={creator.social_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs truncate block"
                  style={{ color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 3px rgba(0,0,0,0.50)' }}
                  onClick={e => e.stopPropagation()}
                >
                  {(() => { try { return new URL(creator.social_link!).hostname.replace('www.', '') } catch { return creator.social_link } })()}
                </a>
              ) : creator?.bio ? (
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 3px rgba(0,0,0,0.50)' }}>{creator.bio}</p>
              ) : null}
            </div>

            {/* Three-dots menu */}
            <div
              className="relative shrink-0"
              tabIndex={-1}
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenuOpen(false) }}
            >
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
                className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
                aria-label="Options"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#FFFFFF' }}>
                  <circle cx="10" cy="4"  r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="10" cy="16" r="1.5" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  className="absolute top-full right-0 mt-1.5 w-44 rounded-2xl overflow-hidden z-20"
                  style={{
                    background: 'rgba(15,23,42,0.88)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.30)',
                  }}
                >
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setMenuOpen(false); onSelect() }}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-white transition-colors focus:outline-none"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    View Details
                  </button>
                  {isOwn && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setMenuOpen(false); onSelect() }}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-white transition-colors focus:outline-none"
                      style={{ background: 'transparent', borderTop: '1px solid rgba(255,255,255,0.10)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      Edit Moment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: title, description, details, participants, time */}
          <div>
            <h2 className="text-xl font-bold leading-snug mb-1.5" style={{ color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.70)' }}>
              {moment.title}
            </h2>

            {moment.description && (
              <p className="text-sm mb-3 line-clamp-2" style={{ color: '#FFFFFF', textShadow: '0 1px 4px rgba(0,0,0,0.55)' }}>
                {moment.description}
              </p>
            )}

            {/* Details: destination · dates · spots */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.60)' }}>
              <span style={{ color: '#FFFFFF' }}>📍 {moment.destination}</span>
              {dateStr && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.50)' }}>·</span>
                  <span style={{ color: '#FFFFFF' }}>🗓 {dateStr}</span>
                </>
              )}
              <span style={{ color: 'rgba(255,255,255,0.50)' }}>·</span>
              <span style={{ color: '#FFFFFF' }}>{isFull ? '🔴 Full' : `👥 ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}</span>
            </div>

            {participants.length > 0 && (
              <ParticipantAvatars participants={participants} mut="rgba(255,255,255,0.78)" />
            )}

            <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.68)', textShadow: '0 1px 3px rgba(0,0,0,0.50)' }}>
              {timeAgo(moment.created_at)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Standard card (no image) ──────────────────────────────────────────────
  const gender = creator?.gender ?? null
  const cardBg =
    gender === 'female'
      ? 'linear-gradient(145deg, #FCE4EC 0%, #FFFFFF 100%)'
      : gender === 'male'
        ? 'linear-gradient(145deg, #E0F7FA 0%, #FFFFFF 100%)'
        : 'linear-gradient(145deg, rgba(253,242,248,0.9) 0%, rgba(239,246,255,0.9) 100%)'
  const requestBtnColor =
    gender === 'female' ? '#F472B6'
    : gender === 'male'  ? '#1D4ED8'
    : '#F472B6'

  let requestBtnStyle: React.CSSProperties
  let requestBtnLabel: string
  if (isOwn) {
    requestBtnStyle = { background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }
    requestBtnLabel = 'Your moment'
  } else if (isAccepted) {
    requestBtnStyle = { background: 'rgba(34,197,94,0.10)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)', cursor: 'default' }
    requestBtnLabel = '✓ Approved'
  } else if (isPending) {
    requestBtnStyle = { background: 'rgba(234,179,8,0.10)', color: '#B45309', border: '1px solid rgba(234,179,8,0.25)', cursor: 'default' }
    requestBtnLabel = '⏳ Pending'
  } else if (status === 'declined') {
    requestBtnStyle = { background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }
    requestBtnLabel = 'Declined'
  } else if (isFull) {
    requestBtnStyle = { background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }
    requestBtnLabel = 'Full'
  } else {
    requestBtnStyle = { background: requestBtnColor, color: 'white' }
    requestBtnLabel = requesting ? '…' : 'Send Request'
  }

  const chatBtnActive = !isOwn
  const chatBtnStyle: React.CSSProperties = chatBtnActive
    ? { background: 'rgba(29,78,216,0.10)', color: '#1D4ED8', cursor: 'pointer' }
    : { background: '#F1F5F9', color: '#CBD5E1', cursor: 'not-allowed' }

  return (
    <div className="rounded-3xl overflow-hidden"
      style={{
        background: cardBg,
        boxShadow: '0 2px 4px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.10), 0 24px 48px rgba(15,23,42,0.05)',
        border: '1px solid rgba(226,232,240,0.7)',
      }}>

      <div className="p-5">
        <div className="cursor-pointer" onClick={onSelect}>
          {/* Top row: avatar + name + activity icon */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar url={creator?.avatar_url ?? null} name={creator?.full_name ?? null} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
                {creator?.full_name ?? 'Traveller'}
              </p>
              {creator?.social_link ? (
                <a
                  href={creator.social_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs truncate block"
                  style={{ color: '#38BDF8' }}
                  onClick={e => e.stopPropagation()}
                >
                  {(() => { try { return new URL(creator.social_link!).hostname.replace('www.', '') } catch { return creator.social_link } })()}
                </a>
              ) : creator?.bio ? (
                <p className="text-xs truncate" style={{ color: '#94A3B8' }}>{creator.bio}</p>
              ) : null}
            </div>
            <span className="text-xl leading-none" title={moment.activity_type}>
              {ACTIVITY_EMOJI[moment.activity_type] ?? '📍'}
            </span>
          </div>

          {/* Title + destination + region + spots */}
          <div className="mb-1">
            <h2 className="text-base font-bold leading-snug mb-1" style={{ color: '#0F172A' }}>
              {moment.title}
            </h2>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm truncate" style={{ color: '#64748B' }}>
                  📍 {moment.destination}
                  {dateStr && <span className="ml-2" style={{ color: '#94A3B8' }}>· {dateStr}</span>}
                </p>
                {moment.region && moment.region !== 'Other' && (
                  <p className="text-[11px] mt-0.5 font-medium" style={{ color: '#94A3B8' }}>
                    {regionLabel(moment.region)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={isFull
                  ? { background: 'rgba(239,68,68,0.10)', color: '#DC2626' }
                  : { background: 'rgba(244,114,182,0.12)', color: '#BE185D' }}>
                {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
              </span>
            </div>
          </div>

          <ParticipantAvatars participants={participants} />

          <p className="text-[11px] mt-2.5" style={{ color: '#CBD5E1' }}>
            Posted {formatPostedDate(moment.created_at)} · {timeAgo(moment.created_at)}
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleSendRequest() }}
            disabled={requesting || !!status || isOwn || isFull}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all focus:outline-none"
            style={requestBtnStyle}
          >
            {requestBtnLabel}
          </button>

          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleChat() }}
            disabled={!chatBtnActive || chatting}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all focus:outline-none"
            style={chatBtnStyle}
          >
            {chatting ? '…' : 'Chat'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExplorePage({ userId, onNotifications, onOpenChat, onSelectMoment }: Props) {
  const [moments,          setMoments]          = useState<MomentRow[]>([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState<string | null>(null)
  const [requestMap,       setRequestMap]       = useState<Map<string, RequestInfo>>(new Map())
  const [acceptedCountMap, setAcceptedCountMap] = useState<Map<string, number>>(new Map())
  const [participantsMap,  setParticipantsMap]  = useState<Map<string, Participant[]>>(new Map())
  const [toasts,           setToasts]           = useState<ToastState[]>([])
  const [activityFilter,   setActivityFilter]   = useState<ActivityFilter>('all')
  const [regionFilter,     setRegionFilter]     = useState<string>('all')
  const [pendingCount,     setPendingCount]     = useState(0)
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

      // Global fetch — all moments regardless of user's region
      const { data, error: fetchError } = await supabase
        .from('moments')
        .select(`
          id,
          title,
          destination,
          region,
          start_date,
          end_date,
          activity_type,
          creator_id,
          total_spots,
          created_at,
          image_url,
          description,
          profiles!creator_id (
            full_name,
            avatar_url,
            bio,
            gender,
            social_link
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchError) {
        setError(fetchError.message)
      } else {
        const rows = (data as unknown as MomentRow[]) ?? []
        setMoments(rows)

        if (rows.length > 0) {
          const ids = rows.map(m => m.id)
          const [{ data: counts }, { data: parts }] = await Promise.all([
            supabase.rpc('get_accepted_counts',      { moment_ids: ids }),
            supabase.rpc('get_accepted_participants', { moment_ids: ids }),
          ])
          if (counts) {
            const countMap = new Map<string, number>()
            for (const c of counts as { moment_id: string; accepted_count: number }[]) {
              countMap.set(c.moment_id, Number(c.accepted_count))
            }
            setAcceptedCountMap(countMap)
          }
          if (parts) {
            const pMap = new Map<string, Participant[]>()
            for (const p of parts as { moment_id: string; full_name: string | null; avatar_url: string | null }[]) {
              const list = pMap.get(p.moment_id) ?? []
              list.push({ full_name: p.full_name, avatar_url: p.avatar_url })
              pMap.set(p.moment_id, list)
            }
            setParticipantsMap(pMap)
          }
        }
      }

      const { data: reqs } = await supabase
        .from('moment_requests')
        .select('moment_id, status, chat_id')
        .eq('user_id', userId)

      if (reqs) {
        const map = new Map<string, RequestInfo>()
        for (const r of reqs) {
          map.set(r.moment_id, { status: r.status, chatId: r.chat_id ?? null })
        }
        setRequestMap(map)
      }

      // Pending bell count for my moments
      const { data: myMoments } = await supabase
        .from('moments')
        .select('id')
        .eq('creator_id', userId)
      const myMomentIds = (myMoments ?? []).map((m: { id: string }) => m.id)
      if (myMomentIds.length > 0) {
        const { count } = await supabase
          .from('moment_requests')
          .select('id', { count: 'exact', head: true })
          .in('moment_id', myMomentIds)
          .eq('status', 'pending')
        setPendingCount(count ?? 0)
      }

      setLoading(false)
    }

    load()
  }, [userId])

  // Client-side filtering: activity AND region — hide moments whose end_date has passed
  const today = new Date().toISOString().split('T')[0]
  const filtered = moments.filter(m => {
    if (m.end_date && m.end_date < today) return false
    const matchActivity = activityFilter === 'all' || m.activity_type === activityFilter
    const matchRegion   = regionFilter   === 'all' || m.region        === regionFilter
    return matchActivity && matchRegion
  })

  // Active region label for the header subtitle
  const activeRegionMeta = regionFilter !== 'all' ? REGION_META[regionFilter] : null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen" style={{ background: 'transparent' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-5 pt-5 pb-0"
        style={{ background: '#F0FDFC', boxShadow: '0 1px 0 rgba(226,232,240,0.8), 0 2px 8px rgba(15,23,42,0.04)' }}>

        {/* Label row + bell */}
        <div className="flex items-start justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
            {activeRegionMeta ? `${activeRegionMeta.emoji} ${activeRegionMeta.label}` : 'Global Feed'}
          </p>
          <button
            type="button"
            aria-label="Notifications"
            onClick={onNotifications}
            className="relative w-8 h-8 rounded-full flex items-center justify-center -mt-0.5 transition-colors focus:outline-none"
            style={{ background: '#F1F5F9', color: '#64748B' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {pendingCount > 0 && (
              <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: '#EF4444' }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ background: '#EF4444' }} />
              </span>
            )}
          </button>
        </div>

        {/* Title */}
        <h1 className="text-[26px] font-bold leading-tight mb-3" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          Live feed 🌍
        </h1>

        {/* Activity filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}>
          {ACTIVITY_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActivityFilter(f.id)}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all focus:outline-none"
              style={
                activityFilter === f.id
                  ? { background: ACTIVITY_PILL_COLORS[f.id], color: 'white', border: `1px solid ${ACTIVITY_PILL_COLORS[f.id]}` }
                  : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Region filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}>
          {/* All regions reset pill */}
          <button
            type="button"
            onClick={() => setRegionFilter('all')}
            className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all focus:outline-none"
            style={
              regionFilter === 'all'
                ? { background: '#0EA5E9', color: 'white', border: '1px solid #0EA5E9' }
                : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }
            }
          >
            🌐 All Regions
          </button>
          {REGION_FILTER_IDS.map(id => {
            const meta   = REGION_META[id]
            const active = regionFilter === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setRegionFilter(active ? 'all' : id)}
                className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all focus:outline-none"
                style={
                  active
                    ? { background: '#0EA5E9', color: 'white', border: '1px solid #0EA5E9' }
                    : { background: 'white', color: '#64748B', border: '1px solid #E2E8F0' }
                }
              >
                {meta.emoji} {meta.label}
              </button>
            )
          })}
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
                  <div className="h-2 bg-slate-100 rounded w-1/3" />
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
            <div className="text-5xl mb-5 select-none">
              {activeRegionMeta ? activeRegionMeta.emoji : '🌍'}
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>
              {activeRegionMeta
                ? `No moments in ${activeRegionMeta.label} yet`
                : 'No moments yet. Start the journey!'}
            </h2>
            <p className="text-sm max-w-xs" style={{ color: '#64748B' }}>
              {activeRegionMeta
                ? 'Be the first to post a moment here, or try a different region.'
                : 'Be the first to drop a moment and connect with fellow travellers. Tap + below!'}
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
                requestInfo={requestMap.get(moment.id) ?? null}
                acceptedCount={acceptedCountMap.get(moment.id) ?? 0}
                participants={participantsMap.get(moment.id) ?? []}
                onRequested={id => setRequestMap(prev => {
                  const next = new Map(prev)
                  next.set(id, { status: 'pending', chatId: null })
                  return next
                })}
                onToast={pushToast}
                onOpenChat={onOpenChat}
                onSelect={() => onSelectMoment(moment.id)}
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
