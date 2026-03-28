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
  chatId?:       string | null  // only set for joined moments
}

interface Props {
  userId:     string
  onOpenChat: (chatId: string, name: string) => void
}

type Tab = 'posts' | 'joined'

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
      new Date(d + 'T00:00:00'),
    )
  if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return fmt(start)
  return fmt(end!)
}

// ─── Moment Item ──────────────────────────────────────────────────────────────

function MomentItem({
  moment,
  onOpenChat,
}: {
  moment:      MomentCard
  onOpenChat?: (chatId: string, name: string) => void
}) {
  const dateStr = formatDateRange(moment.start_date, moment.end_date)
  const hasChatId = !!moment.chatId

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg,rgba(253,242,248,0.9) 0%,rgba(239,246,255,0.9) 100%)',
        border:     '1px solid rgba(226,232,240,0.7)',
        boxShadow:  '0 2px 10px rgba(15,23,42,0.06)',
      }}>
      <div className="p-4 flex items-center gap-4">
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

        {/* Chat button (joined tab only) or Chevron */}
        {hasChatId && onOpenChat ? (
          <button
            type="button"
            onClick={() => onOpenChat(moment.chatId!, moment.title)}
            className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none transition-colors"
            style={{ background: 'rgba(29,78,216,0.10)', color: '#1D4ED8' }}
          >
            Chat
          </button>
        ) : (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            strokeWidth={2} style={{ color: '#CBD5E1' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MyMoments({ userId, onOpenChat }: Props) {
  const [activeTab,    setActiveTab]    = useState<Tab>('posts')
  const [myPosts,      setMyPosts]      = useState<MomentCard[]>([])
  const [joinedMoments, setJoinedMoments] = useState<MomentCard[]>([])
  const [loadingPosts,  setLoadingPosts]  = useState(true)
  const [loadingJoined, setLoadingJoined] = useState(true)

  // Fetch moments created by the user
  useEffect(() => {
    async function load() {
      setLoadingPosts(true)
      const { data } = await supabase
        .from('moments')
        .select('id, title, destination, start_date, end_date, activity_type')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
      setMyPosts((data as MomentCard[]) ?? [])
      setLoadingPosts(false)
    }
    load()
  }, [userId])

  // Fetch moments the user has joined (accepted request) — include chat_id
  useEffect(() => {
    async function load() {
      setLoadingJoined(true)
      const { data: reqs } = await supabase
        .from('moment_requests')
        .select('moment_id, chat_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')

      if (!reqs || reqs.length === 0) {
        setJoinedMoments([])
        setLoadingJoined(false)
        return
      }

      // Build a momentId → chatId lookup
      const chatByMoment = new Map(reqs.map(r => [r.moment_id, r.chat_id as string | null]))
      const ids = reqs.map(r => r.moment_id)

      const { data } = await supabase
        .from('moments')
        .select('id, title, destination, start_date, end_date, activity_type')
        .in('id', ids)
        .order('created_at', { ascending: false })

      const enriched = ((data as MomentCard[]) ?? []).map(m => ({
        ...m,
        chatId: chatByMoment.get(m.id) ?? null,
      }))

      setJoinedMoments(enriched)
      setLoadingJoined(false)
    }
    load()
  }, [userId])

  const loading = activeTab === 'posts' ? loadingPosts : loadingJoined
  const items   = activeTab === 'posts' ? myPosts      : joinedMoments

  const emptyText = activeTab === 'posts'
    ? { icon: '🗺️', title: 'No moments posted yet', sub: 'Tap + to create your first moment.' }
    : { icon: '✈️', title: 'No trips joined yet',    sub: 'Browse the feed and tap "I\'m in" to join a moment.' }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-28" style={{ background: '#F8FAFC' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-0"
        style={{ background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(12px)' }}>

        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#94A3B8' }}>
          My Journey
        </p>
        <h1 className="text-[26px] font-bold leading-tight mb-4"
          style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          Moments 🗺️
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
