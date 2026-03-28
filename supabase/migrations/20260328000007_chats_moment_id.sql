-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add moment_id to chats (group-chat model)
--
-- Each Moment now has at most one shared group chat.  When a creator approves
-- a join request the app checks whether a chat already exists for that moment;
-- if so it adds the new traveller to the existing chat instead of creating a
-- second one.  Storing moment_id on the chat row makes this lookup possible
-- without needing a full table scan through moment_requests.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.chats
  add column if not exists moment_id uuid
    references public.moments (id) on delete cascade;

-- One chat per moment (null = DM / legacy chats are unaffected)
create unique index if not exists chats_moment_id_unique
  on public.chats (moment_id)
  where moment_id is not null;
