-- ============================================================================
-- REPAIRSHOP — PERFORMANCE OPTIMIZATION PHASE 2
-- Migration: 20260906165500_performance_phase2_pending_invoices_rpc.sql
--
-- 1. Adds functional partial index on invoices for pending balance
-- 2. Creates get_pending_invoices() RPC that filters at the database engine,
--    eliminating the unbounded full-table scans on web and mobile.
-- ============================================================================

-- 1. Partial Index for Fast Filtering of Unsettled Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_pending_balance 
  ON public.invoices ((grand_total - amount_paid)) 
  WHERE status != 'cancelled' AND grand_total > 0;

-- 2. High-Performance Pending Invoices Retrieval RPC
CREATE OR REPLACE FUNCTION public.get_pending_invoices(
  p_search TEXT DEFAULT '',
  p_limit INT DEFAULT NULL,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  invoice_code TEXT,
  customer_id UUID,
  customer_name TEXT,
  customer_contact TEXT,
  status TEXT,
  grand_total NUMERIC,
  amount_paid NUMERIC,
  balance NUMERIC,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  job_id UUID,
  job_code TEXT,
  job_customer_name TEXT,
  job_customer_contact TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT := trim(coalesce(p_search, ''));
  v_clean TEXT := regexp_replace(v_q, '\D', '', 'g');
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.invoice_code,
    i.customer_id,
    i.customer_name,
    i.customer_contact,
    i.status,
    i.grand_total,
    i.amount_paid,
    (i.grand_total - i.amount_paid) AS balance,
    i.created_at,
    i.paid_at,
    i.job_id,
    j.job_code,
    j.customer_name AS job_customer_name,
    j.customer_contact AS job_customer_contact
  FROM public.invoices i
  LEFT JOIN public.jobs j ON j.id = i.job_id
  WHERE i.grand_total > 0
    AND i.status != 'cancelled'
    AND (i.grand_total - i.amount_paid) > 0
    AND (
      v_q = ''
      OR i.invoice_code ILIKE ('%' || v_q || '%')
      OR i.customer_name ILIKE ('%' || v_q || '%')
      OR (v_clean <> '' AND regexp_replace(coalesce(i.customer_contact, ''), '\D', '', 'g') LIKE ('%' || v_clean || '%'))
      OR (j.job_code IS NOT NULL AND j.job_code ILIKE ('%' || v_q || '%'))
      OR (j.customer_name IS NOT NULL AND j.customer_name ILIKE ('%' || v_q || '%'))
    )
  ORDER BY (i.grand_total - i.amount_paid) DESC, i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_invoices(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_invoices(TEXT, INT, INT) TO anon;
