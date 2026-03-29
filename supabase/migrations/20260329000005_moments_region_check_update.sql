-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: update moments_region_check to match the six regions used in the
-- CreateMoment form.
--
-- Previous constraint had 8 slugs ('north-america', 'middle-east', 'oceania'
-- not shown in the UI + 'Other' for migrated rows).  This replaces it with
-- the six canonical regions plus 'Other' for legacy rows.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.moments
  drop constraint if exists moments_region_check;

alter table public.moments
  add constraint moments_region_check check (
    region in (
      'south-america',
      'far-east',
      'southeast-asia',
      'europe',
      'africa',
      'central-america',
      'Other'
    )
  );
