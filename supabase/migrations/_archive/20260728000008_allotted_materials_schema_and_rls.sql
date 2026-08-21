-- Migration: 20260728000008_allotted_materials_schema_and_rls.sql
-- Description: Extend job_materials table for Allotted Materials tracking with technician_id, inventory_id, created_at, and RLS policies.

-- 1. Ensure public.job_materials table exists and extend with missing tracking columns
create table if not exists public.job_materials (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  material_name text not null,
  quantity numeric not null check (quantity > 0),
  unit_cost numeric not null check (unit_cost >= 0),
  total_cost numeric generated always as (quantity * unit_cost) stored,
  photo_url text,
  technician_id uuid references public.users(id) on delete set null,
  inventory_id uuid references public.inventory(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.job_materials
  add column if not exists technician_id uuid references public.users(id) on delete set null,
  add column if not exists inventory_id uuid references public.inventory(id) on delete set null,
  add column if not exists photo_url text,
  add column if not exists created_at timestamptz default now();

-- 2. Trigger to automatically set technician_id from auth.uid() or job's technician_id if omitted
create or replace function public.set_job_material_defaults()
returns trigger as $$
begin
  if new.technician_id is null then
    new.technician_id := auth.uid();
  end if;
  if new.technician_id is null and new.job_id is not null then
    select technician_id into new.technician_id from public.jobs where id = new.job_id;
  end if;
  if new.created_at is null then
    new.created_at := now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_set_job_material_defaults on public.job_materials;
create trigger trg_set_job_material_defaults
before insert on public.job_materials
for each row execute function public.set_job_material_defaults();

-- 3. Enable RLS on job_materials and inventory
alter table public.job_materials enable row level security;
alter table public.inventory enable row level security;

-- 4. RLS Policies for job_materials
drop policy if exists "job_materials_all_admin" on public.job_materials;
drop policy if exists "job_materials_select_receptionist" on public.job_materials;
drop policy if exists "job_materials_select_technician" on public.job_materials;
drop policy if exists "job_materials_insert_technician" on public.job_materials;
drop policy if exists "job_materials_update_technician" on public.job_materials;
drop policy if exists "job_materials_delete_technician" on public.job_materials;

-- Admin & Receptionist: Full SELECT access to all job materials
drop policy if exists "job_materials_admin_receptionist_all" on public.job_materials;
create policy "job_materials_admin_receptionist_all" on public.job_materials
  for all to authenticated
  using (public.is_admin() or public.is_receptionist())
  with check (public.is_admin() or public.is_receptionist());

-- Technician: SELECT rows where technician_id = auth.uid() or assigned to job
drop policy if exists "job_materials_technician_select" on public.job_materials;
create policy "job_materials_technician_select" on public.job_materials
  for select to authenticated
  using (
    technician_id = auth.uid()
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id and jobs.technician_id = auth.uid()
    )
  );

-- Technician: INSERT materials for assigned jobs or own technician_id
drop policy if exists "job_materials_technician_insert" on public.job_materials;
create policy "job_materials_technician_insert" on public.job_materials
  for insert to authenticated
  with check (
    technician_id = auth.uid()
    or technician_id is null
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id and jobs.technician_id = auth.uid()
    )
  );

-- Technician: UPDATE/DELETE materials for assigned jobs or own technician_id
drop policy if exists "job_materials_technician_update" on public.job_materials;
create policy "job_materials_technician_update" on public.job_materials
  for update to authenticated
  using (
    technician_id = auth.uid()
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id and jobs.technician_id = auth.uid()
    )
  );

drop policy if exists "job_materials_technician_delete" on public.job_materials;
create policy "job_materials_technician_delete" on public.job_materials
  for delete to authenticated
  using (
    technician_id = auth.uid()
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id and jobs.technician_id = auth.uid()
    )
  );

-- 5. Ensure inventory SELECT policy allows all authenticated staff to search for autocomplete
drop policy if exists "inventory_select_all_staff" on public.inventory;
drop policy if exists "inventory_select_all_staff" on public.inventory;
create policy "inventory_select_all_staff" on public.inventory
  for select to authenticated
  using (true);

-- 6. Reload schema cache
notify pgrst, 'reload schema';

