import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

interface MessageRow {
  id:         string
  chat_id:    string
  sender_id:  string
  content:    string
  created_at: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

type ProfileCache = Map<string, { full_name: string | null; avatar_url: string | null }>

interface Props {
  chatId:        string
  userId:        string
  otherUserName: string  // used as loading placeholder only — ChatRoom self-derives the real title
  onBack:        () => void
}

function formatTime(ts: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(ts))
}

export default function ChatRoom({ chatId, userId, otherUserName, onBack }: Props) {
  const [messages,   setMessages]  = useState<MessageRow[]>([])
  const [input,      setInput]     = useState('')
  const [loading,    setLoading]   = useState(true)
  const [sending,    setSending]   = useState(false)
  // Room identity — derived from DB, starts with the passed-in fallback
  const [roomTitle,    setRoomTitle]    = useState(otherUserName)
  const [roomSubtitle, setRoomSubtitle] = useState('Mate Chat')
  const profilesRef = useRef<ProfileCache>(new Map())
  const bottomRef   = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let mounted = true

    async function init() {
      // 1. Load participants + chat metadata in parallel
      const [partsRes, chatRes] = await Promise.all([
        // Security-definer RPC needed: direct chat_participants query only returns own row
        supabase.rpc('get_chat_participants', { p_chat_id: chatId }),
        // Fetch whether this is a group chat (has moment_id) or a DM
        supabase
          .from('chats')
          .select('moment_id, moments(title)')
          .eq('id', chatId)
          .single(),
      ])

      const parts = (partsRes.data ?? []) as any[]
      for (const p of parts) {
        profilesRef.current.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url })
      }

      // Derive the room title from what we just fetched
      if (mounted) {
        const chatMeta = chatRes.data as { moment_id: string | null; moments: { title: string } | null } | null
        if (chatMeta?.moment_id && chatMeta.moments?.title) {
          // Group chat — show the moment name
          setRoomTitle(chatMeta.moments.title)
          setRoomSubtitle('Group Chat')
        } else {
          // DM — show the other participant's name
          const other = parts.find((p: any) => p.user_id !== userId)
          if (other?.full_name) {
            setRoomTitle(other.full_name)
            setRoomSubtitle('Direct Message')
          }
        }
      }

      // 2. Load message history
      const { data } = await supabase
        .from('messages')
        .select('id, chat_id, sender_id, content, created_at, profiles!sender_id(full_name, avatar_url)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (mounted) {
        setMessages((data as unknown as MessageRow[]) ?? [])
        setLoading(false)
        // Mark chat as read so unread count resets in ChatList
        supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('chat_id', chatId)
          .eq('user_id', userId)
          .then(() => {})
      }

      // 3. Subscribe to new messages via Supabase Realtime
      //    Requires "Replication" enabled for the `messages` table in
      //    Supabase Dashboard → Database → Replication → messages ✓
      const channel = supabase
        .channel(`room:${chatId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
          (payload) => {
            if (!mounted) return
            const raw = payload.new as Omit<MessageRow, 'profiles'>
            const profile = profilesRef.current.get(raw.sender_id) ?? null
            const incoming: MessageRow = { ...raw, profiles: profile }
            setMessages(prev =>
              prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming],
            )
          },
        )
        .subscribe()

      return () => {
        mounted = false
        supabase.removeChannel(channel)
      }
    }

    const cleanup = init()
    return () => { mounted = false; cleanup.then(fn => fn?.()) }
  }, [chatId])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const { data: sent, error } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, sender_id: userId, content: text })
      .select('id, chat_id, sender_id, content, created_at')
      .single()

    setSending(false)
    if (error || !sent) return

    // Optimistically add; real-time will arrive but dedup check will ignore it
    const profile = profilesRef.current.get(userId) ?? null
    setMessages(prev =>
      prev.some(m => m.id === sent.id)
        ? prev
        : [...prev, { ...(sent as Omit<MessageRow, 'profiles'>), profiles: profile }],
    )
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-base">

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400 focus:outline-none"
          aria-label="Back"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-main truncate">{roomTitle}</p>
          <p className="text-xs text-slate-400">{roomSubtitle}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center items-center h-full">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-3xl mb-3">👋</div>
            <p className="text-sm text-slate-500">Say hello to {roomTitle}!</p>
          </div>
        )}

        {messages.map(msg => {
          const isMine = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[72%] px-5 py-3 rounded-3xl text-sm leading-relaxed
                ${isMine
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-slate-100 text-text-main rounded-bl-md'}`}
              >
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1.5 ${isMine ? 'text-blue-200' : 'text-slate-400'} text-right`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white border-t border-slate-100 safe-area-pb">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shrink-0"
          aria-label="Send"
        >
          <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
