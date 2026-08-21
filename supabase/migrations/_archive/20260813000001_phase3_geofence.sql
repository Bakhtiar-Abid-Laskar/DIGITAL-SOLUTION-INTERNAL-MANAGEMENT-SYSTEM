-- Migration: Phase 3 Geofence Settings
-- Description: Creates a table to store the single global geofence coordinate.

create table if not exists public.geofence_settings (
  id uuid primary key default gen_random_uuid(),
  lat numeric not null,
  lng numeric not null,
  radius numeric not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

-- Ensure there is only one row in this table via a constraint or trigger if necessary.
-- But since it's just settings, we can just rely on the application logic or RLS.
alter table public.geofence_settings enable row level security;

drop policy if exists "Geofence readable by all authenticated users" on public.geofence_settings;
create policy "Geofence readable by all authenticated users"
  on public.geofence_settings for select
  using (auth.role() = 'authenticated');

drop policy if exists "Geofence manageable by admin" on public.geofence_settings;
create policy "Geofence manageable by admin"
  on public.geofence_settings for all
  using (public.is_admin())
  with check (public.is_admin());

