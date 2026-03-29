-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: get_accepted_participants(moment_ids uuid[])
--
-- Returns the profile info of accepted travellers per moment so the Explore
-- feed can show overlapping participant avatars.  SECURITY DEFINER is required
-- because moment_requests RLS only allows a user to see their own rows or rows
-- on moments they created.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_accepted_participants(moment_ids uuid[])
returns table(moment_id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select mr.moment_id,
         p.full_name,
         p.avatar_url
    from public.moment_requests mr
    join public.profiles p on p.id = mr.user_id
   where mr.moment_id = any(moment_ids)
     and mr.status = 'accepted'
   order by mr.created_at;
$$;
