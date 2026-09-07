-- ============================================================================
-- REPAIRSHOP — PERFORMANCE OPTIMIZATION PHASE 1
-- Migration: 20260906163500_performance_phase1_indexes.sql
--
-- 1. Adds missing B-Tree indexes on invoices & invoice_items
-- 2. Adds Trigram GIN indexes for fast ILIKE text search on jobs and invoices
-- 3. Upgrades get_job_status_counts() RPC to support 'urgent' count & technician filtering
-- ============================================================================

-- 1. Ensure pg_trgm extension is active for trigram GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- 2. B-Tree Indexes on Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_status 
  ON public.invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at_desc 
  ON public.invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id 
  ON public.invoices(customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_method 
  ON public.invoices(payment_method);

-- 3. Indexes on Invoice Items
CREATE INDEX IF NOT EXISTS idx_invoice_items_serial_number 
  ON public.invoice_items(serial_number);

-- 4. Trigram GIN Indexes for Substring Searches (%term%)
CREATE INDEX IF NOT EXISTS idx_invoices_code_trgm 
  ON public.invoices USING gin (invoice_code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_name_trgm 
  ON public.invoices USING gin (customer_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_contact_trgm 
  ON public.invoices USING gin (customer_contact gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_invoice_items_item_name_trgm 
  ON public.invoice_items USING gin (item_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_job_code_trgm 
  ON public.jobs USING gin (job_code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_name_trgm 
  ON public.jobs USING gin (customer_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_contact_trgm 
  ON public.jobs USING gin (customer_contact gin_trgm_ops);

-- 5. Upgraded High-Performance Job Status & Urgent Counts RPC
-- Consolidates up to 7 parallel queries into a single database round-trip.
CREATE OR REPLACE FUNCTION public.get_job_status_counts(p_technician_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_urgent bigint;
  v_counts jsonb;
BEGIN
  IF p_technician_id IS NOT NULL THEN
    -- Technician-filtered counts
    SELECT count(*)
    INTO v_total
    FROM public.jobs j
    JOIN public.job_technicians jt ON jt.job_id = j.id
    WHERE jt.technician_id = p_technician_id AND jt.removed_at IS NULL;

    SELECT count(*)
    INTO v_urgent
    FROM public.jobs j
    JOIN public.job_technicians jt ON jt.job_id = j.id
    WHERE jt.technician_id = p_technician_id 
      AND jt.removed_at IS NULL
      AND j.priority = 'Urgent'
      AND j.status != 'Completed';

    SELECT coalesce(jsonb_object_agg(s.status, s.count), '{}'::jsonb)
    INTO v_counts
    FROM (
      SELECT j.status, count(*) AS count
      FROM public.jobs j
      JOIN public.job_technicians jt ON jt.job_id = j.id
      WHERE jt.technician_id = p_technician_id AND jt.removed_at IS NULL
      GROUP BY j.status
    ) s;

  ELSE
    -- Global counts (Admin & Receptionist)
    SELECT count(*)
    INTO v_total
    FROM public.jobs;

    SELECT count(*)
    INTO v_urgent
    FROM public.jobs
    WHERE priority = 'Urgent' AND status != 'Completed';

    SELECT coalesce(jsonb_object_agg(status, count), '{}'::jsonb)
    INTO v_counts
    FROM (
      SELECT status, count(*) AS count
      FROM public.jobs
      GROUP BY status
    ) s;
  END IF;

  RETURN jsonb_build_object(
    'total', v_total,
    'urgent', v_urgent,
    'counts', v_counts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_job_status_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_status_counts(uuid) TO anon;
