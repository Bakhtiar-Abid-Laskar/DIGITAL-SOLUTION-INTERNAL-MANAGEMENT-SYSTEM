-- Migration: 20260801000008_feed_july_salary_arshad
-- Description: Seed salary data for receptionist Arshad for July 2026

DELETE FROM public.salary 
WHERE user_id = '7a6f3217-fd6c-490b-b5a6-191c1d385029' 
  AND month = '2026-07-01';

INSERT INTO public.salary (
  user_id,
  month,
  base_daily_rate,
  working_days,
  present_days,
  halfday_count,
  leave_count,
  ot_hours,
  ot_rate_per_hour,
  early_hours,
  early_deduction_per_hour,
  advance_deducted,
  gross_salary,
  net_salary,
  monthly_salary_base,
  halfday_deduction_total,
  absence_deduction_total,
  late_in_deduction_total,
  early_out_deduction_total,
  customer_review_deduction,
  early_in_bonus_total,
  late_out_bonus_total,
  overtime_pay,
  customer_review_bonus_total,
  job_completion_bonus,
  incentive_amount,
  bonus_amount,
  leave_deduction,
  late_deduction,
  early_deduction,
  status
) VALUES (
  '7a6f3217-fd6c-490b-b5a6-191c1d385029',
  '2026-07-01',
  500,     -- base_daily_rate
  26,      -- working_days
  24,      -- present_days
  1,       -- halfday_count
  1,       -- leave_count
  10,      -- ot_hours
  100,     -- ot_rate_per_hour
  0,       -- early_hours
  0,       -- early_deduction_per_hour
  0,       -- advance_deducted
  16500,   -- gross_salary
  16360,   -- net_salary
  15000,   -- monthly_salary_base
  80,      -- halfday_deduction_total
  0,       -- absence_deduction_total
  60,      -- late_in_deduction_total
  0,       -- early_out_deduction_total
  0,       -- customer_review_deduction
  0,       -- early_in_bonus_total
  0,       -- late_out_bonus_total
  1000,    -- overtime_pay
  0,       -- customer_review_bonus_total
  0,       -- job_completion_bonus
  500,     -- incentive_amount
  0,       -- bonus_amount
  0,       -- leave_deduction
  60,      -- late_deduction
  0,       -- early_deduction
  'paid'   -- status
);
