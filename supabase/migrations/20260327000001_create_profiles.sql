-- ─────────────────────────────────────────────────────────────────────────────
-- TravelBuddy: profiles table + auto-creation trigger
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Profiles table
--    `id` is a foreign key to auth.users so each profile is tied to an
--    authenticated user. Cascade delete keeps things clean if a user is removed.
create table if not exists public.profiles (
  id                   uuid        primary key references auth.users (id) on delete cascade,
  full_name            text,
  email                text        unique not null,
  instagram_handle     text,
  bio                  text,
  profile_picture_url  text,
  travel_region        text,
  travel_style         text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 2. Row-Level Security
--    Enable RLS so users can only read/write their own row.
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Auto-update `updated_at` on every row change
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 4. Auto-create a profile row when a new user signs up via Supabase Auth.
--    Fires on INSERT into auth.users (triggered by email/OAuth sign-up).
--    `new.raw_user_meta_data` carries any extra fields passed to signUp().
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- runs with the privileges of the function owner
set search_path = public  -- prevents search_path hijacking
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
