import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface ChatEntry {
  chatId:   string
  otherUserId:   string
  otherName:     string | null
  otherAvatar:   string | null
}

interface Props {
  userId:       string
  onOpenChat:   (chatId: string, otherName: string) => void
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return <img src={url} alt={name ?? ''} className="w-11 h-11 rounded-full object-cover shrink-0 bg-slate-100" />
  }
  const initials = (name ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0 select-none">
      {initials}
    </div>
  )
}

export default function ChatList({ userId, onOpenChat }: Props) {
  const [chats,   setChats]   = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Use the security-definer RPC to get the other participant per chat.
      // Direct query on chat_participants is now locked to own rows only (RLS fix),
      // so the RPC is the correct way to see who else is in each chat.
      const { data, error: err } = await supabase.rpc('get_my_chats')

      if (err) { setError(err.message); setLoading(false); return }

      const entries: ChatEntry[] = (data ?? []).map((row: any) => ({
        chatId:      row.chat_id,
        otherUserId: row.other_id,
        otherName:   row.full_name   ?? null,
        otherAvatar: row.avatar_url  ?? null,
      }))

      setChats(entries)
      setLoading(false)
    }
    load()
  }, [userId])

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur-sm border-b border-slate-100 px-4 py-4">
        <h1 className="text-xl font-bold text-text-main">Chats</h1>
        <p className="text-xs text-slate-400 mt-0.5">Your approved travel connections</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">

        {loading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="user-card p-4 flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="user-card p-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && chats.length === 0 && (
          <div className="user-card p-10 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h2 className="text-base font-bold text-text-main mb-1">No chats yet</h2>
            <p className="text-sm text-slate-500">Approve a join request to start a conversation.</p>
          </div>
        )}

        {!loading && !error && chats.length > 0 && (
          <div className="flex flex-col gap-2">
            {chats.map(chat => (
              <button
                key={chat.chatId}
                type="button"
                onClick={() => onOpenChat(chat.chatId, chat.otherName ?? 'Traveller')}
                className="user-card p-4 flex items-center gap-3 text-left hover:shadow-md active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full"
              >
                <Avatar url={chat.otherAvatar} name={chat.otherName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-main truncate">
                    {chat.otherName ?? 'Traveller'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Tap to open chat →</p>
                </div>
                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
