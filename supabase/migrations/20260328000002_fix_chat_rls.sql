-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: recursive RLS on chat_participants / chats / messages
--
-- Root cause
-- ----------
-- The chat_participants SELECT policy used an EXISTS subquery on the same
-- table it was protecting, causing Postgres to recurse endlessly.
--
-- The chats SELECT policy depended on chat_participants, which in turn
-- depended on itself — same indirect recursion.
--
-- Fix
-- ---
-- 1. Replace the chat_participants SELECT policy with a simple non-recursive
--    rule: "you can see your own participant rows".
--
-- 2. The chats / messages policies stay structurally the same, but now they
--    query chat_participants through a SECURITY DEFINER function that bypasses
--    RLS entirely — no chance of re-entering the same policy.
--
-- 3. Expose two SECURITY DEFINER helpers for the frontend:
--    • get_my_chats()                  → chat list with the other user's profile
--    • get_chat_participants(chat_id)  → both users' profiles for a chat room
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. chat_participants SELECT ───────────────────────────────────────────────
-- Old (recursive): checked whether user is in the same chat via a self-join.
-- New (simple):    a user can only see rows where they are the participant.
--                  This is all the RLS layer needs to enforce; the broader
--                  "see who else is in my chat" use-case is handled by the
--                  security-definer RPCs below.

drop policy if exists "Participants can see who is in their chats" on public.chat_participants;

create policy "Users can see their own participant rows"
  on public.chat_participants for select
  using (user_id = auth.uid());


-- ── 2. chats SELECT — rewrite to use a security-definer helper ────────────────
-- The old policy queried chat_participants inline; with the narrowed policy
-- above that still works (no recursion), but using a SECURITY DEFINER function
-- is safer and future-proof.

drop policy if exists "Chat participants can view their chats" on public.chats;

-- Helper: does the current user belong to this chat?
-- SECURITY DEFINER bypasses RLS so it never re-enters the chat_participants
-- or chats policies.
create or replace function public.is_chat_participant(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_participants
    where  chat_id = p_chat_id
    and    user_id = auth.uid()
  );
$$;

create policy "Chat participants can view their chats"
  on public.chats for select
  using (public.is_chat_participant(id));


-- ── 3. messages SELECT / INSERT — already use is_chat_participant ─────────────
-- No change needed; they already call the SECURITY DEFINER function above.
-- Recreate them explicitly so the function reference is fresh.

drop policy if exists "Chat participants can read messages"            on public.messages;
drop policy if exists "Participants can send messages as themselves"   on public.messages;

create policy "Chat participants can read messages"
  on public.messages for select
  using (public.is_chat_participant(chat_id));

create policy "Participants can send messages as themselves"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_chat_participant(chat_id)
  );


-- ── 4. RPC: get_my_chats() ────────────────────────────────────────────────────
-- Returns one row per chat the caller is in, with the OTHER participant's
-- profile attached. Used by ChatList.tsx.
-- SECURITY DEFINER reads chat_participants without going through RLS.

create or replace function public.get_my_chats()
returns table (
  chat_id      uuid,
  other_id     uuid,
  full_name    text,
  avatar_url   text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cp.chat_id,
    cp.user_id          as other_id,
    p.full_name,
    p.avatar_url
  from   public.chat_participants cp
  join   public.profiles          p  on p.id = cp.user_id
  where  cp.chat_id in (
           select chat_id
           from   public.chat_participants
           where  user_id = auth.uid()
         )
  and    cp.user_id != auth.uid();
$$;


-- ── 5. RPC: get_chat_participants(chat_id) ────────────────────────────────────
-- Returns all participant profiles for a given chat.
-- Called by ChatRoom.tsx to seed the local profile cache.
-- Only returns results if the caller is actually a participant.

create or replace function public.get_chat_participants(p_chat_id uuid)
returns table (
  user_id    uuid,
  full_name  text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select cp.user_id, p.full_name, p.avatar_url
  from   public.chat_participants cp
  join   public.profiles          p on p.id = cp.user_id
  where  cp.chat_id = p_chat_id
    and  public.is_chat_participant(p_chat_id);   -- gate: caller must be in this chat
$$;
