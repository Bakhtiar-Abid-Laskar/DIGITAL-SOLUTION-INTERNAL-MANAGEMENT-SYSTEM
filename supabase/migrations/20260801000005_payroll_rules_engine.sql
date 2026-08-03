-- Migration: 20260801000005_payroll_rules_engine
-- Description: Full Payroll Rules Engine schema extension
-- Extends staff_rates, salary; creates employee_bonus, employee_leave, payroll_audit_log

-- =============================================================
-- 1. Extend staff_rates with full payroll profile
-- =============================================================
alter table public.staff_rates
  add column if not exists preferred_checkin  text default '10:30',
  add column if not exists preferred_checkout text default '19:00',
  add column if not exists late_penalty_enabled    boolean default false,
  add column if not exists early_penalty_enabled   boolean default false,
  add column if not exists maximum_daily_penalty   numeric default 0 check (maximum_daily_penalty >= 0),
  add column if not exists incentive_enabled       boolean default true,
  add column if not exists bonus_enabled           boolean default false,
  add column if not exists payroll_active          boolean default true,
  -- Configurable penalty tiers (admin sets, NOT hardcoded)
  add column if not exists late_tier1_minutes  integer default 60  check (late_tier1_minutes >= 0),
  add column if not exists late_tier1_amount   numeric default 0   check (late_tier1_amount >= 0),
  add column if not exists late_tier2_amount   numeric default 0   check (late_tier2_amount >= 0),
  add column if not exists early_tier1_minutes integer default 60  check (early_tier1_minutes >= 0),
  add column if not exists early_tier1_amount  numeric default 0   check (early_tier1_amount >= 0),
  add column if not exists early_tier2_amount  numeric default 0   check (early_tier2_amount >= 0);

-- =============================================================
-- 2. Extend salary table with full breakdown columns + status
-- =============================================================
alter table public.salary
  add column if not exists bonus_amount       numeric default 0,
  add column if not exists leave_deduction    numeric default 0,
  add column if not exists late_deduction     numeric default 0,
  add column if not exists early_deduction    numeric default 0,
  add column if not exists status             text default 'draft' check (status in ('draft', 'paid')),
  add column if not exists generated_by       uuid references public.users(id) on delete set null,
  add column if not exists paid_at            timestamptz;

-- =============================================================
-- 3. Create employee_bonus table
-- =============================================================
create table if not exists public.employee_bonus (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  amount      numeric not null check (amount > 0),
  reason      text not null,
  month       integer not null check (month between 1 and 12),
  year        integer not null check (year >= 2020),
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz default now()
);

alter table public.employee_bonus enable row level security;

-- Admin: full access
drop policy if exists "employee_bonus_admin_all" on public.employee_bonus;
create policy "employee_bonus_admin_all" on public.employee_bonus
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

-- Staff: read own bonuses only
drop policy if exists "employee_bonus_user_read" on public.employee_bonus;
create policy "employee_bonus_user_read" on public.employee_bonus
  for select to authenticated
  using (user_id = auth.uid());

-- =============================================================
-- 4. Create employee_leave table
-- =============================================================
create table if not exists public.employee_leave (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  leave_date  date not null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason      text,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at  timestamptz default now()
);

alter table public.employee_leave enable row level security;

-- Admin: full access
drop policy if exists "employee_leave_admin_all" on public.employee_leave;
create policy "employee_leave_admin_all" on public.employee_leave
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

-- Staff: read own leaves + insert own pending leave
drop policy if exists "employee_leave_user_read" on public.employee_leave;
create policy "employee_leave_user_read" on public.employee_leave
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "employee_leave_user_insert" on public.employee_leave;
create policy "employee_leave_user_insert" on public.employee_leave
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );

-- =============================================================
-- 5. Create payroll_audit_log table
-- =============================================================
create table if not exists public.payroll_audit_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete set null,  -- subject staff
  action       text not null check (action in (
    'bonus_added', 'advance_added', 'leave_approved', 'leave_rejected',
    'payroll_generated', 'payroll_marked_paid', 'manual_adjustment', 'payroll_regenerated'
  )),
  details      jsonb,
  performed_by uuid references public.users(id) on delete set null,
  created_at   timestamptz default now()
);

alter table public.payroll_audit_log enable row level security;

-- Admin: full access only (staff cannot read audit log)
drop policy if exists "payroll_audit_log_admin_all" on public.payroll_audit_log;
create policy "payroll_audit_log_admin_all" on public.payroll_audit_log
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );
