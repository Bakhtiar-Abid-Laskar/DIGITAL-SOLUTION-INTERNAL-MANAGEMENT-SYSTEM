-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.jobs enable row level security;
alter table public.job_materials enable row level security;
alter table public.attendance enable row level security;
alter table public.onsite_visits enable row level security;
alter table public.inventory enable row level security;
alter table public.billing enable row level security;
alter table public.payments enable row level security;
alter table public.staff_rates enable row level security;
alter table public.salary enable row level security;
alter table public.notifications enable row level security;

-- Create helper functions for roles
create or replace function public.is_admin() returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin' and is_active = true
  );
$$ language sql security definer;

create or replace function public.is_receptionist() returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'receptionist' and is_active = true
  );
$$ language sql security definer;

create or replace function public.is_technician() returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'technician' and is_active = true
  );
$$ language sql security definer;

-- Policies for public.users
-- Admin: full access
create policy "Admins can do everything on users" on public.users
  for all to authenticated using (public.is_admin());

-- Others: can read all active technicians (to assign jobs, etc.), and their own profile
create policy "Anyone can read active technicians or themselves" on public.users
  for select to authenticated using (
    id = auth.uid() or (role = 'technician' and is_active = true)
  );

-- Policies for public.jobs
create policy "Admins and Receptionists have full access to jobs" on public.jobs
  for all to authenticated using (public.is_admin() or public.is_receptionist());

create policy "Technicians can only access their assigned jobs" on public.jobs
  for all to authenticated using (public.is_technician() and technician_id = auth.uid());

-- Policies for public.job_materials
create policy "Admins and Receptionists have full access to job_materials" on public.job_materials
  for all to authenticated using (public.is_admin() or public.is_receptionist());

create policy "Technicians can access materials for their assigned jobs" on public.job_materials
  for all to authenticated using (
    public.is_technician() and exists (
      select 1 from public.jobs j where j.id = job_materials.job_id and j.technician_id = auth.uid()
    )
  );

-- Policies for public.attendance
create policy "Admins have full access to attendance" on public.attendance
  for all to authenticated using (public.is_admin());

create policy "Users can read their own attendance" on public.attendance
  for select to authenticated using (user_id = auth.uid());

create policy "Users can insert their own attendance" on public.attendance
  for insert to authenticated with check (user_id = auth.uid());

create policy "Users can update their own attendance" on public.attendance
  for update to authenticated using (user_id = auth.uid());

-- Policies for public.onsite_visits
create policy "Admins and Receptionists have full access to onsite_visits" on public.onsite_visits
  for all to authenticated using (public.is_admin() or public.is_receptionist());

create policy "Technicians can access visits for their assigned jobs" on public.onsite_visits
  for all to authenticated using (public.is_technician() and technician_id = auth.uid());

-- Policies for public.inventory
create policy "Admins and Receptionists have full access to inventory" on public.inventory
  for all to authenticated using (public.is_admin() or public.is_receptionist());

create policy "Technicians can read inventory" on public.inventory
  for select to authenticated using (public.is_technician());

-- Policies for public.billing
create policy "Admins and Receptionists have full access to billing" on public.billing
  for all to authenticated using (public.is_admin() or public.is_receptionist());

-- Policies for Admin-Only tables: payments, staff_rates, salary
create policy "Admins have full access to payments" on public.payments
  for all to authenticated using (public.is_admin());

create policy "Admins have full access to staff_rates" on public.staff_rates
  for all to authenticated using (public.is_admin());

create policy "Admins have full access to salary" on public.salary
  for all to authenticated using (public.is_admin());

-- Policies for public.notifications
create policy "Admins have full access to notifications" on public.notifications
  for all to authenticated using (public.is_admin());

create policy "Users can read their own notifications" on public.notifications
  for select to authenticated using (recipient_user_id = auth.uid());
