-- Migration: Phase 2 Optimizations

-- 1. Add missing indexes to prevent sequential scans
CREATE INDEX IF NOT EXISTS idx_jobs_technician_id ON public.jobs(technician_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON public.payments(type);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone_clean ON public.customers(phone_clean);

-- 2. Update search_customers RPC to support proper pagination
CREATE OR REPLACE FUNCTION public.search_customers(
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
    SELECT customer_id, count(*)::BIGINT AS cnt 
    FROM public.jobs 
    WHERE customer_id IS NOT NULL 
    GROUP BY customer_id
  ) j_cnt ON j_cnt.customer_id = c.id
  LEFT JOIN (
    SELECT customer_id, count(*)::BIGINT AS cnt 
    FROM public.sales 
    WHERE customer_id IS NOT NULL 
    GROUP BY customer_id
  ) s_cnt ON s_cnt.customer_id = c.id
  WHERE 
    v_q = ''
    OR c.name ILIKE ('%' || v_q || '%')
    OR (length(v_clean) >= 3 AND c.phone_clean LIKE ('%' || v_clean || '%'))
    OR (c.email ILIKE ('%' || v_q || '%'))
    OR (c.gstin ILIKE ('%' || v_q || '%'))
    OR (c.address ILIKE ('%' || v_q || '%'))
  ORDER BY 
    CASE 
      WHEN c.name ILIKE (v_q || '%') THEN 1
      WHEN length(v_clean) >= 3 AND c.phone_clean LIKE (v_clean || '%') THEN 2
      WHEN c.name ILIKE ('%' || v_q || '%') THEN 3
      ELSE 4
    END,
    c.updated_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
