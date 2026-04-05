-- ─────────────────────────────────────────────────────────────────────────────
-- Update moments.region to new 6-region taxonomy
--
-- Old slugs: south-america, far-east, southeast-asia, europe, africa, central-america
-- New slugs: south-america, central-north-america, europe, australia, africa, asia
--
-- Mapping:
--   far-east        → asia
--   southeast-asia  → asia
--   central-america → central-north-america
--   australia       → new (no existing rows)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Drop the existing region CHECK constraint (name may vary) ──────────────
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM   pg_constraint
  WHERE  conrelid = 'public.moments'::regclass
    AND  contype  = 'c'
    AND  conname  ILIKE '%region%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.moments DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

-- ── 2. Migrate existing rows to new slugs ─────────────────────────────────────
UPDATE public.moments SET region = 'asia'
  WHERE region IN ('far-east', 'southeast-asia');

UPDATE public.moments SET region = 'central-north-america'
  WHERE region = 'central-america';

-- ── 3. Add new CHECK constraint ───────────────────────────────────────────────
ALTER TABLE public.moments
  ADD CONSTRAINT moments_region_check
  CHECK (region IN (
    'south-america',
    'central-north-america',
    'europe',
    'australia',
    'africa',
    'asia'
  ));
