-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: infinite recursion on chat_participants / chats / messages SELECT policies
--
-- Root cause
-- ----------
-- Any policy that queries chat_participants to decide whether a user can see
-- a chats or messages row will re-enter the chat_participants RLS check,
-- which in turn may re-enter itself — classic recursive policy loop.
--
-- Fix
-- ---
-- 1. chat_participants SELECT: simple non-recursive rule — own rows only.
-- 2. chats SELECT: plain EXISTS sub-select on chat_participants with a literal
--    auth.uid() comparison. Because chat_participants' own policy is now
--    non-recursive, this sub-select never loops.
-- 3. messages SELECT / INSERT: same pattern — EXISTS on chat_participants.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Drop all existing SELECT (and INSERT) policies being replaced ──────────

drop policy if exists "Participants can see who is in their chats"   on public.chat_participants;
drop policy if exists "Users can see their own participant rows"      on public.chat_participants;
drop policy if exists "Users can see their own chat membership"       on public.chat_participants;

drop policy if exists "Chat participants can view their chats"        on public.chats;

drop policy if exists "Chat participants can read messages"           on public.messages;
drop policy if exists "Participants can send messages as themselves"  on public.messages;


-- ── 2. chat_participants SELECT ───────────────────────────────────────────────
-- Non-recursive: a user may only see rows where they are the participant.

create policy "Users can see their own chat membership"
  on public.chat_participants for select
  using (auth.uid() = user_id);


-- ── 3. chats SELECT ───────────────────────────────────────────────────────────
-- EXISTS on chat_participants is safe because that table's own policy is now
-- a trivial column comparison — no further recursion possible.

create policy "Chat participants can view their chats"
  on public.chats for select
  using (
    exists (
      select 1
      from   public.chat_participants cp
      where  cp.chat_id = id
        and  cp.user_id = auth.uid()
    )
  );


-- ── 4. messages SELECT ────────────────────────────────────────────────────────

create policy "Chat participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1
      from   public.chat_participants cp
      where  cp.chat_id = messages.chat_id
        and  cp.user_id = auth.uid()
    )
  );


-- ── 5. messages INSERT ────────────────────────────────────────────────────────

create policy "Participants can send messages as themselves"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from   public.chat_participants cp
      where  cp.chat_id = messages.chat_id
        and  cp.user_id = auth.uid()
    )
  );
