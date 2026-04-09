import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatEntry {
  chatId:         string
  chatName:       string
  avatarUrl:      string | null  // moment image_url for groups, user avatar for DMs
  avatarName:     string | null
  lastMessage:    string | null
  lastMessageAt:  string | null
  unreadCount:    number
  isGroup:        boolean
}

interface Props {
  userId:     string
  onOpenChat: (chatId: string, otherName: string) => void
  onSearch:   () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatChatTime(ts: string | null): string {
  if (!ts) return ''
  const d    = new Date(ts)
  const now  = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d)
  if (days < 7)  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)
  return new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(d)
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const initials = (name ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  if (url) {
    return (
      <img src={url} alt={name ?? ''} className="w-12 h-12 rounded-full object-cover shrink-0"
        style={{ border: '2px solid white', boxShadow: '0 1px 4px rgba(15,23,42,0.10)' }} />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-sm font-bold select-none"
      style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1D4ED8',
               border: '2px solid white', boxShadow: '0 1px 4px rgba(15,23,42,0.10)' }}>
      {initials}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatList({ userId, onOpenChat, onSearch }: Props) {
  const [chats,   setChats]   = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const chatsRef = useRef<ChatEntry[]>([])

  // Keep ref in sync so the realtime handler always has the latest list
  useEffect(() => { chatsRef.current = chats }, [chats])

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase.rpc('get_my_chats')
      if (!mounted) return
      if (err) { setError(err.message); setLoading(false); return }

      const entries: ChatEntry[] = (data ?? []).map((row: any) => ({
        chatId:        row.chat_id,
        chatName:      row.moment_id ? (row.moment_title ?? 'Group Chat') : (row.full_name ?? 'Traveller'),
        avatarUrl:     row.moment_id ? (row.moment_image_url ?? null) : (row.avatar_url ?? null),
        avatarName:    row.moment_id ? (row.moment_title ?? 'G') : (row.full_name ?? null),
        lastMessage:   row.last_message  ?? null,
        lastMessageAt: row.last_message_at ?? null,
        unreadCount:   Number(row.unread_count ?? 0),
        isGroup:       !!row.moment_id,
      }))

      setChats(entries)
      setLoading(false)
    }

    load()

    // ── Realtime: listen for new messages in any of the user's chats ──────────
    // Supabase Realtime respects RLS, so only messages the user can SELECT are delivered.
    const channel = supabase
      .channel('chatlist-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (!mounted) return
          const msg = payload.new as {
            chat_id:    string
            content:    string
            created_at: string
            sender_id:  string
          }

          setChats(prev => {
            const idx = prev.findIndex(c => c.chatId === msg.chat_id)
            if (idx === -1) return prev           // not a chat we know about
            const updated  = [...prev]
            const entry    = { ...updated[idx] }
            entry.lastMessage   = msg.content
            entry.lastMessageAt = msg.created_at
            // Only count as unread if someone else sent it
            if (msg.sender_id !== userId) {
              entry.unreadCount = entry.unreadCount + 1
            }
            updated.splice(idx, 1)
            return [entry, ...updated]            // bubble to top
          })
        },
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'transparent' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3"
        style={{ background: 'rgba(240,253,252,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-start justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
            Messages
          </p>
          <button
            type="button"
            aria-label="Search"
            onClick={onSearch}
            className="w-8 h-8 rounded-full flex items-center justify-center -mt-0.5 transition-colors focus:outline-none"
            style={{ background: '#F1F5F9', color: '#64748B' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
            </svg>
          </button>
        </div>
        <h1 className="text-[26px] font-bold leading-tight"
          style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          Chats
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-3">

        {/* Skeleton */}
        {loading && (
          <div className="flex flex-col gap-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 px-3 py-3.5 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-2 bg-slate-100 rounded w-2/3" />
                </div>
                <div className="h-2 bg-slate-100 rounded w-10 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl p-6 text-center mt-4"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && chats.length === 0 && (
          <div className="rounded-2xl p-10 text-center mt-4"
            style={{ background: 'white', boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
                     border: '1px solid rgba(226,232,240,0.7)' }}>
            <div className="text-4xl mb-4">💬</div>
            <h2 className="text-base font-bold mb-1" style={{ color: '#0F172A' }}>No chats yet</h2>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Approve a join request to start a conversation.
            </p>
          </div>
        )}

        {/* Chat list */}
        {!loading && !error && chats.length > 0 && (
          <div className="flex flex-col">
            {chats.map((chat) => {
              const hasUnread = chat.unreadCount > 0
              return (
                <button
                  key={chat.chatId}
                  type="button"
                  onClick={() => onOpenChat(chat.chatId, chat.chatName)}
                  className="flex items-center gap-4 px-3 py-3.5 text-left transition-colors focus:outline-none active:bg-slate-50 hover:bg-slate-50 rounded-2xl"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar url={chat.avatarUrl} name={chat.avatarName} />
                    {/* Group badge */}
                    {chat.isGroup && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                        style={{ background: '#1D4ED8', color: 'white', fontSize: '9px' }}>
                        #
                      </span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm truncate"
                        style={{ color: '#0F172A', fontWeight: hasUnread ? 700 : 600 }}>
                        {chat.chatName}
                      </p>
                      {chat.lastMessageAt && (
                        <span className="text-[11px] shrink-0"
                          style={{ color: hasUnread ? '#1D4ED8' : '#94A3B8',
                                   fontWeight: hasUnread ? 600 : 400 }}>
                          {formatChatTime(chat.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs truncate"
                        style={{ color: hasUnread ? '#334155' : '#94A3B8',
                                 fontWeight: hasUnread ? 500 : 400 }}>
                        {chat.lastMessage ?? 'No messages yet'}
                      </p>
                      {hasUnread && (
                        <span className="shrink-0 min-w-[20px] h-5 rounded-full flex items-center justify-center text-[11px] font-bold px-1.5"
                          style={{ background: '#22C55E', color: 'white' }}>
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
