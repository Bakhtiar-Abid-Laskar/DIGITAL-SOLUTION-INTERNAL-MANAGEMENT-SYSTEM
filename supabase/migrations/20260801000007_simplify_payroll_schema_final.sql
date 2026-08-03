-- Migration: 20260801000007_simplify_payroll_schema_final
-- Description: Drop unused columns from staff_rates and salary to simplify payroll configuration

alter table public.staff_rates
  drop column if exists halfday_deduction,
  drop column if exists late_in_deduction,
  drop column if exists late_in_threshold_minutes,
  drop column if exists early_deduction_per_hour,
  drop column if exists early_in_bonus,
  drop column if exists late_out_bonus,
  drop column if exists customer_review_bonus,
  drop column if exists customer_review_penalty,
  drop column if exists job_completion_bonus_threshold,
  drop column if exists job_completion_bonus_amount,
  drop column if exists preferred_checkin,
  drop column if exists preferred_checkout,
  drop column if exists late_penalty_enabled,
  drop column if exists early_penalty_enabled,
  drop column if exists maximum_daily_penalty,
  drop column if exists incentive_enabled,
  drop column if exists bonus_enabled,
  drop column if exists payroll_active,
  drop column if exists late_tier1_minutes,
  drop column if exists late_tier1_amount,
  drop column if exists late_tier2_amount,
  drop column if exists early_tier1_minutes,
  drop column if exists early_tier1_amount,
  drop column if exists early_tier2_amount;
