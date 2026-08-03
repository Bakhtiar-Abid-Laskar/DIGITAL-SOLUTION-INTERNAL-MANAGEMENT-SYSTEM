-- Migration: 20260728000005_add_job_types_catalog_and_ref_id.sql
-- Description: Add job_types catalog table and job_type_ref_id + snapshot incentive fields to jobs table.

-- 1. Create Job Types Catalog table (if not exists)
create table if not exists public.job_types (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  customer_charge_amount numeric not null default 0 check (customer_charge_amount >= 0),
  receptionist_incentive numeric not null default 0 check (receptionist_incentive >= 0),
  technician_incentive numeric not null default 0 check (technician_incentive >= 0),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- 2. Create Sale Types Catalog table (if not exists)
create table if not exists public.sale_types (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  customer_charge_amount numeric not null default 0 check (customer_charge_amount >= 0),
  receptionist_incentive numeric not null default 0 check (receptionist_incentive >= 0),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- 3. Add FK & snapshot incentive fields to jobs table
alter table public.jobs
  add column if not exists job_type_ref_id uuid references public.job_types(id),
  add column if not exists snap_receptionist_incentive numeric default 0,
  add column if not exists snap_technician_incentive numeric default 0;

-- 4. Add FK & snapshot incentive fields to sales table
alter table public.sales
  add column if not exists sale_type_id uuid references public.sale_types(id),
  add column if not exists snap_receptionist_incentive numeric default 0;

-- 5. Enable RLS on catalog tables
alter table public.job_types enable row level security;
alter table public.sale_types enable row level security;

-- 6. RLS Policies for job_types
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

-- 7. Notify PostgREST to reload schema cache immediately
notify pgrst, 'reload schema';
