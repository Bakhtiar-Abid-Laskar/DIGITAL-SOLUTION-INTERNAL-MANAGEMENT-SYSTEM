-- ============================================================================
-- REPAIRSHOP — INVENTORY PURCHASE INTAKE & PURCHASE HISTORY MODULE
-- Migration: 20260821300000_inventory_purchase_intake_module.sql
--
-- Provides:
--   1. Sequence and generator for purchase codes (PO-YYYY-XXXX)
--   2. public.suppliers table with phone_clean generated column and indexes
--   3. public.purchases table (purchase intake ledger records)
--   4. public.purchase_audit_log & public.supplier_audit_log tables
--   5. Storage bucket 'purchase-invoices' and access policies
--   6. RPCs:
--      - search_suppliers(p_query, p_limit)
--      - find_or_create_supplier(...)
--      - search_products_catalog(p_query, p_limit)
--      - log_inventory_purchase(...) [Single atomic transaction]
--      - get_purchase_history(...)
--   7. RLS policies for suppliers, purchases, and audit tables
-- ============================================================================

-- 1. Sequence & purchase code generator
CREATE SEQUENCE IF NOT EXISTS public.purchase_code_seq;

CREATE OR REPLACE FUNCTION public.generate_purchase_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year text := to_char(current_date, 'YYYY');
  v_seq int;
BEGIN
  v_seq := nextval('public.purchase_code_seq');
  RETURN 'PO-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END;
$$;


-- 2. public.suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  phone        TEXT,
  phone_clean  TEXT GENERATED ALWAYS AS (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) STORED,
  email        TEXT,
  gstin        TEXT,
  address      TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name_lower ON public.suppliers (lower(trim(name)));
CREATE INDEX IF NOT EXISTS idx_suppliers_phone_clean ON public.suppliers (phone_clean);
CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON public.suppliers (lower(trim(gstin)));
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers (is_active);


-- 3. public.purchases Table (Purchase History)
CREATE TABLE IF NOT EXISTS public.purchases (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_code            TEXT UNIQUE NOT NULL DEFAULT public.generate_purchase_code(),
  supplier_id              UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  product_id               UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  inventory_id             UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  purchase_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_invoice_number  TEXT,
  invoice_image_url        TEXT,
  quantity                 NUMERIC NOT NULL CHECK (quantity > 0),
  purchase_rate            NUMERIC NOT NULL DEFAULT 0 CHECK (purchase_rate >= 0),
  selling_rate             NUMERIC DEFAULT 0 CHECK (selling_rate >= 0),
  subtotal                 NUMERIC NOT NULL DEFAULT 0,
  tax_amount               NUMERIC NOT NULL DEFAULT 0,
  total_amount             NUMERIC NOT NULL DEFAULT 0,
  notes                    TEXT,
  logged_by                UUID REFERENCES public.users(id),
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON public.purchases (product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_inventory_id ON public.purchases (inventory_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases (purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases (created_at DESC);


-- 4. Audit Log Tables
CREATE TABLE IF NOT EXISTS public.purchase_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  changed_by  UUID REFERENCES public.users(id),
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  changed_by  UUID REFERENCES public.users(id),
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- 5. Storage Bucket Configuration (purchase-invoices)
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-invoices', 'purchase-invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'purchase_invoices_public_read'
  ) THEN
    CREATE POLICY "purchase_invoices_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'purchase-invoices');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'purchase_invoices_auth_insert'
  ) THEN
    CREATE POLICY "purchase_invoices_auth_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'purchase-invoices');
  END IF;
END $$;


-- ============================================================================
-- 6. RPC FUNCTIONS
-- ============================================================================

-- A. Search Suppliers (Typeahead autocomplete)
CREATE OR REPLACE FUNCTION public.search_suppliers(
  p_query TEXT,
  p_limit INT DEFAULT 10
)
RETURNS SETOF public.suppliers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT := trim(coalesce(p_query, ''));
  v_clean_phone TEXT := regexp_replace(v_q, '\D', '', 'g');
BEGIN
  IF v_q = '' THEN
    RETURN QUERY
      SELECT * FROM public.suppliers
      WHERE is_active = true
      ORDER BY name ASC
      LIMIT coalesce(p_limit, 10);
    RETURN;
  END IF;

  RETURN QUERY
    SELECT * FROM public.suppliers
    WHERE is_active = true
      AND (
        name ILIKE ('%' || v_q || '%')
        OR (length(v_clean_phone) >= 3 AND phone_clean LIKE ('%' || v_clean_phone || '%'))
        OR gstin ILIKE ('%' || v_q || '%')
      )
    ORDER BY
      CASE WHEN lower(name) = lower(v_q) THEN 0
           WHEN lower(name) LIKE (lower(v_q) || '%') THEN 1
           ELSE 2
      END,
      name ASC
    LIMIT coalesce(p_limit, 10);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_suppliers(TEXT, INT) TO authenticated, anon;


-- B. Find or Create Supplier (Deduplicated Match & Upsert)
CREATE OR REPLACE FUNCTION public.find_or_create_supplier(
  p_supplier_id UUID DEFAULT NULL,
  p_name        TEXT DEFAULT NULL,
  p_phone       TEXT DEFAULT NULL,
  p_email       TEXT DEFAULT NULL,
  p_gstin       TEXT DEFAULT NULL,
  p_address     TEXT DEFAULT NULL,
  p_user_id     UUID DEFAULT NULL
)
RETURNS public.suppliers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier public.suppliers%ROWTYPE;
  v_clean_phone TEXT := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_trimmed_name TEXT := trim(coalesce(p_name, ''));
  v_old_data JSONB;
  v_caller_id UUID := coalesce(p_user_id, auth.uid());
BEGIN
  -- Normalize Indian phone prefix
  IF length(v_clean_phone) = 12 AND v_clean_phone LIKE '91%' THEN
    v_clean_phone := substring(v_clean_phone FROM 3);
  ELSIF length(v_clean_phone) = 11 AND v_clean_phone LIKE '0%' THEN
    v_clean_phone := substring(v_clean_phone FROM 2);
  END IF;

  -- 1. Match by explicit supplier ID
  IF p_supplier_id IS NOT NULL THEN
    SELECT * INTO v_supplier FROM public.suppliers WHERE id = p_supplier_id;
    IF FOUND THEN
      v_old_data := to_jsonb(v_supplier);
      UPDATE public.suppliers
      SET
        name = coalesce(nullif(v_trimmed_name, ''), v_supplier.name),
        phone = coalesce(nullif(trim(p_phone), ''), v_supplier.phone),
        email = coalesce(nullif(trim(p_email), ''), v_supplier.email),
        gstin = coalesce(nullif(trim(p_gstin), ''), v_supplier.gstin),
        address = coalesce(nullif(trim(p_address), ''), v_supplier.address),
        is_active = true,
        updated_at = now()
      WHERE id = p_supplier_id
      RETURNING * INTO v_supplier;

      INSERT INTO public.supplier_audit_log (supplier_id, action, changed_by, old_data, new_data)
      VALUES (v_supplier.id, 'UPDATE', v_caller_id, v_old_data, to_jsonb(v_supplier));

      RETURN v_supplier;
    END IF;
  END IF;

  -- 2. Match by clean phone (if valid length >= 7)
  IF length(v_clean_phone) >= 7 THEN
    SELECT * INTO v_supplier 
    FROM public.suppliers 
    WHERE phone_clean = v_clean_phone OR phone_clean LIKE ('%' || v_clean_phone)
    LIMIT 1;

    IF FOUND THEN
      v_old_data := to_jsonb(v_supplier);
      UPDATE public.suppliers
      SET
        name = coalesce(nullif(v_trimmed_name, ''), v_supplier.name),
        email = coalesce(nullif(trim(p_email), ''), v_supplier.email),
        gstin = coalesce(nullif(trim(p_gstin), ''), v_supplier.gstin),
        address = coalesce(nullif(trim(p_address), ''), v_supplier.address),
        is_active = true,
        updated_at = now()
      WHERE id = v_supplier.id
      RETURNING * INTO v_supplier;

      INSERT INTO public.supplier_audit_log (supplier_id, action, changed_by, old_data, new_data)
      VALUES (v_supplier.id, 'UPDATE_BY_PHONE', v_caller_id, v_old_data, to_jsonb(v_supplier));

      RETURN v_supplier;
    END IF;
  END IF;

  -- 3. Match by exact case-insensitive trimmed name
  IF v_trimmed_name <> '' THEN
    SELECT * INTO v_supplier 
    FROM public.suppliers 
    WHERE lower(trim(name)) = lower(v_trimmed_name)
    LIMIT 1;

    IF FOUND THEN
      v_old_data := to_jsonb(v_supplier);
      UPDATE public.suppliers
      SET
        phone = coalesce(nullif(trim(p_phone), ''), v_supplier.phone),
        email = coalesce(nullif(trim(p_email), ''), v_supplier.email),
        gstin = coalesce(nullif(trim(p_gstin), ''), v_supplier.gstin),
        address = coalesce(nullif(trim(p_address), ''), v_supplier.address),
        is_active = true,
        updated_at = now()
      WHERE id = v_supplier.id
      RETURNING * INTO v_supplier;

      INSERT INTO public.supplier_audit_log (supplier_id, action, changed_by, old_data, new_data)
      VALUES (v_supplier.id, 'UPDATE_BY_NAME', v_caller_id, v_old_data, to_jsonb(v_supplier));

      RETURN v_supplier;
    END IF;
  END IF;

  -- 4. Create new supplier if no match found
  IF v_trimmed_name = '' THEN
    v_trimmed_name := 'General Supplier';
  END IF;

  INSERT INTO public.suppliers (
    name, phone, email, gstin, address, is_active, created_by
  ) VALUES (
    v_trimmed_name,
    nullif(trim(p_phone), ''),
    nullif(trim(p_email), ''),
    nullif(trim(p_gstin), ''),
    nullif(trim(p_address), ''),
    true,
    v_caller_id
  )
  RETURNING * INTO v_supplier;

  INSERT INTO public.supplier_audit_log (supplier_id, action, changed_by, old_data, new_data)
  VALUES (v_supplier.id, 'CREATE', v_caller_id, NULL, to_jsonb(v_supplier));

  RETURN v_supplier;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_or_create_supplier TO authenticated, anon;


-- C. Search Products Catalog (Typeahead autocomplete for products)
CREATE OR REPLACE FUNCTION public.search_products_catalog(
  p_query TEXT,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  product_id          UUID,
  inventory_id        UUID,
  name                TEXT,
  sku                 TEXT,
  unit                TEXT,
  hsn_sac             TEXT,
  tax_mode            TEXT,
  cgst_rate           NUMERIC,
  sgst_rate           NUMERIC,
  igst_rate           NUMERIC,
  purchase_rate       NUMERIC,
  selling_rate        NUMERIC,
  current_quantity    NUMERIC,
  low_stock_threshold NUMERIC,
  minimum_stock_level NUMERIC,
  location            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT := trim(coalesce(p_query, ''));
BEGIN
  IF v_q = '' THEN
    RETURN QUERY
      SELECT 
        p.id AS product_id,
        i.id AS inventory_id,
        p.name,
        p.sku,
        coalesce(p.unit, i.unit, 'Pcs') AS unit,
        p.hsn_sac,
        coalesce(p.tax_mode, 'exclusive') AS tax_mode,
        coalesce(p.cgst_rate, 9) AS cgst_rate,
        coalesce(p.sgst_rate, 9) AS sgst_rate,
        coalesce(p.igst_rate, 18) AS igst_rate,
        coalesce(i.purchase_rate, 0) AS purchase_rate,
        coalesce(i.selling_rate, 0) AS selling_rate,
        coalesce(i.quantity_cached, i.quantity, 0) AS current_quantity,
        coalesce(i.low_stock_threshold, 5) AS low_stock_threshold,
        coalesce(i.minimum_stock_level, 0) AS minimum_stock_level,
        i.location
      FROM public.products p
      LEFT JOIN public.inventory i ON i.product_id = p.id
      WHERE p.is_active = true
      ORDER BY p.name ASC
      LIMIT coalesce(p_limit, 10);
    RETURN;
  END IF;

  RETURN QUERY
    SELECT 
      p.id AS product_id,
      i.id AS inventory_id,
      p.name,
      p.sku,
      coalesce(p.unit, i.unit, 'Pcs') AS unit,
      p.hsn_sac,
      coalesce(p.tax_mode, 'exclusive') AS tax_mode,
      coalesce(p.cgst_rate, 9) AS cgst_rate,
      coalesce(p.sgst_rate, 9) AS sgst_rate,
      coalesce(p.igst_rate, 18) AS igst_rate,
      coalesce(i.purchase_rate, 0) AS purchase_rate,
      coalesce(i.selling_rate, 0) AS selling_rate,
      coalesce(i.quantity_cached, i.quantity, 0) AS current_quantity,
      coalesce(i.low_stock_threshold, 5) AS low_stock_threshold,
      coalesce(i.minimum_stock_level, 0) AS minimum_stock_level,
      i.location
    FROM public.products p
    LEFT JOIN public.inventory i ON i.product_id = p.id
    WHERE p.is_active = true
      AND (
        p.name ILIKE ('%' || v_q || '%')
        OR p.sku ILIKE ('%' || v_q || '%')
        OR p.hsn_sac ILIKE ('%' || v_q || '%')
      )
    ORDER BY
      CASE WHEN lower(p.name) = lower(v_q) THEN 0
           WHEN lower(p.name) LIKE (lower(v_q) || '%') THEN 1
           ELSE 2
      END,
      p.name ASC
    LIMIT coalesce(p_limit, 10);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_products_catalog(TEXT, INT) TO authenticated, anon;


-- D. Log Inventory Purchase (Atomic Transactional Function)
CREATE OR REPLACE FUNCTION public.log_inventory_purchase(
  p_supplier_id            UUID DEFAULT NULL,
  p_supplier_name          TEXT DEFAULT NULL,
  p_supplier_phone         TEXT DEFAULT NULL,
  p_supplier_email         TEXT DEFAULT NULL,
  p_supplier_gstin         TEXT DEFAULT NULL,
  p_supplier_address       TEXT DEFAULT NULL,
  p_purchase_date          DATE DEFAULT CURRENT_DATE,
  p_supplier_invoice_id    TEXT DEFAULT NULL,
  p_invoice_image_url      TEXT DEFAULT NULL,
  p_product_id             UUID DEFAULT NULL,
  p_product_name           TEXT DEFAULT NULL,
  p_sku                    TEXT DEFAULT NULL,
  p_unit                   TEXT DEFAULT 'Pcs',
  p_hsn_sac                TEXT DEFAULT NULL,
  p_cgst_rate              NUMERIC DEFAULT 9,
  p_sgst_rate              NUMERIC DEFAULT 9,
  p_igst_rate              NUMERIC DEFAULT 18,
  p_tax_mode               TEXT DEFAULT 'exclusive',
  p_quantity               NUMERIC DEFAULT 1,
  p_purchase_rate          NUMERIC DEFAULT 0,
  p_selling_rate           NUMERIC DEFAULT 0,
  p_low_stock_threshold    NUMERIC DEFAULT 5,
  p_minimum_stock_level    NUMERIC DEFAULT 0,
  p_location               TEXT DEFAULT NULL,
  p_notes                  TEXT DEFAULT NULL,
  p_user_id                UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier public.suppliers%ROWTYPE;
  v_product_id UUID := p_product_id;
  v_inventory_id UUID;
  v_purchase_id UUID;
  v_purchase_code TEXT;
  v_caller_id UUID := coalesce(p_user_id, auth.uid());
  v_trimmed_prod_name TEXT := trim(coalesce(p_product_name, ''));
  v_qty NUMERIC := coalesce(p_quantity, 1);
  v_pur_rate NUMERIC := coalesce(p_purchase_rate, 0);
  v_sel_rate NUMERIC := coalesce(p_selling_rate, 0);
  v_subtotal NUMERIC := v_qty * v_pur_rate;
  v_tax_rate NUMERIC := coalesce(p_cgst_rate, 0) + coalesce(p_sgst_rate, 0);
  v_tax_amount NUMERIC := round(v_subtotal * (v_tax_rate / 100.0), 2);
  v_total_amount NUMERIC := v_subtotal + v_tax_amount;
  v_old_inv_qty NUMERIC := 0;
  v_new_inv_qty NUMERIC := 0;
BEGIN
  IF v_qty <= 0 THEN
    RAISE EXCEPTION 'Purchase quantity must be greater than zero (received %)', v_qty;
  END IF;

  IF v_trimmed_prod_name = '' AND v_product_id IS NULL THEN
    RAISE EXCEPTION 'Product name is required for purchase intake.';
  END IF;

  -- 1. Resolve Supplier
  v_supplier := public.find_or_create_supplier(
    p_supplier_id   => p_supplier_id,
    p_name          => p_supplier_name,
    p_phone         => p_supplier_phone,
    p_email         => p_supplier_email,
    p_gstin         => p_supplier_gstin,
    p_address       => p_supplier_address,
    p_user_id       => v_caller_id
  );

  -- 2. Resolve Product & Inventory Row
  IF v_product_id IS NOT NULL THEN
    SELECT id INTO v_inventory_id FROM public.inventory WHERE product_id = v_product_id LIMIT 1;
  ELSE
    -- Check if product exists by case-insensitive name
    SELECT id INTO v_product_id FROM public.products WHERE lower(trim(name)) = lower(v_trimmed_prod_name) LIMIT 1;
    IF v_product_id IS NOT NULL THEN
      SELECT id INTO v_inventory_id FROM public.inventory WHERE product_id = v_product_id LIMIT 1;
    END IF;
  END IF;

  -- If product does not exist, create in products table
  IF v_product_id IS NULL THEN
    INSERT INTO public.products (
      name, sku, unit, hsn_sac, cgst_rate, sgst_rate, igst_rate, tax_mode, is_active, created_by
    ) VALUES (
      v_trimmed_prod_name,
      nullif(trim(p_sku), ''),
      coalesce(nullif(trim(p_unit), ''), 'Pcs'),
      nullif(trim(p_hsn_sac), ''),
      coalesce(p_cgst_rate, 9),
      coalesce(p_sgst_rate, 9),
      coalesce(p_igst_rate, 18),
      coalesce(p_tax_mode, 'exclusive'),
      true,
      v_caller_id
    ) RETURNING id INTO v_product_id;
  ELSE
    -- Update product metadata if provided
    UPDATE public.products
    SET
      sku = coalesce(nullif(trim(p_sku), ''), sku),
      unit = coalesce(nullif(trim(p_unit), ''), unit),
      hsn_sac = coalesce(nullif(trim(p_hsn_sac), ''), hsn_sac),
      cgst_rate = coalesce(p_cgst_rate, cgst_rate),
      sgst_rate = coalesce(p_sgst_rate, sgst_rate),
      igst_rate = coalesce(p_igst_rate, igst_rate),
      tax_mode = coalesce(p_tax_mode, tax_mode),
      updated_at = now()
    WHERE id = v_product_id;
  END IF;

  -- If inventory row does not exist for product, create it
  IF v_inventory_id IS NULL THEN
    INSERT INTO public.inventory (
      item_name, quantity, quantity_cached, unit, low_stock_threshold, minimum_stock_level, purchase_rate, selling_rate, location, product_id, last_updated
    ) VALUES (
      v_trimmed_prod_name,
      0,
      0,
      coalesce(nullif(trim(p_unit), ''), 'Pcs'),
      coalesce(p_low_stock_threshold, 5),
      coalesce(p_minimum_stock_level, 0),
      v_pur_rate,
      v_sel_rate,
      nullif(trim(p_location), ''),
      v_product_id,
      now()
    ) RETURNING id INTO v_inventory_id;
  END IF;

  -- 3. Create Purchase Record
  v_purchase_code := public.generate_purchase_code();

  INSERT INTO public.purchases (
    purchase_code,
    supplier_id,
    product_id,
    inventory_id,
    purchase_date,
    supplier_invoice_number,
    invoice_image_url,
    quantity,
    purchase_rate,
    selling_rate,
    subtotal,
    tax_amount,
    total_amount,
    notes,
    logged_by,
    created_at
  ) VALUES (
    v_purchase_code,
    v_supplier.id,
    v_product_id,
    v_inventory_id,
    coalesce(p_purchase_date, current_date),
    nullif(trim(p_supplier_invoice_id), ''),
    nullif(trim(p_invoice_image_url), ''),
    v_qty,
    v_pur_rate,
    v_sel_rate,
    v_subtotal,
    v_tax_amount,
    v_total_amount,
    nullif(trim(p_notes), ''),
    v_caller_id,
    now()
  ) RETURNING id INTO v_purchase_id;

  -- 4. Atomically increment inventory stock
  SELECT coalesce(quantity, 0) INTO v_old_inv_qty FROM public.inventory WHERE id = v_inventory_id FOR UPDATE;

  UPDATE public.inventory
  SET
    quantity = coalesce(quantity, 0) + v_qty,
    quantity_cached = coalesce(quantity_cached, 0) + v_qty,
    purchase_rate = v_pur_rate,
    selling_rate = CASE WHEN v_sel_rate > 0 THEN v_sel_rate ELSE selling_rate END,
    location = coalesce(nullif(trim(p_location), ''), location),
    last_updated = now()
  WHERE id = v_inventory_id
  RETURNING quantity INTO v_new_inv_qty;

  -- 5. Record in Inventory Transactions Ledger
  INSERT INTO public.inventory_transactions (
    inventory_id,
    transaction_type,
    quantity,
    reference_note,
    created_by,
    created_at
  ) VALUES (
    v_inventory_id,
    'IN',
    v_qty,
    'Purchase Intake (' || v_purchase_code || ') from ' || v_supplier.name,
    v_caller_id,
    now()
  );

  -- 6. Audit Logging
  INSERT INTO public.inventory_audit_log (
    inventory_id, changed_by, change_type, old_quantity, new_quantity, changed_at
  ) VALUES (
    v_inventory_id, v_caller_id, 'PURCHASE_INTAKE', v_old_inv_qty, v_new_inv_qty, now()
  );

  INSERT INTO public.purchase_audit_log (
    purchase_id, action, changed_by, details, created_at
  ) VALUES (
    v_purchase_id,
    'CREATE_PURCHASE',
    v_caller_id,
    jsonb_build_object(
      'purchase_code', v_purchase_code,
      'supplier_name', v_supplier.name,
      'product_name', v_trimmed_prod_name,
      'quantity', v_qty,
      'purchase_rate', v_pur_rate,
      'total_amount', v_total_amount,
      'old_inventory_qty', v_old_inv_qty,
      'new_inventory_qty', v_new_inv_qty
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'purchase_code', v_purchase_code,
    'supplier_id', v_supplier.id,
    'supplier_name', v_supplier.name,
    'product_id', v_product_id,
    'inventory_id', v_inventory_id,
    'quantity', v_qty,
    'total_amount', v_total_amount,
    'new_stock_level', v_new_inv_qty
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_inventory_purchase TO authenticated, anon;


-- E. Get Purchase History RPC (Filterable & Paginated)
CREATE OR REPLACE FUNCTION public.get_purchase_history(
  p_supplier_id UUID DEFAULT NULL,
  p_product_id  UUID DEFAULT NULL,
  p_start_date  DATE DEFAULT NULL,
  p_end_date    DATE DEFAULT NULL,
  p_search      TEXT DEFAULT NULL,
  p_limit       INT DEFAULT 20,
  p_offset      INT DEFAULT 0
)
RETURNS TABLE (
  purchase_id             UUID,
  purchase_code           TEXT,
  purchase_date           DATE,
  supplier_invoice_number TEXT,
  invoice_image_url       TEXT,
  quantity                NUMERIC,
  purchase_rate           NUMERIC,
  selling_rate            NUMERIC,
  subtotal                NUMERIC,
  tax_amount              NUMERIC,
  total_amount            NUMERIC,
  notes                   TEXT,
  created_at              TIMESTAMPTZ,
  supplier_id             UUID,
  supplier_name           TEXT,
  supplier_phone          TEXT,
  supplier_gstin          TEXT,
  supplier_address        TEXT,
  product_id              UUID,
  product_name            TEXT,
  product_sku             TEXT,
  product_unit            TEXT,
  logged_by_id            UUID,
  logged_by_name          TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search TEXT := trim(coalesce(p_search, ''));
BEGIN
  RETURN QUERY
    SELECT 
      pu.id AS purchase_id,
      pu.purchase_code,
      pu.purchase_date,
      pu.supplier_invoice_number,
      pu.invoice_image_url,
      pu.quantity,
      pu.purchase_rate,
      pu.selling_rate,
      pu.subtotal,
      pu.tax_amount,
      pu.total_amount,
      pu.notes,
      pu.created_at,
      s.id AS supplier_id,
      coalesce(s.name, 'Unknown Supplier') AS supplier_name,
      s.phone AS supplier_phone,
      s.gstin AS supplier_gstin,
      s.address AS supplier_address,
      pr.id AS product_id,
      pr.name AS product_name,
      pr.sku AS product_sku,
      coalesce(pr.unit, 'Pcs') AS product_unit,
      u.id AS logged_by_id,
      coalesce(u.name, 'Staff') AS logged_by_name
    FROM public.purchases pu
    LEFT JOIN public.suppliers s ON s.id = pu.supplier_id
    LEFT JOIN public.products pr ON pr.id = pu.product_id
    LEFT JOIN public.users u ON u.id = pu.logged_by
    WHERE (p_supplier_id IS NULL OR pu.supplier_id = p_supplier_id)
      AND (p_product_id IS NULL OR pu.product_id = p_product_id)
      AND (p_start_date IS NULL OR pu.purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR pu.purchase_date <= p_end_date)
      AND (
        v_search = '' 
        OR pu.purchase_code ILIKE ('%' || v_search || '%')
        OR pu.supplier_invoice_number ILIKE ('%' || v_search || '%')
        OR s.name ILIKE ('%' || v_search || '%')
        OR pr.name ILIKE ('%' || v_search || '%')
      )
    ORDER BY pu.purchase_date DESC, pu.created_at DESC
    LIMIT coalesce(p_limit, 20)
    OFFSET coalesce(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_purchase_history TO authenticated, anon;


-- ============================================================================
-- 7. ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.suppliers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_audit_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_audit_log  ENABLE ROW LEVEL SECURITY;

-- Suppliers Policies
CREATE POLICY "suppliers_read_authenticated"
  ON public.suppliers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "suppliers_write_admin_receptionist"
  ON public.suppliers FOR ALL TO authenticated
  USING ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

-- Purchases Policies
CREATE POLICY "purchases_read_admin_receptionist"
  ON public.purchases FOR SELECT TO authenticated
  USING ((select public.is_admin()) or (select public.is_receptionist()));

CREATE POLICY "purchases_insert_admin_receptionist"
  ON public.purchases FOR INSERT TO authenticated
  WITH CHECK ((select public.is_admin()) or (select public.is_receptionist()));

CREATE POLICY "purchases_update_delete_admin"
  ON public.purchases FOR UPDATE TO authenticated
  USING ((select public.is_admin()));

-- Audit Tables Policies
CREATE POLICY "purchase_audit_read_admin"
  ON public.purchase_audit_log FOR SELECT TO authenticated
  USING ((select public.is_admin()));

CREATE POLICY "supplier_audit_read_admin"
  ON public.supplier_audit_log FOR SELECT TO authenticated
  USING ((select public.is_admin()));

NOTIFY pgrst, 'reload schema';
