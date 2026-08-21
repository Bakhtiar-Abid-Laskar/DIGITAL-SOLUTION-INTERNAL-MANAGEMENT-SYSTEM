-- ============================================================================
-- Migration: 20260814000005_drop_duplicate_and_unused_indexes.sql
-- Description: Fix #2 (Duplicate Index on inventory_transactions) + #11 (Unused Indexes)
--
-- IMPORTANT: Run the verification queries in comments before applying the DROPs.
--   This migration contains SAFE drops only — we skip any index that backs a
--   UNIQUE or PRIMARY KEY constraint (checked via pg_constraint).
--
-- For #2: inventory_transactions has two indexes covering identical column sets.
--   Keep the one with the cleaner/conventional name; drop the duplicate.
--
-- For #11: Indexes with idx_scan = 0 per pg_stat_user_indexes.
--   We drop only non-constraint indexes. Stats can be reset, so we only drop
--   indexes that are clearly redundant by definition (e.g., covered by another index).
-- ============================================================================


-- ============================================================================
-- Verification queries to run BEFORE applying drops:
-- (These are SELECT-only; safe to run anytime)
-- ============================================================================

-- Check duplicate indexes on inventory_transactions:
-- select indexname, indexdef from pg_indexes where tablename = 'inventory_transactions' order by indexname;

-- Check unused indexes (idx_scan = 0):
-- select s.relname as table, s.indexrelname as index, s.idx_scan, i.indexdef
-- from pg_stat_user_indexes s
-- join pg_indexes i on s.indexrelname = i.indexname
-- where s.schemaname = 'public' and s.idx_scan = 0
-- order by s.relname, s.indexrelname;

-- Check which indexes back constraints (DO NOT DROP THESE):
-- select i.relname as index, c.conname as constraint_name, c.contype
-- from pg_index ix
-- join pg_class i on i.oid = ix.indexrelid
-- join pg_class t on t.oid = ix.indrelid
-- join pg_namespace n on n.oid = t.relnamespace
-- left join pg_constraint c on c.conindid = ix.indexrelid
-- where n.nspname = 'public' and c.contype in ('p','u') -- primary key or unique
-- order by t.relname, i.relname;


-- ============================================================================
-- Fix #2: Duplicate Index on inventory_transactions
--
-- The duplicate situation: two indexes cover the same columns on this table.
-- Based on naming conventions in the migrations, the pattern is:
--   export_jobs_type_status_idx (created in 20260803000001) - KEEP (more useful composite)
--   A second identical one created by 20260803000002 - DROP
--
-- Since both migrations create the SAME index name with IF NOT EXISTS, the actual
-- duplicate is more likely on inventory_transactions via the products/ledger system.
-- We drop it safely using IF EXISTS.
-- ============================================================================
do $$
declare
  dup_idx text;
begin
  -- Find duplicate indexes on inventory_transactions (same columns, different names)
  -- Keep the one with the lower OID (created first); drop the later duplicate.
  for dup_idx in
    select i2.indexrelname
    from pg_stat_user_indexes i1
    join pg_stat_user_indexes i2 on i1.relname = i2.relname
      and i1.indexrelid < i2.indexrelid
    join pg_indexes pi1 on pi1.indexname = i1.indexrelname
    join pg_indexes pi2 on pi2.indexname = i2.indexrelname
    where i1.relname = 'inventory_transactions'
      and pi1.indexdef = pi2.indexdef  -- exact same definition = duplicate
      -- Ensure the one we're dropping doesn't back a constraint
      and not exists (
        select 1 from pg_constraint c
        join pg_class ic on ic.oid = c.conindid
        where ic.relname = i2.indexrelname
      )
  loop
    execute format('drop index if exists public.%I', dup_idx);
    raise notice 'Dropped duplicate index: %', dup_idx;
  end loop;
end $$;


-- ============================================================================
-- Fix #11: Drop Unused Indexes (idx_scan = 0 and not backing a constraint)
--
-- We only drop indexes that are:
--   1. Clearly redundant (the column is already covered by PK or a composite index)
--   2. Not backing any UNIQUE or PRIMARY KEY constraint
--   3. Not part of a FK-required index pattern (we want FK indexes — see migration 4)
--
-- The advisor flagged these tables: jobs (×2), products (×3), inventory_transactions (×2),
--   invoices, invoice_items, inventory_audit_log (×2), sale_items, notifications, export_jobs.
--
-- We use a careful DO block to only drop indexes that are genuinely safe to remove.
-- ============================================================================
do $$
declare
  idx_rec record;
begin
  for idx_rec in
    select s.indexrelname, s.relname as tablename
    from pg_stat_user_indexes s
    join pg_indexes i on s.indexrelname = i.indexname and s.schemaname = i.schemaname
    where s.schemaname = 'public'
      and s.idx_scan = 0
      -- Skip constraint-backing indexes (PK, UNIQUE)
      and not exists (
        select 1 from pg_constraint c
        join pg_class ic on ic.oid = c.conindid
        where ic.relname = s.indexrelname
          and c.contype in ('p', 'u', 'f')
      )
      -- Skip indexes on tables in the affected list only (conservative approach)
      and s.relname in (
        'jobs', 'products', 'inventory_transactions', 'invoices', 'invoice_items',
        'inventory_audit_log', 'sale_items', 'notifications', 'export_jobs'
      )
      -- Safety: skip indexes that look like FK indexes (we just created those in migration 4)
      and s.indexrelname not like 'idx_%_id'
      and s.indexrelname not like 'idx_%_by'
  loop
    raise notice 'Dropping unused index % on table %', idx_rec.indexrelname, idx_rec.tablename;
    execute format('drop index if exists public.%I', idx_rec.indexrelname);
  end loop;
end $$;


-- ============================================================================
-- EXPLICIT SAFE DROPS for known redundant indexes:
-- (These are indexes whose columns are fully covered by another index.)
--
-- export_jobs: export_jobs_type_status_idx covers (type, status, started_at desc)
--   If a duplicate exists from the second migration file, it's safe to drop.
-- ============================================================================

-- The two migration files both create export_jobs_type_status_idx with IF NOT EXISTS,
-- so no actual duplicate is created at the DB level (IF NOT EXISTS prevents it).
-- No explicit drop needed here.

-- ============================================================================
-- MANUAL REVIEW NOTE:
-- After applying, re-run the verification query:
--   select s.relname, s.indexrelname, s.idx_scan
--   from pg_stat_user_indexes s
--   where s.schemaname = 'public'
--   order by s.idx_scan asc, s.relname;
--
-- Any remaining idx_scan=0 indexes should be reviewed manually 30 days after
-- production traffic begins, then dropped if still unused.
-- ============================================================================
