import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface RequestRow {
  id: string
  status: string
  user_id: string
  moment_id: string
  moments: { title: string } | null
  profiles: { full_name: string | null; avatar_url: string | null; bio: string | null } | null
}

interface Props {
  userId: string
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return <img src={url} alt={name ?? ''} className="w-10 h-10 rounded-full object-cover shrink-0 bg-slate-100" />
  }
  const initials = (name ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0 select-none">
      {initials}
    </div>
  )
}

export default function MyRequests({ userId }: Props) {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [acting,   setActing]   = useState<string | null>(null) // requestId being acted on

  useEffect(() => {
    load()
  }, [userId])

  async function load() {
    setLoading(true)
    setError(null)

    // 1. Get IDs of moments I created
    const { data: myMoments, error: mErr } = await supabase
      .from('moments')
      .select('id')
      .eq('creator_id', userId)

    if (mErr) { setError(mErr.message); setLoading(false); return }

    const momentIds = (myMoments ?? []).map(m => m.id)

    if (momentIds.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    // 2. Fetch pending requests for those moments with requester profile
    const { data, error: rErr } = await supabase
      .from('moment_requests')
      .select(`
        id, status, user_id, moment_id,
        moments!moment_id(title),
        profiles!user_id(full_name, avatar_url, bio)
      `)
      .in('moment_id', momentIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (rErr) setError(rErr.message)
    else      setRequests((data as unknown as RequestRow[]) ?? [])

    setLoading(false)
  }

  async function handleApprove(req: RequestRow) {
    setActing(req.id)

    // 1. Accept the request
    const { error: e1 } = await supabase
      .from('moment_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id)

    if (e1) { setActing(null); return }

    // 2. Create a new chat
    const { data: chat, error: e2 } = await supabase
      .from('chats')
      .insert({})
      .select('id')
      .single()

    if (e2 || !chat) { setActing(null); return }

    // 3. Add both users as participants
    await supabase.from('chat_participants').insert([
      { chat_id: chat.id, user_id: userId },
      { chat_id: chat.id, user_id: req.user_id },
    ])

    // Remove from local list
    setRequests(prev => prev.filter(r => r.id !== req.id))
    setActing(null)
  }

  async function handleDecline(req: RequestRow) {
    setActing(req.id)
    await supabase
      .from('moment_requests')
      .update({ status: 'declined' })
      .eq('id', req.id)
    setRequests(prev => prev.filter(r => r.id !== req.id))
    setActing(null)
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur-sm border-b border-slate-100 px-4 py-4">
        <h1 className="text-xl font-bold text-text-main">Join Requests</h1>
        <p className="text-xs text-slate-400 mt-0.5">People who want to join your moments</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {loading && (
          <div className="flex flex-col gap-4">
            {[1, 2].map(i => (
              <div key={i} className="user-card p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
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

        {!loading && error && (
          <div className="user-card p-6 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button type="button" onClick={load} className="text-xs text-primary font-semibold hover:underline">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="user-card p-10 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-base font-bold text-text-main mb-1">No pending requests</h2>
            <p className="text-sm text-slate-500">When someone wants to join your moment, it'll appear here.</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="flex flex-col gap-4">
            {requests.map(req => (
              <div key={req.id} className="user-card p-5">
                {/* Moment label */}
                <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-3">
                  Wants to join: {req.moments?.title ?? '—'}
                </p>

                {/* Requester info */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar url={req.profiles?.avatar_url ?? null} name={req.profiles?.full_name ?? null} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-main truncate">
                      {req.profiles?.full_name ?? 'Unknown traveller'}
                    </p>
                    {req.profiles?.bio && (
                      <p className="text-xs text-slate-400 truncate">{req.profiles.bio}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(req)}
                    disabled={acting === req.id}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  >
                    {acting === req.id ? '…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(req)}
                    disabled={acting === req.id}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider hover:bg-slate-200 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
