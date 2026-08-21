-- Migration: 20260804000002_react_doctor_security_fixes.sql
-- Description: Security fixes to resolve react-doctor warnings and ensure comprehensive RLS coverage.

-- 1. Create a secure RPC for updating push tokens to avoid direct client UPDATEs on the users table
CREATE OR REPLACE FUNCTION public.update_my_push_token(new_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.users 
  SET expo_push_token = new_token
  WHERE id = auth.uid();
END;
$$;

-- 2. Explicitly enable Row Level Security on ALL tables in the public schema
-- This acts as a catch-all to prevent react-doctor/supabase-table-missing-rls
DO $$ 
DECLARE
  t record;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Double-check that sensitive data tables are strictly admin-only
-- (These were largely covered in previous migrations, but this reinforces the policy for react-doctor/supabase-sensitive-data-leak)
DO $$
BEGIN
  -- We assume public.is_admin() exists from 20260728000001_fix_users_rls_recursion.sql
  
  -- Salary
  DROP POLICY IF EXISTS "Salary strict admin only" ON public.salary;
  CREATE POLICY "Salary strict admin only" ON public.salary FOR ALL USING (public.is_admin());

  -- Staff Rates
  DROP POLICY IF EXISTS "Staff rates strict admin only" ON public.staff_rates;
  CREATE POLICY "Staff rates strict admin only" ON public.staff_rates FOR ALL USING (public.is_admin());

  -- Payments
  DROP POLICY IF EXISTS "Payments strict admin only" ON public.payments;
  CREATE POLICY "Payments strict admin only" ON public.payments FOR ALL USING (public.is_admin());
  
  -- Payroll Audit Log
  DROP POLICY IF EXISTS "payroll_audit_log_admin_all" ON public.payroll_audit_log;
  CREATE POLICY "payroll_audit_log_admin_all" ON public.payroll_audit_log FOR ALL USING (public.is_admin());
END $$;
