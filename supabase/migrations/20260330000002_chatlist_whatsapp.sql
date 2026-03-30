-- ─────────────────────────────────────────────────────────────────────────────
-- ChatList WhatsApp-style upgrade
-- • Add last_read_at to chat_participants (tracks when each user last read a chat)
-- • Allow users to update their own participant row (to mark chats as read)
-- • Replace get_my_chats() with a richer version:
--     - last message preview + timestamp
--     - unread count (messages after last_read_at, excluding own)
--     - moment title for group chats
--     - sorted by last_message_at DESC NULLS LAST
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Add last_read_at column ────────────────────────────────────────────────
-- Default now() so existing rows don't immediately flood with "unread" counts.

alter table public.chat_participants
  add column if not exists last_read_at timestamptz not null default now();


-- ── 2. Allow users to update their own participant row ────────────────────────
-- Needed so the frontend can call .update({ last_read_at }) on mount in ChatRoom.

drop policy if exists "Users can update their own participant row" on public.chat_participants;

create policy "Users can update their own participant row"
  on public.chat_participants for update
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ── 3. Replace get_my_chats() ─────────────────────────────────────────────────

create or replace function public.get_my_chats()
returns table (
  chat_id         uuid,
  other_id        uuid,        -- null-able: the other participant (DM only)
  full_name       text,        -- other participant name (DM) or null (group)
  avatar_url      text,        -- other participant avatar (DM) or null (group)
  moment_id       uuid,        -- set for group chats
  moment_title    text,        -- set for group chats
  last_message    text,
  last_message_at timestamptz,
  unread_count    bigint
)
language sql
stable
security definer
set search_path = public
as $$
  -- chats the calling user is in, with their personal last_read_at
  with my_chats as (
    select cp.chat_id, cp.last_read_at
    from   public.chat_participants cp
    where  cp.user_id = auth.uid()
  ),

  -- most recent message per chat
  last_msgs as (
    select distinct on (m.chat_id)
           m.chat_id,
           m.content    as last_message,
           m.created_at as last_message_at
    from   public.messages m
    where  m.chat_id in (select chat_id from my_chats)
    order  by m.chat_id, m.created_at desc
  ),

  -- unread messages: after last_read_at, not sent by the caller
  unread as (
    select m.chat_id, count(*) as unread_count
    from   public.messages  m
    join   my_chats mc on mc.chat_id = m.chat_id
    where  m.created_at > mc.last_read_at
      and  m.sender_id != auth.uid()
    group  by m.chat_id
  ),

  -- one "other" participant per chat (DMs have exactly one; for groups we pick
  -- the earliest-joined other user — the UI uses moment_title instead anyway)
  other_users as (
    select distinct on (cp.chat_id)
           cp.chat_id,
           cp.user_id  as other_id,
           p.full_name,
           p.avatar_url
    from   public.chat_participants cp
    join   public.profiles p on p.id = cp.user_id
    where  cp.chat_id in (select chat_id from my_chats)
      and  cp.user_id != auth.uid()
    order  by cp.chat_id, cp.joined_at
  ),

  -- chat metadata: moment linkage for group chats
  chat_meta as (
    select c.id         as chat_id,
           c.moment_id,
           mo.title     as moment_title
    from   public.chats c
    left join public.moments mo on mo.id = c.moment_id
    where  c.id in (select chat_id from my_chats)
  )

  select
    mc.chat_id,
    ou.other_id,
    ou.full_name,
    ou.avatar_url,
    cm.moment_id,
    cm.moment_title,
    lm.last_message,
    lm.last_message_at,
    coalesce(u.unread_count, 0) as unread_count
  from       my_chats mc
  left join  last_msgs   lm on lm.chat_id = mc.chat_id
  left join  unread      u  on u.chat_id  = mc.chat_id
  left join  other_users ou on ou.chat_id = mc.chat_id
  left join  chat_meta   cm on cm.chat_id = mc.chat_id
  order by   lm.last_message_at desc nulls last;
$$;
