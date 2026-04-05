-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: delete_my_account
-- Lets an authenticated user permanently delete their own account.
-- Deleting from auth.users cascades to profiles (and any other FK-linked tables).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Hard-delete the calling user's auth record.
  -- Assumes profiles.id FK references auth.users(id) ON DELETE CASCADE.
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only authenticated users may call this; revoke from all others
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
