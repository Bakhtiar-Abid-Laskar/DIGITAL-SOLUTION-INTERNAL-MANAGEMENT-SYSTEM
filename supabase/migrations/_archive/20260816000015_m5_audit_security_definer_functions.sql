-- M5. Audit and secure all SECURITY DEFINER functions
-- 1. The original 29 functions were already secured by migration 20260814000002_fix_function_search_path.sql
-- 2. The new functions introduced in H5, H6, and H7 lack the search_path guard.
-- We apply SET search_path = public, pg_temp to prevent schema-hijacking SQL injection.

alter function public.process_inventory_stock_change()
  set search_path = public, pg_temp;

alter function public.accrue_incentives()
  set search_path = public, pg_temp;

alter function public.audit_employee_leave_changes()
  set search_path = public, pg_temp;
