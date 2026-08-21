-- ============================================================================
-- Migration: 20260820200000_customers_module.sql
-- Description: Central Customers Entity, Search-Autofill RPCs, Backfill, and Audit Logging
-- ============================================================================

-- 1. Enable pg_trgm for high-performance fuzzy & type-ahead search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create public.customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT,
  phone_clean     TEXT GENERATED ALWAYS AS (regexp_replace(phone, '\D', '', 'g')) STORED,
  email           TEXT,
  gstin           TEXT,
  address         TEXT,
  created_via     TEXT DEFAULT 'manual' CHECK (created_via IN ('job', 'sale', 'manual', 'import', 'backfill')),
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes on customers
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_clean ON public.customers (phone_clean);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON public.customers (gstin);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON public.customers (updated_at DESC);

-- 3. Create public.customer_audit_log table
CREATE TABLE IF NOT EXISTS public.customer_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  changed_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  old_data        JSONB,
  new_data        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_audit_log_customer_id ON public.customer_audit_log (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_audit_log_created_at ON public.customer_audit_log (created_at DESC);

-- 4. Add customer foreign keys & address columns to transactional tables
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs (customer_id);

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales (customer_id);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices (customer_id);

-- 5. Non-Destructive Historical Data Backfill
DO $$
DECLARE
  r RECORD;
  v_cust_id UUID;
  v_clean_phone TEXT;
BEGIN
  -- Backfill from public.jobs (ordered newest to oldest)
  FOR r IN (
    SELECT DISTINCT ON (regexp_replace(customer_contact, '\D', '', 'g'))
      customer_name,
      customer_contact,
      customer_email,
      customer_gstin,
      created_at
    FROM public.jobs
    WHERE customer_name IS NOT NULL AND trim(customer_name) <> ''
    ORDER BY regexp_replace(customer_contact, '\D', '', 'g'), created_at DESC
  ) LOOP
    v_clean_phone := regexp_replace(coalesce(r.customer_contact, ''), '\D', '', 'g');
    IF length(v_clean_phone) = 12 AND v_clean_phone LIKE '91%' THEN
      v_clean_phone := substring(v_clean_phone FROM 3);
    ELSIF length(v_clean_phone) = 11 AND v_clean_phone LIKE '0%' THEN
      v_clean_phone := substring(v_clean_phone FROM 2);
    END IF;

    -- Check if customer already inserted
    SELECT id INTO v_cust_id FROM public.customers WHERE phone_clean = v_clean_phone LIMIT 1;
    IF v_cust_id IS NULL THEN
      INSERT INTO public.customers (
        name, phone, email, gstin, created_via, created_at, updated_at
      ) VALUES (
        trim(r.customer_name),
        nullif(trim(r.customer_contact), ''),
        nullif(trim(r.customer_email), ''),
        nullif(trim(r.customer_gstin), ''),
        'backfill',
        coalesce(r.created_at, now()),
        coalesce(r.created_at, now())
      );
    END IF;
  END LOOP;

  -- Backfill from public.sales
  FOR r IN (
    SELECT DISTINCT ON (regexp_replace(customer_contact, '\D', '', 'g'))
      customer_name,
      customer_contact,
      customer_gstin,
      created_at
    FROM public.sales
    WHERE customer_name IS NOT NULL AND trim(customer_name) <> '' AND customer_contact IS NOT NULL
    ORDER BY regexp_replace(customer_contact, '\D', '', 'g'), created_at DESC
  ) LOOP
    v_clean_phone := regexp_replace(coalesce(r.customer_contact, ''), '\D', '', 'g');
    IF length(v_clean_phone) = 12 AND v_clean_phone LIKE '91%' THEN
      v_clean_phone := substring(v_clean_phone FROM 3);
    ELSIF length(v_clean_phone) = 11 AND v_clean_phone LIKE '0%' THEN
      v_clean_phone := substring(v_clean_phone FROM 2);
    END IF;

    SELECT id INTO v_cust_id FROM public.customers WHERE phone_clean = v_clean_phone LIMIT 1;
    IF v_cust_id IS NULL THEN
      INSERT INTO public.customers (
        name, phone, gstin, created_via, created_at, updated_at
      ) VALUES (
        trim(r.customer_name),
        nullif(trim(r.customer_contact), ''),
        nullif(trim(r.customer_gstin), ''),
        'backfill',
        coalesce(r.created_at, now()),
        coalesce(r.created_at, now())
      );
    END IF;
  END LOOP;

  -- Relink existing jobs to customers
  UPDATE public.jobs j
  SET customer_id = c.id
  FROM public.customers c
  WHERE j.customer_id IS NULL
    AND c.phone_clean IS NOT NULL
    AND c.phone_clean <> ''
    AND (
      regexp_replace(coalesce(j.customer_contact, ''), '\D', '', 'g') = c.phone_clean
      OR regexp_replace(coalesce(j.customer_contact, ''), '\D', '', 'g') LIKE ('%' || c.phone_clean)
    );

  -- Relink existing sales to customers
  UPDATE public.sales s
  SET customer_id = c.id
  FROM public.customers c
  WHERE s.customer_id IS NULL
    AND c.phone_clean IS NOT NULL
    AND c.phone_clean <> ''
    AND (
      regexp_replace(coalesce(s.customer_contact, ''), '\D', '', 'g') = c.phone_clean
      OR regexp_replace(coalesce(s.customer_contact, ''), '\D', '', 'g') LIKE ('%' || c.phone_clean)
    );

  -- Relink existing invoices to customers
  UPDATE public.invoices inv
  SET customer_id = c.id
  FROM public.customers c
  WHERE inv.customer_id IS NULL
    AND c.phone_clean IS NOT NULL
    AND c.phone_clean <> ''
    AND (
      regexp_replace(coalesce(inv.customer_contact, ''), '\D', '', 'g') = c.phone_clean
      OR regexp_replace(coalesce(inv.customer_contact, ''), '\D', '', 'g') LIKE ('%' || c.phone_clean)
    );
END $$;

-- 6. Shared Search RPC: search_customers
CREATE OR REPLACE FUNCTION public.search_customers(
  p_query TEXT DEFAULT '',
  p_limit INT DEFAULT 10
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
  LIMIT p_limit;
END;
$$;

-- 7. Shared Upsert RPC: find_or_create_customer
CREATE OR REPLACE FUNCTION public.find_or_create_customer(
  p_customer_id UUID DEFAULT NULL,
  p_name        TEXT DEFAULT NULL,
  p_phone       TEXT DEFAULT NULL,
  p_email       TEXT DEFAULT NULL,
  p_gstin       TEXT DEFAULT NULL,
  p_address     TEXT DEFAULT NULL,
  p_created_via TEXT DEFAULT 'manual',
  p_user_id     UUID DEFAULT NULL
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_clean_phone TEXT := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_old_data JSONB;
  v_caller_id UUID := coalesce(p_user_id, auth.uid());
BEGIN
  -- Normalize 10-digit Indian phone number
  IF length(v_clean_phone) = 12 AND v_clean_phone LIKE '91%' THEN
    v_clean_phone := substring(v_clean_phone FROM 3);
  ELSIF length(v_clean_phone) = 11 AND v_clean_phone LIKE '0%' THEN
    v_clean_phone := substring(v_clean_phone FROM 2);
  END IF;

  -- 1. If explicit customer ID provided, find and update
  IF p_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id;
    IF FOUND THEN
      v_old_data := to_jsonb(v_customer);
      UPDATE public.customers
      SET
        name = coalesce(nullif(trim(p_name), ''), v_customer.name),
        phone = coalesce(nullif(trim(p_phone), ''), v_customer.phone),
        email = coalesce(nullif(trim(p_email), ''), v_customer.email),
        gstin = coalesce(nullif(trim(p_gstin), ''), v_customer.gstin),
        address = coalesce(nullif(trim(p_address), ''), v_customer.address),
        updated_at = now()
      WHERE id = p_customer_id
      RETURNING * INTO v_customer;

      INSERT INTO public.customer_audit_log (customer_id, action, changed_by, old_data, new_data)
      VALUES (v_customer.id, 'UPDATE', v_caller_id, v_old_data, to_jsonb(v_customer));

      RETURN v_customer;
    END IF;
  END IF;

  -- 2. Try matching existing customer by clean phone (if valid length >= 7)
  IF length(v_clean_phone) >= 7 THEN
    SELECT * INTO v_customer 
    FROM public.customers 
    WHERE phone_clean = v_clean_phone OR phone_clean LIKE ('%' || v_clean_phone)
    LIMIT 1;

    IF FOUND THEN
      v_old_data := to_jsonb(v_customer);
      UPDATE public.customers
      SET
        name = coalesce(nullif(trim(p_name), ''), v_customer.name),
        email = coalesce(nullif(trim(p_email), ''), v_customer.email),
        gstin = coalesce(nullif(trim(p_gstin), ''), v_customer.gstin),
        address = coalesce(nullif(trim(p_address), ''), v_customer.address),
        updated_at = now()
      WHERE id = v_customer.id
      RETURNING * INTO v_customer;

      INSERT INTO public.customer_audit_log (customer_id, action, changed_by, old_data, new_data)
      VALUES (v_customer.id, 'UPDATE', v_caller_id, v_old_data, to_jsonb(v_customer));

      RETURN v_customer;
    END IF;
  END IF;

  -- 3. Otherwise create new customer
  INSERT INTO public.customers (
    name,
    phone,
    email,
    gstin,
    address,
    created_via,
    created_by
  ) VALUES (
    trim(coalesce(nullif(trim(p_name), ''), 'Walk-in Customer')),
    nullif(trim(p_phone), ''),
    nullif(trim(p_email), ''),
    nullif(trim(p_gstin), ''),
    nullif(trim(p_address), ''),
    p_created_via,
    v_caller_id
  )
  RETURNING * INTO v_customer;

  INSERT INTO public.customer_audit_log (customer_id, action, changed_by, old_data, new_data)
  VALUES (v_customer.id, 'CREATE', v_caller_id, NULL, to_jsonb(v_customer));

  RETURN v_customer;
END;
$$;

-- 8. Customer Profile Update RPC (Used directly from Customers Directory Edit View)
CREATE OR REPLACE FUNCTION public.update_customer_profile(
  p_customer_id UUID,
  p_name        TEXT,
  p_phone       TEXT DEFAULT NULL,
  p_email       TEXT DEFAULT NULL,
  p_gstin       TEXT DEFAULT NULL,
  p_address     TEXT DEFAULT NULL,
  p_user_id     UUID DEFAULT NULL
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_old_data JSONB;
  v_caller_id UUID := coalesce(p_user_id, auth.uid());
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer ID is required.';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Customer name cannot be empty.';
  END IF;

  SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found.';
  END IF;

  v_old_data := to_jsonb(v_customer);

  UPDATE public.customers
  SET
    name = trim(p_name),
    phone = nullif(trim(p_phone), ''),
    email = nullif(trim(p_email), ''),
    gstin = nullif(trim(p_gstin), ''),
    address = nullif(trim(p_address), ''),
    updated_at = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_customer;

  INSERT INTO public.customer_audit_log (customer_id, action, changed_by, old_data, new_data)
  VALUES (v_customer.id, 'UPDATE', v_caller_id, v_old_data, to_jsonb(v_customer));

  RETURN v_customer;
END;
$$;

-- 9. Row Level Security Policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_audit_log ENABLE ROW LEVEL SECURITY;

-- Customers table policies
DROP POLICY IF EXISTS "customers_admin_receptionist_all" ON public.customers;
CREATE POLICY "customers_admin_receptionist_all"
  ON public.customers FOR ALL TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_receptionist()))
  WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_receptionist()));

DROP POLICY IF EXISTS "customers_technician_assigned_select" ON public.customers;
CREATE POLICY "customers_technician_assigned_select"
  ON public.customers FOR SELECT TO authenticated
  USING (
    (SELECT public.is_technician()) AND (
      id IN (
        SELECT customer_id FROM public.jobs WHERE technician_id = (SELECT auth.uid())
      )
    )
  );

-- Customer audit log policies
DROP POLICY IF EXISTS "customer_audit_log_admin_receptionist_select" ON public.customer_audit_log;
CREATE POLICY "customer_audit_log_admin_receptionist_select"
  ON public.customer_audit_log FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_receptionist()));

-- 10. Grants for RPC execution
GRANT EXECUTE ON FUNCTION public.search_customers TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_customer TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_profile TO authenticated;
