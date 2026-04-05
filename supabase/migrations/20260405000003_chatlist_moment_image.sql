-- ─────────────────────────────────────────────────────────────────────────────
-- Add moment_image_url to get_my_chats() so group chat avatars can show
-- the moment's cover photo instead of a letter fallback.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_my_chats()
returns table (
  chat_id          uuid,
  other_id         uuid,
  full_name        text,
  avatar_url       text,
  moment_id        uuid,
  moment_title     text,
  moment_image_url text,        -- ← NEW: cover image for group chat avatar
  last_message     text,
  last_message_at  timestamptz,
  unread_count     bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with my_chats as (
    select cp.chat_id, cp.last_read_at
    from   public.chat_participants cp
    where  cp.user_id = auth.uid()
  ),

  last_msgs as (
    select distinct on (m.chat_id)
           m.chat_id,
           m.content    as last_message,
           m.created_at as last_message_at
    from   public.messages m
    where  m.chat_id in (select chat_id from my_chats)
    order  by m.chat_id, m.created_at desc
  ),

  unread as (
    select m.chat_id, count(*) as unread_count
    from   public.messages  m
    join   my_chats mc on mc.chat_id = m.chat_id
    where  m.created_at > mc.last_read_at
      and  m.sender_id != auth.uid()
    group  by m.chat_id
  ),

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

  chat_meta as (
    select c.id          as chat_id,
           c.moment_id,
           mo.title      as moment_title,
           mo.image_url  as moment_image_url   -- ← NEW
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
    cm.moment_image_url,
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
