import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MomentFull {
  id:            string
  title:         string
  destination:   string
  region:        string
  start_date:    string | null
  end_date:      string | null
  activity_type: string
  description:   string | null
  total_spots:   number
  creator_id:    string
  profiles: {
    full_name:  string | null
    avatar_url: string | null
    bio:        string | null
  } | null
}

interface Participant {
  user_id:    string
  full_name:  string | null
  avatar_url: string | null
}

interface Props {
  momentId:      string
  userId:        string
  onBack:        () => void
  onOpenChat:    (chatId: string, name: string) => void
  onViewProfile: (userId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVITY_EMOJI: Record<string, string> = {
  landing: '✈️', stay: '🏡', trip: '🥾', nightlife: '🍻',
}
const ACTIVITY_LABEL: Record<string, string> = {
  landing: 'Flight', stay: 'Stay', trip: 'Adventure', nightlife: 'Nightlife',
}

const REGION_META: Record<string, { label: string; emoji: string }> = {
  'south-america':   { label: 'South America', emoji: '🌎' },
  'far-east':        { label: 'Far East',       emoji: '🏯' },
  'southeast-asia':  { label: 'SE Asia',        emoji: '🌏' },
  'europe':          { label: 'Europe',          emoji: '🏰' },
  'africa':          { label: 'Africa',          emoji: '🌍' },
  'central-america': { label: 'Central Am.',    emoji: '🌺' },
}

function regionLabel(slug: string) {
  const m = REGION_META[slug]
  return m ? `${m.emoji} ${m.label}` : slug
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return ''
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(d + 'T00:00:00'),
    )
  if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return fmt(start)
  return fmt(end!)
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function ParticipantAvatar({ url, name, size = 40 }: { url: string | null; name: string | null; size?: number }) {
  const style = {
    width: size, height: size,
    border: '2px solid white',
    boxShadow: '0 1px 4px rgba(15,23,42,0.12)',
  }
  if (url) {
    return <img src={url} alt={name ?? ''} className="rounded-full object-cover shrink-0" style={style} />
  }
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center font-bold select-none"
      style={{ ...style, background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1D4ED8', fontSize: size * 0.32 }}>
      {initials(name)}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MomentDetail({ momentId, userId, onBack, onOpenChat, onViewProfile }: Props) {
  const [moment,       setMoment]       = useState<MomentFull | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [requestInfo,  setRequestInfo]  = useState<{ status: string; chatId: string | null } | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [acting,       setActing]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [toastMsg,     setToastMsg]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [momentRes, participantsRes, requestRes] = await Promise.all([
        supabase
          .from('moments')
          .select('id, title, destination, region, start_date, end_date, activity_type, description, total_spots, creator_id, profiles!creator_id(full_name, avatar_url, bio)')
          .eq('id', momentId)
          .single(),

        supabase.rpc('get_accepted_participants', { moment_ids: [momentId] }),

        supabase
          .from('moment_requests')
          .select('status, chat_id')
          .eq('moment_id', momentId)
          .eq('user_id', userId)
          .maybeSingle(),
      ])

      if (momentRes.data) setMoment(momentRes.data as unknown as MomentFull)
      if (participantsRes.data) {
        setParticipants(
          (participantsRes.data as { moment_id: string; user_id: string; full_name: string | null; avatar_url: string | null }[])
            .map(p => ({ user_id: p.user_id, full_name: p.full_name, avatar_url: p.avatar_url }))
        )
      }
      if (requestRes.data) {
        setRequestInfo({ status: requestRes.data.status, chatId: requestRes.data.chat_id ?? null })
      }
      setLoading(false)
    }
    load()
  }, [momentId, userId])

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  async function handleSendRequest() {
    if (!moment || acting) return
    setActing(true)
    const { error } = await supabase.from('moment_requests').insert({ moment_id: momentId, user_id: userId })
    setActing(false)
    if (error) { showToast(error.code === '23505' ? 'Already requested!' : error.message); return }
    setRequestInfo({ status: 'pending', chatId: null })
    showToast('Request sent! ✈️')
  }

  async function handleDelete() {
    if (!moment || deleting) return
    const confirmed = window.confirm(
      'Are you sure you want to delete this moment? This will also remove all join requests and the associated chat.'
    )
    if (!confirmed) return
    setDeleting(true)
    const { error } = await supabase.from('moments').delete().eq('id', momentId)
    setDeleting(false)
    if (error) { showToast(`Could not delete: ${error.message}`); return }
    onBack()
  }

  async function handleChat() {
    if (!moment || acting) return
    const status = requestInfo?.status
    if (status === 'accepted' && requestInfo?.chatId) {
      onOpenChat(requestInfo.chatId, moment.title)
      return
    }
    if (moment.creator_id === userId) return
    setActing(true)
    const { data: chatId, error } = await supabase.rpc('find_or_create_dm', { other_user_id: moment.creator_id })
    setActing(false)
    if (error || !chatId) { showToast('Could not open chat. Try again.'); return }
    const creatorName = moment.profiles?.full_name ?? 'Traveller'
    onOpenChat(chatId as string, creatorName)
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!moment) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: '#64748B' }}>Moment not found.</p>
          <button type="button" onClick={onBack} className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>← Back</button>
        </div>
      </div>
    )
  }

  const isOwn      = moment.creator_id === userId
  const status     = requestInfo?.status ?? null
  const isAccepted = status === 'accepted'
  const isPending  = status === 'pending'
  const accepted   = participants.length
  const spotsLeft  = moment.total_spots - accepted
  const isFull     = spotsLeft <= 0
  const dateStr    = formatDateRange(moment.start_date, moment.end_date)
  const creator    = moment.profiles

  // ── Request button ─────────────────────────────────────────────────────────
  let reqStyle: React.CSSProperties
  let reqLabel: string
  if (isOwn) {
    reqStyle = { background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }
    reqLabel = 'Your moment'
  } else if (isAccepted) {
    reqStyle = { background: 'rgba(34,197,94,0.10)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)', cursor: 'default' }
    reqLabel = '✓ Approved'
  } else if (isPending) {
    reqStyle = { background: 'rgba(234,179,8,0.10)', color: '#B45309', border: '1px solid rgba(234,179,8,0.25)', cursor: 'default' }
    reqLabel = '⏳ Pending'
  } else if (status === 'declined') {
    reqStyle = { background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }
    reqLabel = 'Declined'
  } else if (isFull) {
    reqStyle = { background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }
    reqLabel = 'Full'
  } else {
    reqStyle = { background: '#1D4ED8', color: 'white' }
    reqLabel = acting ? '…' : 'Send Request'
  }

  const chatLabel = isAccepted ? 'Open Chat →' : isOwn ? 'Your moment' : 'Message creator'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-10" style={{ background: 'transparent' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3"
        style={{ background: 'rgba(240,253,252,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
            Moment Details
          </p>
          <div className="flex items-center gap-2">
            {isOwn && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', color: deleting ? '#FCA5A5' : '#EF4444' }}
                aria-label="Delete moment"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
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
        </div>
        <h1 className="text-[22px] font-bold leading-tight" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          {moment.title}
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── Core info card ───────────────────────────────────────────────── */}
        <div className="rounded-3xl p-5"
          style={{ background: 'white', boxShadow: '0 2px 4px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.10), 0 24px 48px rgba(15,23,42,0.05)', border: '1px solid rgba(226,232,240,0.7)' }}>

          {/* Activity + region badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(29,78,216,0.08)', color: '#1D4ED8' }}>
              {ACTIVITY_EMOJI[moment.activity_type] ?? '📍'} {ACTIVITY_LABEL[moment.activity_type] ?? moment.activity_type}
            </span>
            {moment.region && moment.region !== 'Other' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(14,165,233,0.08)', color: '#0369A1' }}>
                {regionLabel(moment.region)}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ml-auto"
              style={isFull
                ? { background: 'rgba(239,68,68,0.10)', color: '#DC2626' }
                : { background: 'rgba(244,114,182,0.12)', color: '#BE185D' }}>
              {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
            </span>
          </div>

          {/* Destination + dates */}
          <div className="space-y-1.5 mb-4">
            <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#0F172A' }}>
              <span style={{ color: '#64748B' }}>📍</span> {moment.destination}
            </p>
            {dateStr && (
              <p className="text-sm flex items-center gap-2" style={{ color: '#64748B' }}>
                <span>📅</span> {dateStr}
              </p>
            )}
            <p className="text-sm flex items-center gap-2" style={{ color: '#64748B' }}>
              <span>👥</span> {accepted} / {moment.total_spots} spots filled
            </p>
          </div>

          {/* Description */}
          {moment.description && (
            <div className="rounded-xl px-4 py-3 mb-4"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#94A3B8' }}>About this moment</p>
              <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{moment.description}</p>
            </div>
          )}

          {/* Creator row */}
          <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
            <ParticipantAvatar url={creator?.avatar_url ?? null} name={creator?.full_name ?? null} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#94A3B8' }}>Posted by</p>
              <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
                {creator?.full_name ?? 'Traveller'}
              </p>
            </div>
            {!isOwn && (
              <button
                type="button"
                onClick={() => onViewProfile(moment.creator_id)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none"
                style={{ background: '#F1F5F9', color: '#64748B' }}
              >
                View Profile
              </button>
            )}
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSendRequest}
            disabled={acting || !!status || isOwn || isFull}
            className="flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-wider focus:outline-none transition-all"
            style={reqStyle}
          >
            {reqLabel}
          </button>
          <button
            type="button"
            onClick={handleChat}
            disabled={acting || isOwn}
            className="flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-wider focus:outline-none transition-all"
            style={isOwn
              ? { background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }
              : { background: 'rgba(29,78,216,0.10)', color: '#1D4ED8', cursor: 'pointer' }}
          >
            {acting ? '…' : chatLabel}
          </button>
        </div>

        {/* ── Participants ────────────────────────────────────────────────── */}
        <div className="rounded-3xl p-5"
          style={{ background: 'white', boxShadow: '0 2px 4px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.10), 0 24px 48px rgba(15,23,42,0.05)', border: '1px solid rgba(226,232,240,0.7)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748B' }}>
            Who's going · {accepted} / {moment.total_spots}
          </p>

          {participants.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#94A3B8' }}>
              No one has joined yet — be the first!
            </p>
          ) : (
            <div className="space-y-3">
              {participants.map(p => (
                <div key={p.user_id} className="flex items-center gap-3">
                  <ParticipantAvatar url={p.avatar_url} name={p.full_name} size={40} />
                  <p className="flex-1 text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
                    {p.full_name ?? 'Traveller'}
                  </p>
                  <button
                    type="button"
                    onClick={() => onViewProfile(p.user_id)}
                    className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none transition-colors"
                    style={{ background: '#F1F5F9', color: '#64748B' }}
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg text-white z-50"
          style={{ background: '#1D4ED8' }}>
          {toastMsg}
        </div>
      )}

    </div>
  )
}
