-- Migration: 20260728000003_create_storage_buckets.sql
-- Description: Create required Supabase Storage buckets and configure comprehensive RLS policies for uploads/upserts.

-- 1. Create storage buckets
insert into storage.buckets (id, name, public)
values 
  ('attendance-selfies', 'attendance-selfies', false),
  ('onsite-visits', 'onsite-visits', false),
  ('avatars', 'avatars', true),
  ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- 2. Drop legacy restrictive policies on storage.objects
drop policy if exists "Authenticated users upload attendance selfies" on storage.objects;
drop policy if exists "Authenticated users view attendance selfies" on storage.objects;
drop policy if exists "Allow authenticated users access to attendance-selfies" on storage.objects;

drop policy if exists "Authenticated users upload onsite visits" on storage.objects;
drop policy if exists "Authenticated users view onsite visits" on storage.objects;
drop policy if exists "Allow authenticated users access to onsite-visits" on storage.objects;

drop policy if exists "Authenticated users upload avatars" on storage.objects;
drop policy if exists "Authenticated users view avatars" on storage.objects;
drop policy if exists "Public view avatars" on storage.objects;
drop policy if exists "Allow authenticated users access to avatars" on storage.objects;

drop policy if exists "Allow authenticated users access to invoices" on storage.objects;

-- 3. Create FOR ALL Storage RLS Policies (covers INSERT, UPDATE upserts, SELECT, DELETE)
create policy "Allow authenticated users access to attendance-selfies"
  on storage.objects for all to authenticated
  using (bucket_id = 'attendance-selfies')
  with check (bucket_id = 'attendance-selfies');

create policy "Allow authenticated users access to onsite-visits"
  on storage.objects for all to authenticated
  using (bucket_id = 'onsite-visits')
  with check (bucket_id = 'onsite-visits');

create policy "Allow authenticated users access to avatars"
  on storage.objects for all to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "Allow public view avatars"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

create policy "Allow authenticated users access to invoices"
  on storage.objects for all to authenticated
  using (bucket_id = 'invoices')
  with check (bucket_id = 'invoices');
