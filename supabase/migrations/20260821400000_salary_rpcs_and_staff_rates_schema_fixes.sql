-- ============================================================================
-- REPAIRSHOP — SALARY RPCS & STAFF RATES SCHEMA FIXES
-- Migration: 20260821400000_salary_rpcs_and_staff_rates_schema_fixes.sql
--
-- Fixes:
--   1. staff_rates missing absent_day_deduction, allowed_leave_days, base_pay
--   2. payroll_audit_log missing details and performed_by columns
--   3. record_advance_salary RPC function missing from schema
--   4. record_bonus RPC function missing from schema
--   5. Grants execute permissions on payroll RPCs to authenticated role
-- ============================================================================

-- ============================================================================
-- 1. staff_rates — Add missing deduction and rate columns
-- ============================================================================
alter table public.staff_rates
  add column if not exists absent_day_deduction numeric default 0
    check (absent_day_deduction >= 0);

alter table public.staff_rates
  add column if not exists allowed_leave_days integer default 2
    check (allowed_leave_days >= 0);

alter table public.staff_rates
  add column if not exists base_pay numeric default 0
    check (base_pay >= 0);

alter table public.staff_rates
  add column if not exists penalty_tier1_amount numeric default 30
    check (penalty_tier1_amount >= 0);

alter table public.staff_rates
  add column if not exists penalty_tier2_amount numeric default 60
    check (penalty_tier2_amount >= 0);

alter table public.staff_rates
  add column if not exists max_leave_allowed integer default 1
    check (max_leave_allowed >= 0);


-- ============================================================================
-- 2. payroll_audit_log — Add missing details & performed_by columns
-- ============================================================================
alter table public.payroll_audit_log
  add column if not exists details jsonb;

alter table public.payroll_audit_log
  add column if not exists performed_by uuid references public.users(id);


-- ============================================================================
-- 3. record_advance_salary — Security Definer RPC
-- ============================================================================
create or replace function public.record_advance_salary(
  p_user_id     uuid,
  p_amount      numeric,
  p_description text default null,
  p_date        text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id   uuid;
  v_is_admin    boolean;
  v_payment     public.payments;
  v_created_at  timestamptz;
  v_details     jsonb;
begin
  v_caller_id := auth.uid();
  
  -- Verify caller is authenticated active admin
  select exists (
    select 1 from public.users
    where id = v_caller_id and role = 'admin' and is_active = true
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'UNAUTHORIZED: Only active administrators can record advance salary payments.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: Advance salary amount must be greater than zero.';
  end if;

  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'USER_NOT_FOUND: Selected staff member does not exist.';
  end if;

  if p_date is not null and trim(p_date) <> '' then
    begin
      v_created_at := p_date::timestamptz;
    exception when others then
      v_created_at := now();
    end;
  else
    v_created_at := now();
  end if;

  insert into public.payments (
    type,
    amount,
    description,
    user_id,
    created_by,
    created_at
  ) values (
    'advance_salary',
    p_amount,
    p_description,
    p_user_id,
    v_caller_id,
    v_created_at
  ) returning * into v_payment;

  -- Audit log entry
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payroll_audit_log') then
    v_details := jsonb_build_object(
      'payment_id', v_payment.id,
      'amount', p_amount,
      'description', p_description,
      'date', v_created_at
    );

    insert into public.payroll_audit_log (
      user_id,
      action,
      details,
      new_snapshot,
      performed_by,
      changed_by
    ) values (
      p_user_id,
      'advance_added',
      v_details,
      v_details,
      v_caller_id,
      v_caller_id
    );
  end if;

  return v_payment;
end;
$$;

revoke execute on function public.record_advance_salary(uuid, numeric, text, text) from public;
revoke execute on function public.record_advance_salary(uuid, numeric, text, text) from anon;
grant execute on function public.record_advance_salary(uuid, numeric, text, text) to authenticated;


-- ============================================================================
-- 4. record_bonus — Security Definer RPC
-- ============================================================================
create or replace function public.record_bonus(
  p_user_id uuid,
  p_amount  numeric,
  p_reason  text,
  p_month   integer,
  p_year    integer
)
returns public.employee_bonus
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_is_admin  boolean;
  v_bonus     public.employee_bonus;
  v_details   jsonb;
begin
  v_caller_id := auth.uid();

  -- Verify caller is authenticated active admin
  select exists (
    select 1 from public.users
    where id = v_caller_id and role = 'admin' and is_active = true
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'UNAUTHORIZED: Only active administrators can record employee bonuses.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: Bonus amount must be greater than zero.';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'INVALID_REASON: Bonus reason is required.';
  end if;

  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'INVALID_MONTH: Month must be between 1 and 12.';
  end if;

  if p_year is null or p_year < 2020 then
    raise exception 'INVALID_YEAR: Year must be 2020 or later.';
  end if;

  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'USER_NOT_FOUND: Selected staff member does not exist.';
  end if;

  insert into public.employee_bonus (
    user_id,
    amount,
    reason,
    month,
    year,
    created_by,
    created_at
  ) values (
    p_user_id,
    p_amount,
    trim(p_reason),
    p_month,
    p_year,
    v_caller_id,
    now()
  ) returning * into v_bonus;

  -- Audit log entry
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payroll_audit_log') then
    v_details := jsonb_build_object(
      'bonus_id', v_bonus.id,
      'amount', p_amount,
      'reason', p_reason,
      'month', p_month,
      'year', p_year
    );

    insert into public.payroll_audit_log (
      user_id,
      action,
      details,
      new_snapshot,
      performed_by,
      changed_by
    ) values (
      p_user_id,
      'bonus_added',
      v_details,
      v_details,
      v_caller_id,
      v_caller_id
    );
  end if;

  return v_bonus;
end;
$$;

revoke execute on function public.record_bonus(uuid, numeric, text, integer, integer) from public;
revoke execute on function public.record_bonus(uuid, numeric, text, integer, integer) from anon;
grant execute on function public.record_bonus(uuid, numeric, text, integer, integer) to authenticated;
