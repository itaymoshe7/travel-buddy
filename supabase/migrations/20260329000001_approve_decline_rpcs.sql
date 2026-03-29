-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: approve_moment_request / decline_moment_request RPCs
--
-- Moves the multi-step approve/decline logic server-side so it runs as a
-- single atomic transaction with SECURITY DEFINER privileges.  This avoids:
--   • RLS issues when inserting chats/participants from the client
--   • Silent partial failures (chat created but request not updated, etc.)
--   • Race conditions when two creators approve simultaneously
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. approve_moment_request ──────────────────────────────────────────────

create or replace function public.approve_moment_request(request_id uuid)
returns uuid   -- the group chat id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req     public.moment_requests%rowtype;
  v_me      uuid := auth.uid();
  v_chat_id uuid;
begin
  -- Load the request
  select * into v_req
    from public.moment_requests
   where id = request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  -- Caller must be the moment creator
  if not exists (
    select 1 from public.moments
     where id = v_req.moment_id
       and creator_id = v_me
  ) then
    raise exception 'Not authorised';
  end if;

  -- Find or create the group chat for this moment
  select id into v_chat_id
    from public.chats
   where moment_id = v_req.moment_id
   limit 1;

  if v_chat_id is null then
    insert into public.chats (moment_id)
      values (v_req.moment_id)
      returning id into v_chat_id;

    -- Add the creator as the first participant
    insert into public.chat_participants (chat_id, user_id)
      values (v_chat_id, v_me)
      on conflict do nothing;
  end if;

  -- Add the approved traveller (idempotent)
  insert into public.chat_participants (chat_id, user_id)
    values (v_chat_id, v_req.user_id)
    on conflict do nothing;

  -- Accept the request and record the chat id so the requester can navigate to it
  update public.moment_requests
     set status  = 'accepted',
         chat_id = v_chat_id
   where id = request_id;

  return v_chat_id;
end;
$$;


-- ── 2. decline_moment_request ──────────────────────────────────────────────

create or replace function public.decline_moment_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.moment_requests%rowtype;
  v_me  uuid := auth.uid();
begin
  select * into v_req
    from public.moment_requests
   where id = request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  if not exists (
    select 1 from public.moments
     where id = v_req.moment_id
       and creator_id = v_me
  ) then
    raise exception 'Not authorised';
  end if;

  update public.moment_requests
     set status = 'declined'
   where id = request_id;
end;
$$;
