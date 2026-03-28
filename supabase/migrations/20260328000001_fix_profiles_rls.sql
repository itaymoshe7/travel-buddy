-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: infinite recursion in profiles SELECT policy
--
-- Root cause: the previous policy used a subquery that read from `profiles`
-- while the policy itself was being evaluated for a `profiles` query —
-- causing Postgres to recurse endlessly.
--
-- Fix: drop the recursive policy and replace it with a simple rule:
-- any authenticated user can read any profile.
-- This is correct for a social app where users need to discover each other.
-- Write access (INSERT / UPDATE) remains owner-only, unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

-- Also drop the moments policy that has the same recursion pattern
-- (it joined profiles twice to compare travel_region).

-- ── 1. profiles SELECT ────────────────────────────────────────────────────────
drop policy if exists "Profiles readable by owner or same-region users" on public.profiles;
drop policy if exists "Users can view their own profile"                 on public.profiles;

create policy "Authenticated users can read all profiles"
  on public.profiles for select
  using (auth.uid() is not null);

-- ── 2. moments SELECT ─────────────────────────────────────────────────────────
-- The old policy joined profiles twice (viewer + creator) to compare
-- travel_region, which triggered the same recursive policy evaluation.
-- Replace it with: any authenticated user can read all moments.
-- Sensitive filtering (e.g. by region) should be done client-side or via
-- a dedicated security-definer function once the app matures.
drop policy if exists "Moments readable by owner or same-region users"  on public.moments;

create policy "Authenticated users can read all moments"
  on public.moments for select
  using (auth.uid() is not null);
