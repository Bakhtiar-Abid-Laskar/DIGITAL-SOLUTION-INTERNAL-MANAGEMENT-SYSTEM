-- Migration: Redesign Salary & Payroll Subsystem (Fixed Monthly Salary Model)

-- 1. Extend staff_rates table with fixed monthly salary and itemized addition/deduction rates
alter table public.staff_rates
  add column if not exists monthly_salary numeric default 0 check (monthly_salary >= 0),
  add column if not exists halfday_deduction numeric default 0 check (halfday_deduction >= 0),
  add column if not exists late_in_deduction numeric default 0 check (late_in_deduction >= 0),
  add column if not exists late_in_threshold_minutes integer default 15 check (late_in_threshold_minutes >= 0),
  add column if not exists early_in_bonus numeric default 0 check (early_in_bonus >= 0),
  add column if not exists late_out_bonus numeric default 0 check (late_out_bonus >= 0),
  add column if not exists customer_review_bonus numeric default 0 check (customer_review_bonus >= 0),
  add column if not exists customer_review_penalty numeric default 0 check (customer_review_penalty >= 0),
  add column if not exists job_completion_bonus_threshold integer default 30 check (job_completion_bonus_threshold >= 0),
  add column if not exists job_completion_bonus_amount numeric default 0 check (job_completion_bonus_amount >= 0);

-- 2. Extend attendance table with shift minutes tracking
alter table public.attendance
  add column if not exists late_in_minutes numeric default 0,
  add column if not exists early_in_minutes numeric default 0,
  add column if not exists late_out_minutes numeric default 0;

-- 3. Create public.holidays table
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  name text not null,
  is_recurring boolean default false,
  created_at timestamptz default now()
);

-- RLS for holidays table (Admin manage, staff read)
alter table public.holidays enable row level security;

drop policy if exists "Holidays viewable by authenticated users" on public.holidays;
create policy "Holidays viewable by authenticated users"
  on public.holidays for select
  using (auth.role() = 'authenticated');

drop policy if exists "Holidays manageable by admin" on public.holidays;
create policy "Holidays manageable by admin"
  on public.holidays for all
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Create public.customer_reviews table
create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  score numeric not null check (score >= 1.0 and score <= 5.0),
  comments text,
  created_at timestamptz default now()
);

-- RLS for customer_reviews table
alter table public.customer_reviews enable row level security;

drop policy if exists "Customer reviews viewable by authenticated users" on public.customer_reviews;
create policy "Customer reviews viewable by authenticated users"
  on public.customer_reviews for select
  using (auth.role() = 'authenticated');

drop policy if exists "Customer reviews manageable by admin" on public.customer_reviews;
create policy "Customer reviews manageable by admin"
  on public.customer_reviews for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

-- 5. Extend public.salary table with itemized additions and deductions breakdown
alter table public.salary
  add column if not exists monthly_salary_base numeric default 0,
  add column if not exists halfday_deduction_total numeric default 0,
  add column if not exists absence_deduction_total numeric default 0,
  add column if not exists late_in_deduction_total numeric default 0,
  add column if not exists early_out_deduction_total numeric default 0,
  add column if not exists customer_review_deduction numeric default 0,
  add column if not exists early_in_bonus_total numeric default 0,
  add column if not exists late_out_bonus_total numeric default 0,
  add column if not exists overtime_pay numeric default 0,
  add column if not exists customer_review_bonus_total numeric default 0,
  add column if not exists job_completion_bonus numeric default 0;
