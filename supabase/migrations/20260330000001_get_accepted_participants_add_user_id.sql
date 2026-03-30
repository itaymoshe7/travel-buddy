-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add user_id to get_accepted_participants return type
--
-- The MomentDetail view needs user_id so clicking a participant can navigate
-- to their public profile.  Adding user_id to the return table is safe and
-- backwards-compatible — callers that only read moment_id/full_name/avatar_url
-- are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_accepted_participants(moment_ids uuid[])
returns table(moment_id uuid, user_id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select mr.moment_id,
         mr.user_id,
         p.full_name,
         p.avatar_url
    from public.moment_requests mr
    join public.profiles p on p.id = mr.user_id
   where mr.moment_id = any(moment_ids)
     and mr.status = 'accepted'
   order by mr.created_at;
$$;
