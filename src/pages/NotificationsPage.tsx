import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomingRequest {
  id:        string
  user_id:   string
  moment_id: string
  moments:   { title: string } | null
  profiles:  { full_name: string | null; avatar_url: string | null } | null
}

interface ApprovedAlert {
  id:        string
  moment_id: string
  chat_id:   string | null
  moments: {
    title:    string
    profiles: { full_name: string | null; avatar_url: string | null } | null
  } | null
}

interface Props {
  userId:      string
  onBack:      () => void
  onOpenChat:  (chatId: string, name: string) => void
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const initials = (name ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  if (url) {
    return <img src={url} alt={name ?? ''} className="w-10 h-10 rounded-full object-cover shrink-0"
      style={{ border: '2px solid white', boxShadow: '0 1px 4px rgba(15,23,42,0.10)' }} />
  }
  return (
    <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold select-none"
      style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1D4ED8',
               border: '2px solid white', boxShadow: '0 1px 4px rgba(15,23,42,0.10)' }}>
      {initials}
    </div>
  )
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-2" style={{ color: '#94A3B8' }}>
      {children}
    </p>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationsPage({ userId, onBack, onOpenChat }: Props) {
  const [incoming,   setIncoming] = useState<IncomingRequest[]>([])
  const [approved,   setApproved] = useState<ApprovedAlert[]>([])
  const [loading,    setLoading]  = useState(true)
  const [acting,     setActing]   = useState<string | null>(null)
  const [chatting,   setChatting]  = useState<string | null>(null)
  const [actionErr,  setActionErr] = useState<string | null>(null)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)

    // ── 1. Incoming: pending requests on MY moments ──────────────────────────
    const { data: myMoments } = await supabase
      .from('moments')
      .select('id')
      .eq('creator_id', userId)

    const momentIds = (myMoments ?? []).map((m: { id: string }) => m.id)

    const [incomingRes, approvedRes] = await Promise.all([
      momentIds.length > 0
        ? supabase
            .from('moment_requests')
            .select('id, user_id, moment_id, moments!moment_id(title), profiles!user_id(full_name, avatar_url)')
            .in('moment_id', momentIds)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),

      // ── 2. Approved: MY requests that got accepted ─────────────────────────
      supabase
        .from('moment_requests')
        .select('id, moment_id, chat_id, moments!moment_id(title, profiles!creator_id(full_name, avatar_url))')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false }),
    ])

    setIncoming((incomingRes.data as unknown as IncomingRequest[]) ?? [])
    setApproved((approvedRes.data as unknown as ApprovedAlert[]) ?? [])
    setLoading(false)
  }

  async function handleApprove(req: IncomingRequest) {
    setActing(req.id)
    setActionErr(null)

    // Single atomic RPC — creates/reuses group chat + marks request accepted
    const { error } = await supabase.rpc('approve_moment_request', {
      request_id: req.id,
    })

    if (error) {
      setActionErr(`Could not approve: ${error.message}`)
      setActing(null)
      return
    }

    // Remove the card immediately; the requester's "Approvals" section will
    // appear on their next visit (or a page reload).
    setIncoming(prev => prev.filter(r => r.id !== req.id))
    setActing(null)
  }

  async function handleDecline(req: IncomingRequest) {
    setActing(req.id)
    setActionErr(null)

    const { error } = await supabase.rpc('decline_moment_request', {
      request_id: req.id,
    })

    if (error) {
      setActionErr(`Could not decline: ${error.message}`)
      setActing(null)
      return
    }

    setIncoming(prev => prev.filter(r => r.id !== req.id))
    setActing(null)
  }

  async function handleChat(req: IncomingRequest) {
    setChatting(req.id)
    setActionErr(null)

    const { data: chatId, error } = await supabase.rpc('find_or_create_dm', {
      other_user_id: req.user_id,
    })

    setChatting(null)

    if (error || !chatId) {
      setActionErr('Could not open chat. Try again.')
      return
    }

    onOpenChat(chatId as string, req.profiles?.full_name ?? 'Traveller')
  }

  const isEmpty = !loading && incoming.length === 0 && approved.length === 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-10" style={{ background: '#F8FAFC' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3"
        style={{ background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(12px)' }}>

        <div className="flex items-start justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
            Alerts
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

        <h1 className="text-[26px] font-bold leading-tight"
          style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          Notifications 🔔
        </h1>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-10">

        {/* Skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="user-card p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-9 bg-slate-200 rounded-xl" />
                  <div className="flex-1 h-9 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="user-card p-10 text-center mt-4">
            <div className="text-4xl mb-4">🔕</div>
            <h2 className="text-base font-bold mb-1" style={{ color: '#0F172A' }}>All caught up</h2>
            <p className="text-sm" style={{ color: '#64748B' }}>
              You'll see join requests and approvals here.
            </p>
          </div>
        )}

        {/* Action error banner */}
        {actionErr && (
          <div className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between gap-3"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-xs" style={{ color: '#DC2626' }}>{actionErr}</p>
            <button type="button" onClick={() => setActionErr(null)}
              className="shrink-0 text-xs font-semibold focus:outline-none"
              style={{ color: '#DC2626' }}>✕</button>
          </div>
        )}

        {/* ── Incoming requests ─────────────────────────────────────────────── */}
        {!loading && incoming.length > 0 && (
          <div className="mb-6">
            <SectionLabel>Join Requests</SectionLabel>
            <div className="flex flex-col gap-3">
              {incoming.map(req => {
                const name = req.profiles?.full_name ?? 'A traveller'
                const title = req.moments?.title ?? 'your moment'
                return (
                  <div key={req.id} className="user-card p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar url={req.profiles?.avatar_url ?? null} name={req.profiles?.full_name ?? null} />
                      <p className="text-sm leading-snug flex-1" style={{ color: '#0F172A' }}>
                        <span className="font-semibold">{name}</span>
                        {' '}wants to join your adventure:{' '}
                        <span className="font-semibold" style={{ color: '#1D4ED8' }}>{title}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        disabled={acting === req.id || chatting === req.id}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none"
                        style={{ background: '#1D4ED8', color: 'white', opacity: (acting === req.id || chatting === req.id) ? 0.6 : 1 }}
                      >
                        {acting === req.id ? '…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChat(req)}
                        disabled={acting === req.id || chatting === req.id}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none"
                        style={{
                          background: 'transparent',
                          color: '#1D4ED8',
                          border: '1.5px solid #1D4ED8',
                          opacity: (acting === req.id || chatting === req.id) ? 0.6 : 1,
                        }}
                      >
                        {chatting === req.id ? '…' : 'Chat'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(req)}
                        disabled={acting === req.id || chatting === req.id}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none"
                        style={{ background: '#F1F5F9', color: '#64748B', opacity: (acting === req.id || chatting === req.id) ? 0.6 : 1 }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Approved alerts ────────────────────────────────────────────────── */}
        {!loading && approved.length > 0 && (
          <div>
            <SectionLabel>Approvals</SectionLabel>
            <div className="flex flex-col gap-3">
              {approved.map(alert => {
                const creatorName = alert.moments?.profiles?.full_name ?? 'The organiser'
                const title       = alert.moments?.title ?? 'a moment'
                return (
                  <div key={alert.id} className="user-card p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar
                        url={alert.moments?.profiles?.avatar_url ?? null}
                        name={alert.moments?.profiles?.full_name ?? null}
                      />
                      <div className="flex-1">
                        {/* Green check badge */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1.5"
                          style={{ background: 'rgba(34,197,94,0.10)', color: '#16A34A' }}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Approved
                        </span>
                        <p className="text-sm leading-snug" style={{ color: '#0F172A' }}>
                          <span className="font-semibold">Great news!</span>{' '}
                          <span className="font-semibold">{creatorName}</span>{' '}
                          approved your request for{' '}
                          <span className="font-semibold" style={{ color: '#1D4ED8' }}>{title}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (alert.chat_id) {
                          onOpenChat(alert.chat_id, creatorName)
                        }
                      }}
                      disabled={!alert.chat_id}
                      className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none"
                      style={{
                        background: alert.chat_id ? 'rgba(29,78,216,0.08)' : '#F1F5F9',
                        color:      alert.chat_id ? '#1D4ED8' : '#94A3B8',
                        cursor:     alert.chat_id ? 'pointer' : 'default',
                      }}
                    >
                      {alert.chat_id ? 'Open Chat →' : 'Chat not yet available'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
