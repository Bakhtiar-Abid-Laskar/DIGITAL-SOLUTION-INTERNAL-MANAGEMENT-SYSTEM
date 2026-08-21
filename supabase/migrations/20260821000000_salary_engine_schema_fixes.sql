-- ============================================================================
-- REPAIRSHOP — SALARY ENGINE SCHEMA FIXES
-- Migration: 20260821000000_salary_engine_schema_fixes.sql
--
-- Fixes 5 defects found in Phase 0 audit:
--   1. employee_leave missing approved_at
--   2. staff_rates missing penalty_tier1_amount, penalty_tier2_amount
--   3. staff_rates missing max_leave_allowed
--   4. salary missing snapshot columns for leave thresholds
--   5. Hard-block DB trigger: prevent attendance insert on approved leave day
--   6. RLS: staff can read own staff_rates row
-- ============================================================================


-- ============================================================================
-- 1. employee_leave — add approved_at
-- ============================================================================
alter table public.employee_leave
  add column if not exists approved_at timestamptz;


-- ============================================================================
-- 2. staff_rates — add penalty tier columns
--    These were read/written by Edge Function and StaffRateForm but missing
--    from the table definition. Silently dropped on every save until now.
-- ============================================================================
alter table public.staff_rates
  add column if not exists penalty_tier1_amount numeric default 30
    check (penalty_tier1_amount >= 0);

alter table public.staff_rates
  add column if not exists penalty_tier2_amount numeric default 60
    check (penalty_tier2_amount >= 0);


-- ============================================================================
-- 3. staff_rates — add max_leave_allowed
--    Governs the threshold-breach rule:
--    if (leave_count + absent_count) > max_leave_allowed then
--      ALL leave+absent days are charged at absent_day_deduction rate
--    Default is 1 (confirmed by user).
-- ============================================================================
alter table public.staff_rates
  add column if not exists max_leave_allowed integer default 1
    check (max_leave_allowed >= 0);


-- ============================================================================
-- 4. salary — add snapshot columns
--    Preserve the rate parameters used at calculation time so historical
--    records remain consistent even if admin later changes staff_rates.
-- ============================================================================
alter table public.salary
  add column if not exists allowed_leave_days_snap  integer default 0;

alter table public.salary
  add column if not exists max_leave_allowed_snap   integer default 0;

alter table public.salary
  add column if not exists threshold_breached       boolean default false;


-- ============================================================================
-- 5. Hard-block trigger: BEFORE INSERT on attendance
--    Rejects the insert if the employee has an approved leave for that date.
--    This is a DB-level enforcement — cannot be bypassed from the client.
-- ============================================================================
create or replace function public.block_attendance_on_approved_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if an approved leave exists for this user on this date
  if exists (
    select 1
    from public.employee_leave
    where user_id   = new.user_id
      and leave_date = new.date
      and status     = 'approved'
  ) then
    raise exception
      'LEAVE_CONFLICT: You have an approved leave for %. Attendance cannot be marked on a leave day. Please contact your admin to cancel the leave first.',
      new.date;
  end if;

  return new;
end;
$$;

-- Drop if exists to allow re-runs
drop trigger if exists trg_block_attendance_on_leave on public.attendance;

create trigger trg_block_attendance_on_leave
before insert on public.attendance
for each row
execute function public.block_attendance_on_approved_leave();


-- ============================================================================
-- 6. RLC helper RPC: check_leave_conflict
--    Client-side use: call before showing the check-in button to display
--    a clear UI message. Returns true if a conflict exists.
-- ============================================================================
create or replace function public.check_leave_conflict(
  p_user_id uuid,
  p_date    date
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_leave
    where user_id   = p_user_id
      and leave_date = p_date
      and status     = 'approved'
  );
$$;

grant execute on function public.check_leave_conflict(uuid, date) to authenticated;


-- ============================================================================
-- 7. RLS — staff_rates: allow staff to SELECT their own row
--    Without this, SalaryRatesCard on mobile shows nothing for non-admins.
--    The existing admin-only policy covers all operations; this adds SELECT
--    for own row only.
-- ============================================================================
drop policy if exists "staff_rates_own_read" on public.staff_rates;

create policy "staff_rates_own_read"
  on public.staff_rates
  for select
  to authenticated
  using (user_id = (select auth.uid()));


-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
