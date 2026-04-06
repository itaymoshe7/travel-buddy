-- Add travel_tags array column to profiles so users can pick style tags
-- (Backpacker, Luxury, Solo Traveler, etc.)

alter table public.profiles
  add column if not exists travel_tags text[] not null default '{}';
