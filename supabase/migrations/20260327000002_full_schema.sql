-- ─────────────────────────────────────────────────────────────────────────────
-- TravelBuddy: full schema — moments, chats, messages, RLS
-- Depends on: 20260327000001_create_profiles.sql
--
-- Layout: ALL CREATE TABLE / ALTER TABLE / triggers first,
--         ALL CREATE POLICY afterwards — avoids forward-reference errors.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- PASS 1 — DDL: tables, column renames, triggers, helper function
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profiles: rename legacy columns ───────────────────────────────────────
alter table public.profiles rename column profile_picture_url to avatar_url;
alter table public.profiles rename column travel_style         to travel_vibe;

-- ── moments ───────────────────────────────────────────────────────────────
create table if not exists public.moments (
  id            uuid        primary key default gen_random_uuid(),
  creator_id    uuid        not null references public.profiles (id) on delete cascade,
  title         text        not null,
  destination   text        not null,
  start_date    date,
  end_date      date,
  activity_type text        not null
                check (activity_type in ('landing', 'stay', 'trip', 'nightlife')),
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.moments enable row level security;

create trigger moments_updated_at
  before update on public.moments
  for each row execute function public.handle_updated_at();

-- ── moment_requests ───────────────────────────────────────────────────────
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

-- ── chats ─────────────────────────────────────────────────────────────────
create table if not exists public.chats (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.chats enable row level security;

-- ── chat_participants ─────────────────────────────────────────────────────
-- Must exist BEFORE any policy on `chats` references it.
create table if not exists public.chat_participants (
  chat_id   uuid        not null references public.chats    (id) on delete cascade,
  user_id   uuid        not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

alter table public.chat_participants enable row level security;

-- ── messages ──────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id         uuid        primary key default gen_random_uuid(),
  chat_id    uuid        not null references public.chats    (id) on delete cascade,
  sender_id  uuid        not null references public.profiles (id) on delete cascade,
  content    text        not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- ── helper: is the current user a participant in a given chat? ────────────
-- Defined here (after chat_participants exists) and reused by message policies.
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

-- ── indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_profiles_region        on public.profiles         (travel_region);
create index if not exists idx_moments_creator        on public.moments          (creator_id);
create index if not exists idx_moments_destination    on public.moments          (destination);
create index if not exists idx_moment_requests_user   on public.moment_requests  (user_id);
create index if not exists idx_moment_requests_moment on public.moment_requests  (moment_id);
create index if not exists idx_chat_participants_user on public.chat_participants (user_id);
create index if not exists idx_messages_chat          on public.messages         (chat_id, created_at);


-- ═══════════════════════════════════════════════════════════════════════════
-- PASS 2 — RLS policies (all tables exist by this point)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profiles ──────────────────────────────────────────────────────────────
-- Widen the SELECT policy so same-region users can discover each other.
drop policy if exists "Users can view their own profile" on public.profiles;

create policy "Profiles readable by owner or same-region users"
  on public.profiles for select
  using (
    auth.uid() = id
    or travel_region = (
      select travel_region from public.profiles where id = auth.uid()
    )
  );

-- Insert / Update stay as-is from migration 001; no changes needed.

-- ── moments ───────────────────────────────────────────────────────────────
create policy "Moments readable by owner or same-region users"
  on public.moments for select
  using (
    auth.uid() = creator_id
    or exists (
      select 1
      from   public.profiles viewer
      join   public.profiles creator on creator.id = moments.creator_id
      where  viewer.id           = auth.uid()
      and    viewer.travel_region = creator.travel_region
    )
  );

create policy "Users can create their own moments"
  on public.moments for insert
  with check (auth.uid() = creator_id);

create policy "Creators can update their moments"
  on public.moments for update
  using (auth.uid() = creator_id);

create policy "Creators can delete their moments"
  on public.moments for delete
  using (auth.uid() = creator_id);

-- ── moment_requests ───────────────────────────────────────────────────────
create policy "Moment request visibility"
  on public.moment_requests for select
  using (
    auth.uid() = user_id
    or auth.uid() = (
      select creator_id from public.moments where id = moment_id
    )
  );

create policy "Users can send moment requests"
  on public.moment_requests for insert
  with check (auth.uid() = user_id);

create policy "Moment owners can update request status"
  on public.moment_requests for update
  using (
    auth.uid() = (
      select creator_id from public.moments where id = moment_id
    )
  );

create policy "Requesters can withdraw pending requests"
  on public.moment_requests for delete
  using (
    auth.uid() = user_id
    and status = 'pending'
  );

-- ── chats ─────────────────────────────────────────────────────────────────
-- chat_participants now exists, so this forward reference is safe.
create policy "Chat participants can view their chats"
  on public.chats for select
  using (
    exists (
      select 1 from public.chat_participants
      where  chat_id = chats.id
      and    user_id = auth.uid()
    )
  );

create policy "Authenticated users can create chats"
  on public.chats for insert
  with check (auth.uid() is not null);

-- ── chat_participants ─────────────────────────────────────────────────────
create policy "Participants can see who is in their chats"
  on public.chat_participants for select
  using (
    exists (
      select 1 from public.chat_participants self
      where  self.chat_id = chat_participants.chat_id
      and    self.user_id = auth.uid()
    )
  );

create policy "Users can join or be added to chats"
  on public.chat_participants for insert
  with check (auth.uid() is not null);

create policy "Users can leave their own chats"
  on public.chat_participants for delete
  using (auth.uid() = user_id);

-- ── messages ──────────────────────────────────────────────────────────────
create policy "Chat participants can read messages"
  on public.messages for select
  using (public.is_chat_participant(chat_id));

create policy "Participants can send messages as themselves"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_chat_participant(chat_id)
  );

create policy "Senders can edit their own messages"
  on public.messages for update
  using (auth.uid() = sender_id);

create policy "Senders can delete their own messages"
  on public.messages for delete
  using (auth.uid() = sender_id);
