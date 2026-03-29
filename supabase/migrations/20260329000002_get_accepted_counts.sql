-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: get_accepted_counts(moment_ids uuid[])
--
-- Returns the number of accepted requests per moment.  SECURITY DEFINER is
-- required because the moment_requests RLS policy only lets a user see their
-- own rows or rows on moments they created — so regular users cannot count
-- other travellers' accepted requests without elevated privileges.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_accepted_counts(moment_ids uuid[])
returns table(moment_id uuid, accepted_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select moment_id, count(*) as accepted_count
    from public.moment_requests
   where moment_id = any(moment_ids)
     and status = 'accepted'
   group by moment_id;
$$;
