-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add total_spots to moments + clean, non-recursive RLS for chat
--
-- Context
-- -------
-- All tables (moments, moment_requests, chats, chat_participants, messages)
-- already exist from earlier migrations. This migration:
--
--   1. Adds moments.total_spots (integer, default 4).
--   2. Introduces check_if_participant(u_id, c_id) — an explicit-parameter,
--      SECURITY DEFINER helper that avoids the infinite-recursion trap that
--      occurs when RLS policies call auth.uid() through self-referencing
--      table scans.
--   3. Replaces ALL existing SELECT / INSERT policies on chats, chat_participants,
--      and messages with clean versions that use the new helper.
--   4. Leaves profiles, moments, moment_requests RLS untouched (already fixed
--      in migrations 000001–000004).
-- ─────────────────────────────────────────────────────────────────────────────


-- ══════════════════════════════════════════════════════════════════════════════
-- 1. moments.total_spots
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.moments
  add column if not exists total_spots integer not null default 4
    check (total_spots > 0);

-- Confirm creator_id FK exists (safe no-op if already present)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
    where tc.table_name = 'moments'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'creator_id'
  ) then
    alter table public.moments
      add constraint moments_creator_id_fkey
      foreign key (creator_id) references public.profiles (id) on delete cascade;
  end if;
end;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Non-recursive participant check
--    Takes explicit (u_id, c_id) params — no implicit auth.uid() call inside
--    a policy subquery — so Postgres cannot recurse back into the same policy.
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.check_if_participant(u_id uuid, c_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from   public.chat_participants
    where  chat_id = c_id
      and  user_id = u_id
  );
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. chat_participants — replace all SELECT policies
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop every previous variant (names have changed across migrations)
drop policy if exists "Participants can see who is in their chats"  on public.chat_participants;
drop policy if exists "Users can see their own participant rows"     on public.chat_participants;
drop policy if exists "Users can see their own chat membership"     on public.chat_participants;

-- Simple, non-recursive: own rows only
create policy "Users can see their own chat membership"
  on public.chat_participants for select
  using (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. chats — replace SELECT policy
-- ══════════════════════════════════════════════════════════════════════════════

drop policy if exists "Chat participants can view their chats" on public.chats;

create policy "Chat participants can view their chats"
  on public.chats for select
  using (public.check_if_participant(auth.uid(), id));


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. messages — replace SELECT and INSERT policies
-- ══════════════════════════════════════════════════════════════════════════════

drop policy if exists "Chat participants can read messages"           on public.messages;
drop policy if exists "Participants can send messages as themselves"  on public.messages;

create policy "Chat participants can read messages"
  on public.messages for select
  using (public.check_if_participant(auth.uid(), chat_id));

create policy "Participants can send messages as themselves"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.check_if_participant(auth.uid(), chat_id)
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. moment_requests — ensure table and policies exist
--    (created in 000002; this block is a safe no-op if already present)
-- ══════════════════════════════════════════════════════════════════════════════

-- Table guard
create table if not exists public.moment_requests (
  id         uuid        primary key default gen_random_uuid(),
  moment_id  uuid        not null references public.moments  (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  status     text        not null default 'pending'
             check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (moment_id, user_id)
);

alter table public.moment_requests enable row level security;

-- Drop and recreate to ensure correct definitions
drop policy if exists "Users can insert their own requests"         on public.moment_requests;
drop policy if exists "Users can view requests for their moments"   on public.moment_requests;
drop policy if exists "Moment creators can update request status"   on public.moment_requests;
drop policy if exists "Users can view their own requests"           on public.moment_requests;

-- Requesters can submit
create policy "Users can insert their own requests"
  on public.moment_requests for insert
  with check (auth.uid() = user_id);

-- Requester sees their own; creator sees requests on their moments
create policy "Users can view relevant requests"
  on public.moment_requests for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.creator_id = auth.uid()
    )
  );

-- Only the moment creator can approve / decline
create policy "Moment creators can update request status"
  on public.moment_requests for update
  using (
    exists (
      select 1 from public.moments m
      where m.id = moment_id
        and m.creator_id = auth.uid()
    )
  );
