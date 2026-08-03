-- Migration: Salary & Incentive System
-- Phase 1: Database Schema & Data Model Changes

-- 1. Extend staff_rates table with base_pay, absent_day_deduction, allowed_leave_days
alter table public.staff_rates
  add column if not exists base_pay numeric default 0,
  add column if not exists absent_day_deduction numeric default 0,
  add column if not exists allowed_leave_days numeric default 0;

-- 2. Create Job Types Catalog table
create table if not exists public.job_types (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  customer_charge_amount numeric not null default 0 check (customer_charge_amount >= 0),
  receptionist_incentive numeric not null default 0 check (receptionist_incentive >= 0),
  technician_incentive numeric not null default 0 check (technician_incentive >= 0),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- 3. Create Sale Types Catalog table
create table if not exists public.sale_types (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  customer_charge_amount numeric not null default 0 check (customer_charge_amount >= 0),
  receptionist_incentive numeric not null default 0 check (receptionist_incentive >= 0),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- 4. Add FK & snapshot incentive fields to jobs table
alter table public.jobs
  add column if not exists job_type_ref_id uuid references public.job_types(id),
  add column if not exists snap_receptionist_incentive numeric default 0,
  add column if not exists snap_technician_incentive numeric default 0;

-- 5. Add FK & snapshot incentive fields to sales table
alter table public.sales
  add column if not exists sale_type_id uuid references public.sale_types(id),
  add column if not exists snap_receptionist_incentive numeric default 0;

-- 6. Create Staff Incentives accrual log table
create table if not exists public.staff_incentives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  amount numeric not null default 0,
  role_type text check (role_type in ('receptionist','technician')) not null,
  description text,
  created_at timestamptz default now()
);

-- 7. Update salary table to store new salary breakdown fields
alter table public.salary
  add column if not exists base_pay numeric default 0,
  add column if not exists incentive_pay numeric default 0,
  add column if not exists absent_day_deduction numeric default 0,
  add column if not exists allowed_leave_days numeric default 0,
  add column if not exists absence_deduction numeric default 0;

-- 8. Enable Row Level Security
alter table public.job_types enable row level security;
alter table public.sale_types enable row level security;
alter table public.staff_incentives enable row level security;

-- 9. RLS Policies for job_types
drop policy if exists "job_types_admin_all" on public.job_types;
create policy "job_types_admin_all" on public.job_types
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin' and users.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin' and users.is_active = true
    )
  );

drop policy if exists "job_types_staff_read" on public.job_types;
create policy "job_types_staff_read" on public.job_types
  for select to authenticated
  using (is_active = true);

-- 10. RLS Policies for sale_types
drop policy if exists "sale_types_admin_all" on public.sale_types;
create policy "sale_types_admin_all" on public.sale_types
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin' and users.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin' and users.is_active = true
    )
  );

drop policy if exists "sale_types_staff_read" on public.sale_types;
create policy "sale_types_staff_read" on public.sale_types
  for select to authenticated
  using (is_active = true);

-- 11. RLS Policies for staff_incentives
drop policy if exists "staff_incentives_admin_all" on public.staff_incentives;
create policy "staff_incentives_admin_all" on public.staff_incentives
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin' and users.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin' and users.is_active = true
    )
  );

drop policy if exists "staff_incentives_user_read" on public.staff_incentives;
create policy "staff_incentives_user_read" on public.staff_incentives
  for select to authenticated
  using (user_id = auth.uid());
