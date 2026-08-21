-- ============================================================================
-- Migration: 20260814000002_fix_function_search_path.sql
-- Description: Fix #4 — Set explicit search_path on all functions flagged by Supabase Advisor.
--
-- Root Cause: Functions without a fixed search_path inherit the caller's search_path,
--   which can be manipulated to inject malicious schema objects (SQL injection at the
--   schema level). Adding `set search_path = public, pg_temp` prevents this.
--
-- For functions using the products/ledger/invoice system (which may use pg_trgm or
--   extension functions), we include 'extensions' in the search_path as well.
--
-- Rules:
--   - SECURITY DEFINER status is preserved exactly as-is (not changed).
--   - Volatility, language, and argument types are preserved.
--   - We use ALTER FUNCTION ... SET search_path to avoid rewriting full bodies.
-- ============================================================================


-- ============================================================================
-- Role helper functions (already have search_path in their body; reinforce via ALTER)
-- ============================================================================
alter function public.is_admin()
  set search_path = public, pg_temp;

alter function public.is_receptionist()
  set search_path = public, pg_temp;

alter function public.is_technician()
  set search_path = public, pg_temp;

alter function public.is_staff()
  set search_path = public, pg_temp;


-- ============================================================================
-- Code generation functions
-- ============================================================================
alter function public.generate_job_code()
  set search_path = public, pg_temp;

alter function public.generate_sale_code()
  set search_path = public, pg_temp;


-- ============================================================================
-- Trigger functions — stock management
-- ============================================================================
alter function public.process_job_material_stock()
  set search_path = public, pg_temp;

alter function public.process_sale_item_stock()
  set search_path = public, pg_temp;


-- ============================================================================
-- Trigger functions — defaults and sync
-- ============================================================================
alter function public.set_job_material_defaults()
  set search_path = public, pg_temp;

alter function public.sync_sale_code_and_invoice()
  set search_path = public, pg_temp;


-- ============================================================================
-- Trigger functions — totals recalculation
-- ============================================================================
alter function public.recalculate_sale_totals()
  set search_path = public, pg_temp;


-- ============================================================================
-- Trigger functions — incentive accrual
-- ============================================================================
alter function public.accrue_job_incentives()
  set search_path = public, pg_temp;

alter function public.accrue_sale_incentives()
  set search_path = public, pg_temp;


-- ============================================================================
-- Trigger functions — job status tracking
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'update_job_status_changed_at') then
    execute 'alter function public.update_job_status_changed_at() set search_path = public, pg_temp';
  end if;
end $$;


-- ============================================================================
-- Trigger functions — multi-technician sync
-- ============================================================================
alter function public.sync_initial_technician()
  set search_path = public, pg_temp;


-- ============================================================================
-- RPC functions — inventory management (admin panel calls)
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'add_stock') then
    execute (
      select format('alter function public.add_stock(%s) set search_path = public, extensions, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'add_stock'
      limit 1
    );
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'create_product_with_opening_stock') then
    -- The function signature may vary; use a DO block to handle it safely
    execute (
      select format('alter function public.create_product_with_opening_stock(%s) set search_path = public, extensions, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'create_product_with_opening_stock'
      limit 1
    );
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'count_low_stock_items') then
    execute (
      select format('alter function public.count_low_stock_items(%s) set search_path = public, extensions, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'count_low_stock_items'
      limit 1
    );
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'get_low_stock_items') then
    execute (
      select format('alter function public.get_low_stock_items(%s) set search_path = public, extensions, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'get_low_stock_items'
      limit 1
    );
  end if;
end $$;


-- ============================================================================
-- RPC functions — material allotment (mobile app calls)
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'use_material_allotment') then
    execute (
      select format('alter function public.use_material_allotment(%s) set search_path = public, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'use_material_allotment'
      limit 1
    );
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'return_material_allotment') then
    execute (
      select format('alter function public.return_material_allotment(%s) set search_path = public, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'return_material_allotment'
      limit 1
    );
  end if;
end $$;


-- ============================================================================
-- RPC functions — invoicing / billing (admin panel calls)
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'preview_invoice') then
    execute (
      select format('alter function public.preview_invoice(%s) set search_path = public, extensions, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'preview_invoice'
      limit 1
    );
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'create_invoice') then
    execute (
      select format('alter function public.create_invoice(%s) set search_path = public, extensions, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'create_invoice'
      limit 1
    );
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'generate_invoice_code') then
    execute (
      select format('alter function public.generate_invoice_code(%s) set search_path = public, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'generate_invoice_code'
      limit 1
    );
  end if;
end $$;


-- ============================================================================
-- Functions for invoice math helpers (may reference extensions for numeric ops)
-- ============================================================================
do $$ 
declare
  fn_name text;
  fn_args text;
begin
  for fn_name, fn_args in 
    select p.proname, pg_get_function_identity_arguments(p.oid)
    from pg_proc p join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' 
      and p.proname in (
        'derive_selling_amount', 'calc_taxable_amount', 'calc_line_tax', 
        'calc_grand_total', 'derive_selling_rate'
      )
  loop
    execute format('alter function public.%I(%s) set search_path = public, extensions, pg_temp', fn_name, fn_args);
  end loop;
end $$;


-- ============================================================================
-- Ledger / audit / prevention trigger functions
-- ============================================================================
do $$
declare
  fn_name text;
  fn_args text;
begin
  for fn_name, fn_args in
    select p.proname, pg_get_function_identity_arguments(p.oid)
    from pg_proc p join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.proname in (
        'ledger_sync_inventory_quantity',
        'prevent_ledger_mutation',
        'prevent_invoice_item_mutation',
        'audit_products_changes',
        'audit_inventory_changes',
        'set_products_updated_at',
        'process_job_material_stock_v2',
        'process_job_material_stock_v3'
      )
  loop
    execute format('alter function public.%I(%s) set search_path = public, pg_temp', fn_name, fn_args);
  end loop;
end $$;


-- ============================================================================
-- Other RPC functions
-- ============================================================================
alter function public.update_my_push_token(text)
  set search_path = public, pg_temp;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'get_unique_device_types') then
    execute (
      select format('alter function public.get_unique_device_types(%s) set search_path = public, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'get_unique_device_types'
      limit 1
    );
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'invoke_whatsapp_webhook') then
    execute (
      select format('alter function public.invoke_whatsapp_webhook(%s) set search_path = public, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'invoke_whatsapp_webhook'
      limit 1
    );
  end if;
end $$;


-- Also fix get_user_role if it exists (some migrations use this name)
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
             where n.nspname = 'public' and p.proname = 'get_user_role') then
    execute (
      select format('alter function public.get_user_role(%s) set search_path = public, pg_temp',
        pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'get_user_role'
      limit 1
    );
  end if;
end $$;
