import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MomentCard {
  id:            string
  title:         string
  destination:   string
  start_date:    string | null
  end_date:      string | null
  activity_type: string
  image_url?:    string | null
  description?:  string | null
  creator_id?:   string       // only set for joined moments
  creator_name?: string | null // loaded alongside creator_id for DM name fallback
  status?:       string       // 'pending' | 'accepted' — only set for joined moments
  chatId?:       string | null // only set for joined moments
}

interface Props {
  userId:         string
  onOpenChat:     (chatId: string, name: string) => void
  onSelectMoment: (id: string) => void
}

type Tab = 'posts' | 'joined'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVITY_EMOJI: Record<string, string> = {
  landing:   '✈️',
  stay:      '🏡',
  trip:      '🥾',
  nightlife: '🍻',
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

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isApproved = status === 'accepted'
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={
        isApproved
          ? { background: 'rgba(34,197,94,0.12)', color: '#16A34A' }
          : { background: 'rgba(148,163,184,0.15)', color: '#64748B' }
      }
    >
      {isApproved ? (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Approved
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
          Pending
        </>
      )}
    </span>
  )
}

// ─── Moment Item ──────────────────────────────────────────────────────────────

function MomentItem({
  moment,
  onOpenChat,
  onDelete,
  onSelect,
}: {
  moment:      MomentCard
  onOpenChat?: (chatId: string, name: string) => void
  onDelete?:   () => void
  onSelect:    () => void
}) {
  const [chatting, setChatting] = useState(false)
  const dateStr    = formatDateRange(moment.start_date, moment.end_date)
  const isApproved = moment.status === 'accepted'
  const isPending  = moment.status === 'pending'
  const showChat   = onOpenChat !== undefined && (isApproved || isPending)
  const hasImage   = !!moment.image_url

  async function handleChat() {
    if (!onOpenChat || chatting) return

    if (isApproved && moment.chatId) {
      onOpenChat(moment.chatId, moment.title)
      return
    }

    if (isPending && moment.creator_id) {
      setChatting(true)
      const { data: chatId, error } = await supabase.rpc('find_or_create_dm', {
        other_user_id: moment.creator_id,
      })
      setChatting(false)
      if (!error && chatId) {
        const fallback = moment.creator_name ?? 'Traveller'
        onOpenChat(chatId as string, fallback)
      }
    }
  }

  // ── Photo-hero layout ────────────────────────────────────────────────────
  if (hasImage) {
    return (
      <div className="relative rounded-3xl overflow-hidden"
        style={{ minHeight: 180, boxShadow: '0 4px 20px rgba(15,23,42,0.16), 0 1px 4px rgba(15,23,42,0.08)' }}>

        {/* Full-bleed background image */}
        <img
          src={moment.image_url!}
          alt={moment.title}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlay — bottom for text, top for action buttons */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.50) 45%, transparent 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 38%)' }} />

        {/* Floating actions — top right */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          {showChat && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleChat() }}
              disabled={chatting}
              className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'white', backdropFilter: 'blur(8px)' }}
            >
              {chatting ? '…' : 'Chat'}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="w-7 h-7 rounded-lg flex items-center justify-center focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'white', backdropFilter: 'blur(8px)' }}
              aria-label="Delete moment"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 cursor-pointer" onClick={onSelect}>
          <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: '#FFFFFF', textShadow: '0 1px 4px rgba(0,0,0,0.60)' }}>{moment.title}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,0.55)' }}>
                <span style={{ color: '#FFFFFF' }}>📍 {moment.destination}</span>
                {dateStr && <span style={{ color: 'rgba(255,255,255,0.75)' }}> · {dateStr}</span>}
              </p>
              {moment.description && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 3px rgba(0,0,0,0.50)' }}>
                  {moment.description}
                </p>
              )}
          </div>
          {moment.status && (
            <div className="mt-2">
              <StatusBadge status={moment.status} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Standard card (no image) ──────────────────────────────────────────────
  return (
    <div className="rounded-3xl overflow-hidden"
      style={{
        background: isApproved
          ? 'linear-gradient(145deg, rgba(220,252,231,0.6) 0%, rgba(239,246,255,0.9) 100%)'
          : 'linear-gradient(145deg, rgba(248,250,252,0.9) 0%, rgba(239,246,255,0.9) 100%)',
        border:    `1px solid ${isApproved ? 'rgba(134,239,172,0.5)' : 'rgba(226,232,240,0.7)'}`,
        boxShadow: '0 2px 4px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.10)',
      }}>
      <div className="p-4 cursor-pointer" onClick={onSelect}>
        <div className="flex items-center gap-3">
          {/* Activity icon bubble */}
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl"
            style={{ background: 'white', boxShadow: '0 1px 4px rgba(15,23,42,0.08)' }}>
            {ACTIVITY_EMOJI[moment.activity_type] ?? '📍'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>
              {moment.title}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>
              📍 {moment.destination}
              {dateStr && <span style={{ color: '#94A3B8' }}> · {dateStr}</span>}
            </p>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showChat && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); handleChat() }}
                disabled={chatting}
                className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none transition-colors"
                style={{ background: 'rgba(29,78,216,0.10)', color: '#1D4ED8', cursor: 'pointer' }}
              >
                {chatting ? '…' : 'Chat'}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onDelete() }}
                className="w-7 h-7 rounded-lg flex items-center justify-center focus:outline-none transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
                aria-label="Delete moment"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            {!showChat && !onDelete && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                strokeWidth={2} style={{ color: '#CBD5E1' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>

        {moment.status && (
          <div className="mt-2.5 pl-14">
            <StatusBadge status={moment.status} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MyMoments({ userId, onOpenChat, onSelectMoment }: Props) {
  const [activeTab,     setActiveTab]     = useState<Tab>('posts')
  const [myPosts,       setMyPosts]       = useState<MomentCard[]>([])
  const [joinedMoments, setJoinedMoments] = useState<MomentCard[]>([])
  const [loadingPosts,  setLoadingPosts]  = useState(true)
  const [loadingJoined, setLoadingJoined] = useState(true)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)

  // Fetch moments created by the user
  useEffect(() => {
    async function load() {
      setLoadingPosts(true)
      const { data } = await supabase
        .from('moments')
        .select('id, title, destination, start_date, end_date, activity_type, image_url, description')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
      setMyPosts((data as MomentCard[]) ?? [])
      setLoadingPosts(false)
    }
    load()
  }, [userId])

  // Fetch all non-declined requests (pending + accepted) — include status and chat_id
  useEffect(() => {
    async function load() {
      setLoadingJoined(true)
      const { data: reqs } = await supabase
        .from('moment_requests')
        .select('moment_id, status, chat_id')
        .eq('user_id', userId)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })

      if (!reqs || reqs.length === 0) {
        setJoinedMoments([])
        setLoadingJoined(false)
        return
      }

      // Build a momentId → { status, chatId } lookup
      const reqByMoment = new Map(
        reqs.map(r => [r.moment_id, { status: r.status as string, chatId: r.chat_id as string | null }])
      )
      const ids = reqs.map(r => r.moment_id)

      const { data } = await supabase
        .from('moments')
        .select('id, title, destination, start_date, end_date, activity_type, image_url, description, creator_id, profiles!creator_id(full_name)')
        .in('id', ids)

      // Preserve the request ordering (most recent first)
      // Supabase returns joined rows as an array even for a single FK match
      type RawMoment = MomentCard & { profiles?: Array<{ full_name: string | null }> | null }
      const momentById = new Map(((data as RawMoment[]) ?? []).map(m => [m.id, m]))
      const enriched = ids
        .map(id => {
          const m = momentById.get(id)
          if (!m) return null
          const req = reqByMoment.get(id)!
          const { profiles, ...rest } = m
          return {
            ...rest,
            creator_name: profiles?.[0]?.full_name ?? null,
            status:  req.status,
            chatId:  req.chatId,
          }
        })
        .filter(Boolean) as MomentCard[]

      setJoinedMoments(enriched)
      setLoadingJoined(false)
    }
    load()
  }, [userId])

  async function handleDelete(momentId: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this moment? This will also remove all join requests and the associated chat.'
    )
    if (!confirmed) return
    setDeletingId(momentId)
    const { error } = await supabase.from('moments').delete().eq('id', momentId)
    setDeletingId(null)
    if (!error) {
      setMyPosts(prev => prev.filter(m => m.id !== momentId))
    }
  }

  const loading = activeTab === 'posts' ? loadingPosts : loadingJoined
  const items   = activeTab === 'posts' ? myPosts      : joinedMoments

  const emptyText = activeTab === 'posts'
    ? { icon: '🗺️', title: 'No moments posted yet', sub: 'Tap + to create your first moment.' }
    : { icon: '✈️', title: 'No requests yet',    sub: 'Browse the feed and tap "Send Request" to join a moment.' }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-28" style={{ background: 'transparent' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-0"
        style={{ background: 'rgba(240,253,252,0.92)', backdropFilter: 'blur(12px)' }}>

        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#94A3B8' }}>
          My Journey
        </p>
        <h1 className="text-[26px] font-bold leading-tight mb-4"
          style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          Moments
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 pb-0">
          {(['posts', 'joined'] as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2 text-sm font-semibold rounded-t-xl transition-all focus:outline-none"
              style={
                activeTab === tab
                  ? { color: '#1D4ED8', borderBottom: '2px solid #1D4ED8', background: 'transparent' }
                  : { color: '#94A3B8', borderBottom: '2px solid transparent', background: 'transparent' }
              }
            >
              {tab === 'posts' ? 'My Posts' : 'Joined'}
            </button>
          ))}
        </div>

        {/* Tab underline track */}
        <div style={{ height: '1px', background: '#E2E8F0' }} />
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pt-4">

        {/* Skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-4 flex items-center gap-4 animate-pulse"
                style={{ background: 'white', border: '1px solid rgba(226,232,240,0.7)' }}>
                <div className="w-11 h-11 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-2 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4 select-none">{emptyText.icon}</div>
            <h2 className="text-base font-bold mb-1" style={{ color: '#0F172A' }}>
              {emptyText.title}
            </h2>
            <p className="text-sm max-w-xs" style={{ color: '#64748B' }}>
              {emptyText.sub}
            </p>
          </div>
        )}

        {/* List */}
        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map(m => (
              <MomentItem
                key={m.id}
                moment={m}
                onOpenChat={activeTab === 'joined' ? onOpenChat : undefined}
                onDelete={activeTab === 'posts' && deletingId !== m.id
                  ? () => handleDelete(m.id)
                  : undefined}
                onSelect={() => onSelectMoment(m.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
