-- ============================================================================
-- Migration: 20260905151500_fix_search_customers_v2.sql
-- Description: Fix critical search bug in search_customers_v2 where empty v_clean
--              matched all customers via LIKE '%%', and add email, gstin, address
--              searching plus count_customers_v2 companion RPC.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_customers_v2(
  p_query TEXT DEFAULT '',
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  address TEXT,
  total_jobs BIGINT,
  total_sales BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw TEXT := trim(coalesce(p_query, ''));
  v_clean TEXT := regexp_replace(v_raw, '\D', '', 'g');
  v_clean_no_zero TEXT := regexp_replace(v_clean, '^0+', '');
  v_q TEXT := v_raw;
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.gstin,
    c.address,
    COALESCE(j_cnt.cnt, 0)::BIGINT AS total_jobs,
    COALESCE(s_cnt.cnt, 0)::BIGINT AS total_sales,
    c.created_at,
    c.updated_at
  FROM public.customers c
  LEFT JOIN (
    SELECT customer_id, count(public.jobs.id) as cnt FROM public.jobs GROUP BY customer_id
  ) j_cnt ON j_cnt.customer_id = c.id
  LEFT JOIN (
    SELECT customer_id, count(public.invoices.id) as cnt FROM public.invoices GROUP BY customer_id
  ) s_cnt ON s_cnt.customer_id = c.id
  WHERE v_q = ''
     OR (
       c.name ILIKE ('%' || v_q || '%')
       OR (v_clean <> '' AND (
            regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') LIKE ('%' || v_clean || '%')
            OR (v_clean_no_zero <> '' AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') LIKE ('%' || v_clean_no_zero || '%'))
            OR c.phone ILIKE ('%' || v_q || '%')
       ))
       OR c.email ILIKE ('%' || v_q || '%')
       OR c.gstin ILIKE ('%' || v_q || '%')
       OR c.address ILIKE ('%' || v_q || '%')
     )
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_customers_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_customers_v2 TO anon;

-- Companion count function for accurate pagination during search
CREATE OR REPLACE FUNCTION public.count_customers_v2(
  p_query TEXT DEFAULT ''
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw TEXT := trim(coalesce(p_query, ''));
  v_clean TEXT := regexp_replace(v_raw, '\D', '', 'g');
  v_clean_no_zero TEXT := regexp_replace(v_clean, '^0+', '');
  v_q TEXT := v_raw;
  v_count BIGINT;
BEGIN
  SELECT count(*)
  INTO v_count
  FROM public.customers c
  WHERE v_q = ''
     OR (
       c.name ILIKE ('%' || v_q || '%')
       OR (v_clean <> '' AND (
            regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') LIKE ('%' || v_clean || '%')
            OR (v_clean_no_zero <> '' AND regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') LIKE ('%' || v_clean_no_zero || '%'))
            OR c.phone ILIKE ('%' || v_q || '%')
       ))
       OR c.email ILIKE ('%' || v_q || '%')
       OR c.gstin ILIKE ('%' || v_q || '%')
       OR c.address ILIKE ('%' || v_q || '%')
     );
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_customers_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_customers_v2 TO anon;
