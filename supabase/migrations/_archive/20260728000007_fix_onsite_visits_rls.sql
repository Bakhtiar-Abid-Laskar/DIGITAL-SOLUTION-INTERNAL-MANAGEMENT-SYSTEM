-- Migration: 20260728000007_fix_onsite_visits_rls.sql
-- Description: Fix RLS policies for public.onsite_visits to allow technicians and staff to insert and update visit logs cleanly.

-- Enable Row Level Security
alter table public.onsite_visits enable row level security;

-- Drop all old/conflicting policies on public.onsite_visits
drop policy if exists "onsite_visits_all_admin" on public.onsite_visits;
drop policy if exists "onsite_visits_select_technician" on public.onsite_visits;
drop policy if exists "onsite_visits_insert_technician" on public.onsite_visits;
drop policy if exists "onsite_visits_update_technician" on public.onsite_visits;
drop policy if exists "onsite_visits_select_receptionist" on public.onsite_visits;
drop policy if exists "Admins and Receptionists have full access to onsite_visits" on public.onsite_visits;
drop policy if exists "Technicians can access visits for their assigned jobs" on public.onsite_visits;
drop policy if exists "onsite_visits_admin_receptionist_all" on public.onsite_visits;
drop policy if exists "onsite_visits_technician_select" on public.onsite_visits;
drop policy if exists "onsite_visits_technician_insert" on public.onsite_visits;
drop policy if exists "onsite_visits_technician_update" on public.onsite_visits;

-- 1. Full Access Policy for Admins and Receptionists
create policy "onsite_visits_admin_receptionist_all" on public.onsite_visits
  for all to authenticated
  using (public.is_admin() or public.is_receptionist())
  with check (public.is_admin() or public.is_receptionist());

-- 2. SELECT Policy for Technicians and Staff
create policy "onsite_visits_technician_select" on public.onsite_visits
  for select to authenticated
  using (technician_id = auth.uid() or public.is_staff());

-- 3. INSERT Policy for Technicians (Verifies technician_id matches logged in auth.uid())
create policy "onsite_visits_technician_insert" on public.onsite_visits
  for insert to authenticated
  with check (technician_id = auth.uid() or public.is_staff());

-- 4. UPDATE Policy for Technicians (For departure selfie & GPS log)
create policy "onsite_visits_technician_update" on public.onsite_visits
  for update to authenticated
  using (technician_id = auth.uid() or public.is_staff())
  with check (technician_id = auth.uid() or public.is_staff());

-- Reload schema cache
notify pgrst, 'reload schema';
