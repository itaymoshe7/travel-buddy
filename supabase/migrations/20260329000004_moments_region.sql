-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add moments.region + relax profiles.travel_region nullability
--
-- Changes
-- -------
-- 1. moments.region (text, NOT NULL)
--    Stores the world region where the moment takes place so the Explore feed
--    can filter globally (e.g. 'Europe', 'South East Asia', 'South America').
--    A temporary column default of 'Other' is applied so existing rows satisfy
--    the NOT NULL constraint, then the default is dropped so every new moment
--    must explicitly declare its region.
--
-- 2. profiles.travel_region — confirmed nullable
--    Region was previously surfaced as a mandatory step in the signup wizard.
--    Since it is now optional, we explicitly DROP NOT NULL (safe no-op if the
--    column was already nullable) so the DB contract matches the new UX.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. moments.region ────────────────────────────────────────────────────────

-- Add the column with a temporary default so existing rows pass NOT NULL.
alter table public.moments
  add column if not exists region text not null default 'Other';

-- Add a CHECK so only known region slugs are stored.
alter table public.moments
  drop constraint if exists moments_region_check;

alter table public.moments
  add constraint moments_region_check check (
    region in (
      'south-america',
      'southeast-asia',
      'europe',
      'north-america',
      'middle-east',
      'africa',
      'oceania',
      'central-america',
      'Other'
    )
  );

-- Drop the column default — every new moment must supply a region explicitly.
alter table public.moments
  alter column region drop default;

-- Index for fast region-based filtering in the Explore feed.
create index if not exists idx_moments_region on public.moments (region);


-- ── 2. profiles.travel_region — ensure nullable ───────────────────────────────

-- travel_region was already created without NOT NULL (migration 000001) but
-- this line is idempotent and makes the intent explicit.
alter table public.profiles
  alter column travel_region drop not null;
