-- Resolve PostgREST PGRST203 function overloading by using a unique name
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
  v_clean TEXT := regexp_replace(coalesce(p_query, ''), '\D', '', 'g');
  v_q TEXT := trim(coalesce(p_query, ''));
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
     OR c.name ILIKE ('%' || v_q || '%')
     OR regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') LIKE ('%' || v_clean || '%')
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_customers_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_customers_v2 TO anon;
