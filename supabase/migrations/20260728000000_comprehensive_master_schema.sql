-- Migration: 20260728000000_comprehensive_master_schema.sql
-- Description: Master comprehensive schema migration for RepairShop Service Management System.
-- Includes: Complete tables, sequences, functions, triggers, indexes, and robust Row Level Security (RLS) policies.

-- ============================================================================
-- 1. SEQUENCES & HELPER FUNCTIONS
-- ============================================================================

-- Sequence for server-side job code generation
create sequence if not exists public.job_code_seq start with 1 increment by 1;

-- Server-side job code generator: RS-YYYY-0001
create or replace function public.generate_job_code()
returns text as $$
declare
  next_val bigint;
  yr text := to_char(now(), 'YYYY');
begin
  next_val := nextval('public.job_code_seq');
  return 'RS-' || yr || '-' || lpad(next_val::text, 4, '0');
end;
$$ language plpgsql volatile security definer;

-- Role Helper Functions (SECURITY DEFINER to prevent RLS policy infinite recursion)
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

-- ============================================================================
-- 2. CORE TABLES & COLUMNS
-- ============================================================================

-- USERS TABLE
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text,
  role text check (role in ('admin', 'receptionist', 'technician')) not null,
  is_active boolean default false,
  expo_push_token text,
  avatar_url text,
  created_at timestamptz default now()
);

-- JOBS TABLE
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text unique not null default public.generate_job_code(),
  customer_name text not null,
  customer_contact text not null,
  customer_email text,
  customer_gstin text,
  device_type text check (device_type in ('Laptop', 'PC', 'Other')) not null,
  reported_issue text not null,
  remarks text,
  work_notes text,
  job_type text check (job_type in ('Inhouse', 'Onsite')) default 'Inhouse',
  priority text check (priority in ('Normal', 'High', 'Urgent')) default 'Normal',
  status text check (status in ('Received', 'In Progress', 'Waiting for Materials', 'Completed')) default 'Received',
  receptionist_id uuid references public.users(id),
  technician_id uuid references public.users(id),
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Ensure default generator exists on jobs(job_code)
alter table public.jobs alter column job_code set default public.generate_job_code();

-- JOB MATERIALS TABLE
create table if not exists public.job_materials (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  material_name text not null,
  quantity numeric not null check (quantity > 0),
  unit_cost numeric not null check (unit_cost >= 0),
  total_cost numeric generated always as (quantity * unit_cost) stored
);

-- ATTENDANCE TABLE
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  date date not null,
  check_in_time timestamptz,
  check_out_time timestamptz,
  selfie_url text,
  check_in_selfie_url text,
  check_out_selfie_url text,
  gps_lat numeric,
  gps_lng numeric,
  check_out_gps_lat numeric,
  check_out_gps_lng numeric,
  ot_hours numeric default 0 check (ot_hours >= 0),
  early_hours numeric default 0 check (early_hours >= 0),
  late_in_minutes numeric default 0 check (late_in_minutes >= 0),
  early_in_minutes numeric default 0 check (early_in_minutes >= 0),
  late_out_minutes numeric default 0 check (late_out_minutes >= 0),
  status text check (status in ('Present', 'Halfday', 'Leave', 'Absent')) default 'Present',
  approved_by uuid references public.users(id),
  unique(user_id, date)
);

-- ONSITE VISITS TABLE
create table if not exists public.onsite_visits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  technician_id uuid references public.users(id),
  arrival_selfie_url text,
  arrival_time timestamptz,
  arrival_gps_lat numeric,
  arrival_gps_lng numeric,
  departure_selfie_url text,
  departure_time timestamptz,
  departure_gps_lat numeric,
  departure_gps_lng numeric
);

-- INVENTORY TABLE
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  quantity numeric default 0 check (quantity >= 0),
  unit text default 'Pcs',
  low_stock_threshold numeric default 5 check (low_stock_threshold >= 0),
  cost_price numeric default 0 check (cost_price >= 0),
  selling_price numeric default 0 check (selling_price >= 0),
  last_updated timestamptz default now()
);

-- BILLING TABLE
create table if not exists public.billing (
  id uuid primary key default gen_random_uuid(),
  job_id uuid unique references public.jobs(id) on delete cascade,
  parts_total numeric default 0 check (parts_total >= 0),
  labour_charge numeric default 0 check (labour_charge >= 0),
  tax_percent numeric default 0 check (tax_percent >= 0),
  discount numeric default 0 check (discount >= 0),
  grand_total numeric default 0,
  is_paid boolean default false,
  invoice_url text,
  created_at timestamptz default now()
);

-- SALES TABLE
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  customer_name text not null,
  customer_contact text,
  subtotal numeric default 0,
  tax_percent numeric default 0,
  discount numeric default 0,
  grand_total numeric default 0,
  payment_mode text check (payment_mode in ('cash', 'online', 'card', 'upi')) default 'cash',
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- SALE ITEMS TABLE
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  inventory_id uuid references public.inventory(id) on delete set null,
  item_name text not null,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  total_price numeric generated always as (quantity * unit_price) stored
);

-- PAYMENTS TABLE (Advance salary, materials, expenditures)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('advance_salary', 'materials_purchase', 'daily_expenditure', 'office_development')) not null,
  amount numeric not null check (amount > 0),
  description text,
  user_id uuid references public.users(id),
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- STAFF RATES & COMPENSATION RULES TABLE
create table if not exists public.staff_rates (
  user_id uuid primary key references public.users(id) on delete cascade,
  base_daily_rate numeric default 0 check (base_daily_rate >= 0),
  ot_rate_per_hour numeric default 0 check (ot_rate_per_hour >= 0),
  early_deduction_per_hour numeric default 0 check (early_deduction_per_hour >= 0),
  monthly_salary numeric default 0 check (monthly_salary >= 0),
  halfday_deduction numeric default 0 check (halfday_deduction >= 0),
  late_in_deduction numeric default 0 check (late_in_deduction >= 0),
  late_in_threshold_minutes integer default 15 check (late_in_threshold_minutes >= 0),
  early_in_bonus numeric default 0 check (early_in_bonus >= 0),
  late_out_bonus numeric default 0 check (late_out_bonus >= 0),
  customer_review_bonus numeric default 0 check (customer_review_bonus >= 0),
  customer_review_penalty numeric default 0 check (customer_review_penalty >= 0),
  job_completion_bonus_threshold integer default 30 check (job_completion_bonus_threshold >= 0),
  job_completion_bonus_amount numeric default 0 check (job_completion_bonus_amount >= 0),
  technician_incentive_percent numeric default 0 check (technician_incentive_percent >= 0)
);

-- HOLIDAYS TABLE
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  name text not null,
  is_recurring boolean default false,
  created_at timestamptz default now()
);

-- CUSTOMER REVIEWS TABLE
create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  score numeric not null check (score >= 1.0 and score <= 5.0),
  comments text,
  created_at timestamptz default now()
);

-- SALARY TABLE
create table if not exists public.salary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  month date not null,
  base_daily_rate numeric default 0,
  working_days integer default 0,
  present_days integer default 0,
  halfday_count integer default 0,
  leave_count integer default 0,
  ot_hours numeric default 0,
  ot_rate_per_hour numeric default 0,
  early_hours numeric default 0,
  early_deduction_per_hour numeric default 0,
  advance_deducted numeric default 0,
  gross_salary numeric default 0,
  net_salary numeric default 0,
  monthly_salary_base numeric default 0,
  halfday_deduction_total numeric default 0,
  absence_deduction_total numeric default 0,
  late_in_deduction_total numeric default 0,
  early_out_deduction_total numeric default 0,
  customer_review_deduction numeric default 0,
  early_in_bonus_total numeric default 0,
  late_out_bonus_total numeric default 0,
  overtime_pay numeric default 0,
  customer_review_bonus_total numeric default 0,
  job_completion_bonus numeric default 0,
  incentive_amount numeric default 0,
  created_at timestamptz default now(),
  unique(user_id, month)
);

-- NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  recipient_user_id uuid references public.users(id) on delete cascade,
  channel text check (channel in ('push', 'whatsapp', 'email')) not null,
  message text not null,
  sent_at timestamptz,
  status text check (status in ('pending', 'sent', 'failed')) default 'pending',
  created_at timestamptz default now()
);


-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

create index if not exists idx_jobs_job_code on public.jobs(job_code);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_jobs_technician_id on public.jobs(technician_id);
create index if not exists idx_jobs_receptionist_id on public.jobs(receptionist_id);
create index if not exists idx_attendance_user_date on public.attendance(user_id, date);
create index if not exists idx_salary_user_month on public.salary(user_id, month);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_notifications_recipient on public.notifications(recipient_user_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.jobs enable row level security;
alter table public.job_materials enable row level security;
alter table public.attendance enable row level security;
alter table public.onsite_visits enable row level security;
alter table public.inventory enable row level security;
alter table public.billing enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.staff_rates enable row level security;
alter table public.holidays enable row level security;
alter table public.customer_reviews enable row level security;
alter table public.salary enable row level security;
alter table public.notifications enable row level security;

-- USERS POLICIES
drop policy if exists "Users viewable by authenticated users" on public.users;
drop policy if exists "Users manageable by admin" on public.users;
drop policy if exists "Admins can do everything on users" on public.users;
drop policy if exists "Anyone can read active technicians or themselves" on public.users;

create policy "Users viewable by authenticated users"
  on public.users for select
  using (auth.role() = 'authenticated');

create policy "Users manageable by admin"
  on public.users for all
  using (public.is_admin());

-- JOBS POLICIES
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

-- ATTENDANCE POLICIES
drop policy if exists "Attendance own record or admin view" on public.attendance;
drop policy if exists "Attendance user insert own" on public.attendance;
drop policy if exists "Attendance update own or admin" on public.attendance;

create policy "Attendance own record or admin view"
  on public.attendance for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Attendance user insert own"
  on public.attendance for insert
  with check (auth.uid() = user_id);

create policy "Attendance update own or admin"
  on public.attendance for update
  using (auth.uid() = user_id or public.is_admin());

-- HOLIDAYS & REVIEWS POLICIES
drop policy if exists "Holidays viewable by authenticated users" on public.holidays;
drop policy if exists "Holidays manageable by admin" on public.holidays;

create policy "Holidays viewable by authenticated users"
  on public.holidays for select using (auth.role() = 'authenticated');

create policy "Holidays manageable by admin"
  on public.holidays for all using (public.is_admin());

drop policy if exists "Customer reviews viewable by authenticated" on public.customer_reviews;
drop policy if exists "Customer reviews manageable by admin" on public.customer_reviews;

create policy "Customer reviews viewable by authenticated"
  on public.customer_reviews for select using (auth.role() = 'authenticated');

create policy "Customer reviews manageable by admin"
  on public.customer_reviews for all using (public.is_admin());

-- STRICT ADMIN-ONLY FINANCIAL TABLES (SALARY, STAFF_RATES, PAYMENTS)
drop policy if exists "Salary strict admin only" on public.salary;
create policy "Salary strict admin only"
  on public.salary for all using (public.is_admin());

drop policy if exists "Staff rates strict admin only" on public.staff_rates;
create policy "Staff rates strict admin only"
  on public.staff_rates for all using (public.is_admin());

drop policy if exists "Payments strict admin only" on public.payments;
create policy "Payments strict admin only"
  on public.payments for all using (public.is_admin());

-- BILLING & INVENTORY POLICIES
drop policy if exists "Billing receptionist and admin" on public.billing;
create policy "Billing receptionist and admin"
  on public.billing for all using (public.is_admin() or public.is_receptionist());

drop policy if exists "Inventory viewable by staff" on public.inventory;
create policy "Inventory viewable by staff"
  on public.inventory for select using (auth.role() = 'authenticated');

drop policy if exists "Inventory manageable by admin and receptionist" on public.inventory;
create policy "Inventory manageable by admin and receptionist"
  on public.inventory for all using (public.is_admin() or public.is_receptionist());

-- ============================================================================
-- 5. STORAGE BUCKETS & STORAGE RLS POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public)
values 
  ('attendance-selfies', 'attendance-selfies', false),
  ('onsite-visits', 'onsite-visits', false),
  ('avatars', 'avatars', true),
  ('invoices', 'invoices', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users upload attendance selfies" on storage.objects;
drop policy if exists "Authenticated users view attendance selfies" on storage.objects;
drop policy if exists "Allow authenticated users access to attendance-selfies" on storage.objects;

drop policy if exists "Authenticated users upload onsite visits" on storage.objects;
drop policy if exists "Authenticated users view onsite visits" on storage.objects;
drop policy if exists "Allow authenticated users access to onsite-visits" on storage.objects;

drop policy if exists "Authenticated users upload avatars" on storage.objects;
drop policy if exists "Authenticated users view avatars" on storage.objects;
drop policy if exists "Allow authenticated users access to avatars" on storage.objects;

drop policy if exists "Allow authenticated users access to invoices" on storage.objects;

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

drop policy if exists "Allow public view avatars" on storage.objects;
create policy "Allow public view avatars"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

create policy "Allow authenticated users access to invoices"
  on storage.objects for all to authenticated
  using (bucket_id = 'invoices')
  with check (bucket_id = 'invoices');


