-- Migration: 20260728000001_fix_users_rls_recursion.sql
-- Description: Fix infinite recursion in RLS policies for relation "users" by using SECURITY DEFINER helper functions.

-- 1. Create SECURITY DEFINER role helper functions (these bypass RLS during policy evaluation to prevent infinite loops)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin' and is_active = true
  );
$$ language sql security definer set search_path = public;

create or replace function public.is_receptionist()
returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'receptionist' and is_active = true
  );
$$ language sql security definer set search_path = public;

create or replace function public.is_technician()
returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'technician' and is_active = true
  );
$$ language sql security definer set search_path = public;

create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and is_active = true
  );
$$ language sql security definer set search_path = public;

-- 2. Drop existing recursive policies on public.users
drop policy if exists "Users viewable by authenticated users" on public.users;
drop policy if exists "Users manageable by admin" on public.users;
drop policy if exists "Admins can do everything on users" on public.users;
drop policy if exists "Anyone can read active technicians or themselves" on public.users;

-- 3. Create non-recursive RLS policies on public.users
create policy "Users viewable by authenticated users"
  on public.users for select
  using (auth.role() = 'authenticated');

create policy "Users manageable by admin"
  on public.users for all
  using (public.is_admin());

-- 4. Update JOBS RLS policies to use SECURITY DEFINER functions
drop policy if exists "Jobs viewable by staff" on public.jobs;
drop policy if exists "Jobs manageable by receptionist and admin" on public.jobs;
drop policy if exists "Technician update assigned jobs" on public.jobs;

create policy "Jobs viewable by staff"
  on public.jobs for select
  using (
    public.is_admin() or public.is_receptionist() or (public.is_technician() and technician_id = auth.uid())
  );

create policy "Jobs manageable by receptionist and admin"
  on public.jobs for all
  using (public.is_admin() or public.is_receptionist());

create policy "Technician update assigned jobs"
  on public.jobs for update
  using (public.is_technician() and technician_id = auth.uid());

-- 5. Update ATTENDANCE policies to use SECURITY DEFINER functions
drop policy if exists "Attendance own record or admin view" on public.attendance;
drop policy if exists "Attendance update own or admin" on public.attendance;

create policy "Attendance own record or admin view"
  on public.attendance for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Attendance update own or admin"
  on public.attendance for update
  using (auth.uid() = user_id or public.is_admin());

-- 6. Update STRICT ADMIN-ONLY TABLES to use SECURITY DEFINER functions
drop policy if exists "Salary strict admin only" on public.salary;
create policy "Salary strict admin only"
  on public.salary for all using (public.is_admin());

drop policy if exists "Staff rates strict admin only" on public.staff_rates;
create policy "Staff rates strict admin only"
  on public.staff_rates for all using (public.is_admin());

drop policy if exists "Payments strict admin only" on public.payments;
create policy "Payments strict admin only"
  on public.payments for all using (public.is_admin());

-- 7. Update BILLING & INVENTORY policies to use SECURITY DEFINER functions
drop policy if exists "Billing receptionist and admin" on public.billing;
create policy "Billing receptionist and admin"
  on public.billing for all using (public.is_admin() or public.is_receptionist());

drop policy if exists "Inventory manageable by admin and receptionist" on public.inventory;
create policy "Inventory manageable by admin and receptionist"
  on public.inventory for all using (public.is_admin() or public.is_receptionist());
