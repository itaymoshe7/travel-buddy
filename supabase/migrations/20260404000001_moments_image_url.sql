-- ─────────────────────────────────────────────────────────────────────────────
-- Add image_url to moments + set up 'moment-images' storage bucket
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. New column ─────────────────────────────────────────────────────────────
alter table public.moments
  add column if not exists image_url text;

-- ── 2. Storage bucket (public read) ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('moment-images', 'moment-images', true)
on conflict (id) do nothing;

-- ── 3. Storage policies ───────────────────────────────────────────────────────

-- Any authenticated user can upload
drop policy if exists "Authenticated users can upload moment images" on storage.objects;
create policy "Authenticated users can upload moment images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'moment-images');

-- Public read (bucket is already public, but explicit policy is belt-and-braces)
drop policy if exists "Public can view moment images" on storage.objects;
create policy "Public can view moment images"
  on storage.objects for select to public
  using (bucket_id = 'moment-images');

-- Owners can delete their own uploads
drop policy if exists "Users can delete their own moment images" on storage.objects;
create policy "Users can delete their own moment images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'moment-images' and owner_id = auth.uid()::text);
