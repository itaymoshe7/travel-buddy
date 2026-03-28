-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: update profiles schema for new onboarding fields
--
-- Changes
-- -------
-- 1. Drop the instagram_handle column (replaced by social_link).
-- 2. Add social_link  text        — Instagram or Facebook profile URL
-- 3. Add gender       text        — 'male' | 'female' | 'other'
-- 4. Add age          integer     — must be a positive integer
--
-- moments.creator_id already has the correct FK to profiles(id); confirmed
-- in 20260327000002_full_schema.sql — no DDL change needed here.
--
-- RLS reminder
-- ------------
-- Non-recursive SELECT policies are already in place from earlier migrations:
--   profiles → "Authenticated users can read all profiles"  (auth.uid() is not null)
--   moments  → "Authenticated users can read all moments"   (auth.uid() is not null)
-- No RLS changes are required for these new columns.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Drop instagram_handle ─────────────────────────────────────────────────

alter table public.profiles
  drop column if exists instagram_handle;


-- ── 2. Add social_link ───────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists social_link text;


-- ── 3. Add gender ────────────────────────────────────────────────────────────
-- Stored as free text with a CHECK to keep values clean.
-- Use 'drop constraint … if exists' before adding to make re-runs safe.

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add column if not exists gender text
    check (gender in ('male', 'female', 'other'));


-- ── 4. Add age ───────────────────────────────────────────────────────────────

alter table public.profiles
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add column if not exists age integer
    check (age > 0 and age < 120);
