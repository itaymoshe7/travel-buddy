-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: find_or_create_dm(other_user_id)
--
-- Returns the UUID of a 1-to-1 (DM) chat between the calling user and
-- other_user_id.  If a DM already exists it is returned without creating a
-- duplicate; otherwise a new chat (moment_id IS NULL = DM) is created and
-- both users are added as participants.
--
-- SECURITY DEFINER lets the function bypass RLS so it can search
-- chat_participants for BOTH users — something the client cannot do because
-- each user can only see their own participant rows.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.find_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := auth.uid();
  v_chat_id uuid;
begin
  -- Look for an existing DM between the two users
  -- (a chat with no moment_id where both are participants)
  select cp1.chat_id
    into v_chat_id
    from chat_participants cp1
    join chat_participants cp2 on cp2.chat_id = cp1.chat_id
    join chats             c   on c.id        = cp1.chat_id
   where cp1.user_id  = v_me
     and cp2.user_id  = other_user_id
     and c.moment_id is null
   limit 1;

  if v_chat_id is not null then
    return v_chat_id;
  end if;

  -- No existing DM — create one
  insert into public.chats (moment_id)
    values (null)
    returning id into v_chat_id;

  insert into public.chat_participants (chat_id, user_id)
    values (v_chat_id, v_me),
           (v_chat_id, other_user_id);

  return v_chat_id;
end;
$$;
