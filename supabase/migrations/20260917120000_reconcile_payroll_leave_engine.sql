-- ============================================================================
-- REPAIRSHOP — RECONCILE PAYROLL & LEAVE ENGINE
-- Migration: 20260917120000_reconcile_payroll_leave_engine.sql
--
-- 1. Adds missing_checkout_count to public.salary to record audit snapshot of incomplete shifts
-- 2. Ensures allowed_leave_days on staff_rates defaults to 2
-- ============================================================================

-- 1. salary — add missing_checkout_count
ALTER TABLE public.salary
  ADD COLUMN IF NOT EXISTS missing_checkout_count integer DEFAULT 0;

-- 2. staff_rates — ensure allowed_leave_days defaults to 2
ALTER TABLE public.staff_rates
  ALTER COLUMN allowed_leave_days SET DEFAULT 2;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
