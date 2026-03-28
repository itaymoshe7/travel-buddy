-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add chat_id to moment_requests
--
-- When a creator approves a join request, the resulting chat room ID is stored
-- directly on the request row.  This allows the requester (and the creator) to
-- navigate straight to that chat from any surface (Explore card, My Moments,
-- Notifications) without an extra join query.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.moment_requests
  add column if not exists chat_id uuid
    references public.chats (id) on delete set null;
