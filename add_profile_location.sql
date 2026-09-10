-- Save the customer's map location on their profile.
-- Run once in Supabase SQL Editor.
alter table public.profiles
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7);
