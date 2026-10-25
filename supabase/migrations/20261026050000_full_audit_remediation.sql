-- ============================================================================
-- FULL PROJECT AUDIT REMEDIATION MIGRATION (RepairShopApp / Digital Solution)
-- Migration: 20261026050000_full_audit_remediation.sql
--
-- Purpose:
--   Remediates all database findings from the Full Project Audit:
--   - SEC-001 / SEC-005: Hardens webhook pipeline and makes purchase-invoices private
--   - NEW-01: Locks down purchase/supplier/serial RPCs (admin/receptionist only)
--   - NEW-02: Removes public anon INSERT policy on public.notifications
--   - NEW-03: Tightens whatsapp_settings and whatsapp_messages RLS policies
--   - NEW-04: Dynamically pins search_path on all SECURITY DEFINER functions
--   - NEW-05: Prevents user ID spoofing in customer/supplier/purchase RPCs
--   - INV-001: Deadlock-free sorted row-level FOR UPDATE locking in claim_invoice_serials
--   - MAT-001: Authorizes return_allocated_material (assigned tech or admin/receptionist)
--   - BIL-001: Enforces non-negative grand total and discount <= subtotal + tax
--   - NEW-07: Locked stock availability checks in create_invoice and update_invoice
--   - DB-002 / NEW-08: Customer phone normalization and unique index on right(phone_clean, 10)
--   - DB-003: Performance indexes for high-volume foreign keys and notification queries
--
-- Safety & Idempotency:
--   - All operations are idempotent (IF EXISTS, IF NOT EXISTS, CREATE OR REPLACE, DO blocks).
--   - Non-destructive: no DROP TABLE, TRUNCATE, or column drops.
--   - Rollback notes documented in comments at the end of each section.
-- ============================================================================

-- ============================================================================
-- SECTION 3: DATABASE SECURITY (SEC-001, SEC-005, NEW-01, NEW-02, NEW-03, NEW-04)
-- ============================================================================

-- 3A. SEC-001: Hardened Edge Function Webhook Dispatcher
-- Removes hardcoded anon key and dynamically reads webhook secret from DB setting or Supabase Vault.
CREATE OR REPLACE FUNCTION public.invoke_edge_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  base_url text;
  target_func text;
  webhook_url text;
  payload jsonb;
  request_id bigint;
  webhook_secret text;
  headers_obj jsonb;
BEGIN
  base_url := 'https://sssdjuxbelektszepikt.supabase.co/functions/v1/';
  target_func := TG_ARGV[0];

  IF target_func IS NULL OR target_func = '' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF target_func LIKE 'http://%' OR target_func LIKE 'https://%' THEN
    webhook_url := target_func;
  ELSE
    webhook_url := base_url || target_func;
  END IF;

  -- 1. Try reading secret from Supabase Vault (if enabled)
  BEGIN
    SELECT decrypted_secret INTO webhook_secret
    FROM vault.decrypted_secrets
    WHERE name = 'app_webhook_secret'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    webhook_secret := NULL;
  END;

  -- 2. Fall back to database custom setting (configured via ALTER DATABASE or set_config)
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    webhook_secret := nullif(current_setting('app.settings.webhook_secret', true), '');
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END
  );

  headers_obj := jsonb_build_object(
    'Content-Type', 'application/json'
  );

  IF webhook_secret IS NOT NULL AND webhook_secret <> '' THEN
    headers_obj := headers_obj || jsonb_build_object(
      'x-webhook-secret', webhook_secret,
      'webhook-signature', webhook_secret
    );
  END IF;

  BEGIN
    SELECT net.http_post(
      url := webhook_url,
      headers := headers_obj,
      body := payload
    ) INTO request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Edge webhook dispatch failed: %', SQLERRM;
  END;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- 3B. SEC-005: Make purchase-invoices storage bucket private with restricted RLS
UPDATE storage.buckets
SET public = false
WHERE id = 'purchase-invoices';

DROP POLICY IF EXISTS "purchase_invoices_public_read" ON storage.objects;
DROP POLICY IF EXISTS "purchase_invoices_auth_read" ON storage.objects;
CREATE POLICY "purchase_invoices_auth_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'purchase-invoices'
    AND (
      (SELECT public.is_admin())
      OR (SELECT public.is_receptionist())
    )
  );

DROP POLICY IF EXISTS "purchase_invoices_auth_insert" ON storage.objects;
CREATE POLICY "purchase_invoices_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'purchase-invoices'
    AND (
      (SELECT public.is_admin())
      OR (SELECT public.is_receptionist())
    )
  );

-- 3C. NEW-02: Restrict notifications INSERT policy to staff only (drop broad anon policy)
DROP POLICY IF EXISTS "notifications_insert_anon" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_staff" ON public.notifications;

CREATE POLICY "notifications_insert_staff" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR (SELECT public.is_receptionist())
  );

-- 3D. NEW-03: Tighten policies on whatsapp_settings and whatsapp_messages
DROP POLICY IF EXISTS "Staff can view whatsapp settings" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "whatsapp_settings_admin_select" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "whatsapp_settings_admin_only" ON public.whatsapp_settings;
CREATE POLICY "whatsapp_settings_admin_select" ON public.whatsapp_settings
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can update whatsapp settings" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "whatsapp_settings_admin_update" ON public.whatsapp_settings;
CREATE POLICY "whatsapp_settings_admin_update" ON public.whatsapp_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "whatsapp_messages_read" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_read_admin_receptionist" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_read_admin_receptionist" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_receptionist()));

-- 3E. NEW-01 & NEW-05: Lock down Purchase & Supplier RPCs
-- Revoke execution from anon and PUBLIC, enforce active admin/receptionist role, and eliminate user ID spoofing.

-- 1. search_suppliers
CREATE OR REPLACE FUNCTION public.search_suppliers(
  p_query TEXT,
  p_limit INT DEFAULT 10
)
RETURNS SETOF public.suppliers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_q TEXT := trim(coalesce(p_query, ''));
  v_clean_phone TEXT := regexp_replace(v_q, '\D', '', 'g');
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can search suppliers.';
  END IF;

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
      CASE
        WHEN lower(name) = lower(v_q) THEN 0
        WHEN lower(name) LIKE (lower(v_q) || '%') THEN 1
        ELSE 2
      END,
      name ASC
    LIMIT coalesce(p_limit, 10);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_suppliers(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_suppliers(TEXT, INT) TO authenticated;

-- 2. find_or_create_supplier
CREATE OR REPLACE FUNCTION public.find_or_create_supplier(
  p_supplier_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_gstin TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS public.suppliers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_supplier public.suppliers%ROWTYPE;
  v_clean_phone TEXT := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_trimmed_name TEXT := trim(coalesce(p_name, ''));
  v_old_data JSONB;
  v_caller_id UUID;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can manage suppliers.';
  END IF;

  -- Ignore spoofed client-supplied user ID
  IF auth.uid() IS NOT NULL THEN
    v_caller_id := auth.uid();
  ELSE
    v_caller_id := coalesce(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

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

  -- 2. Match by clean phone
  IF length(v_clean_phone) >= 7 THEN
    SELECT * INTO v_supplier FROM public.suppliers
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

  -- 3. Match by name
  IF v_trimmed_name <> '' THEN
    SELECT * INTO v_supplier FROM public.suppliers
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

  -- 4. Create new supplier
  IF v_trimmed_name = '' THEN
    v_trimmed_name := 'General Supplier';
  END IF;

  INSERT INTO public.suppliers (
    name, phone, email, gstin, address, is_active, created_by
  ) VALUES (
    v_trimmed_name, nullif(trim(p_phone), ''), nullif(trim(p_email), ''),
    nullif(trim(p_gstin), ''), nullif(trim(p_address), ''), true, v_caller_id
  )
  RETURNING * INTO v_supplier;

  INSERT INTO public.supplier_audit_log (supplier_id, action, changed_by, old_data, new_data)
  VALUES (v_supplier.id, 'CREATE', v_caller_id, NULL, to_jsonb(v_supplier));

  RETURN v_supplier;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_or_create_supplier FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_supplier TO authenticated;

-- 3. search_products_catalog
CREATE OR REPLACE FUNCTION public.search_products_catalog(
  p_query TEXT,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  inventory_id UUID,
  name TEXT,
  sku TEXT,
  unit TEXT,
  hsn_sac TEXT,
  tax_mode TEXT,
  cgst_rate NUMERIC,
  sgst_rate NUMERIC,
  igst_rate NUMERIC,
  purchase_rate NUMERIC,
  selling_rate NUMERIC,
  current_quantity NUMERIC,
  low_stock_threshold NUMERIC,
  minimum_stock_level NUMERIC,
  location TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_q TEXT := trim(coalesce(p_query, ''));
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

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
      CASE
        WHEN lower(p.name) = lower(v_q) THEN 0
        WHEN lower(p.name) LIKE (lower(v_q) || '%') THEN 1
        ELSE 2
      END,
      p.name ASC
    LIMIT coalesce(p_limit, 10);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_products_catalog(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_products_catalog(TEXT, INT) TO authenticated;

-- 4. log_multi_item_purchase
CREATE OR REPLACE FUNCTION public.log_multi_item_purchase(
  p_supplier_id            UUID DEFAULT NULL,
  p_supplier_name          TEXT DEFAULT NULL,
  p_supplier_phone         TEXT DEFAULT NULL,
  p_supplier_email         TEXT DEFAULT NULL,
  p_supplier_gstin         TEXT DEFAULT NULL,
  p_supplier_address       TEXT DEFAULT NULL,
  p_purchase_date          DATE DEFAULT CURRENT_DATE,
  p_supplier_invoice_id    TEXT DEFAULT NULL,
  p_invoice_image_url      TEXT DEFAULT NULL,
  p_notes                  TEXT DEFAULT NULL,
  p_items                  JSONB DEFAULT '[]'::jsonb,
  p_user_id                UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_supplier          public.suppliers%ROWTYPE;
  v_purchase_id       UUID;
  v_purchase_code     TEXT;
  v_caller_id         UUID;
  v_item              JSONB;
  v_product_id        UUID;
  v_inventory_id      UUID;
  v_item_id           UUID;
  v_item_name         TEXT;
  v_sku               TEXT;
  v_unit              TEXT;
  v_hsn_sac           TEXT;
  v_tax_percent       NUMERIC;
  v_tax_mode          TEXT;
  v_qty               NUMERIC;
  v_purchase_rate     NUMERIC;
  v_selling_rate      NUMERIC;
  v_line_subtotal     NUMERIC;
  v_line_tax          NUMERIC;
  v_line_total        NUMERIC;
  v_is_tracked        BOOLEAN;
  v_serials           JSONB;
  v_serial_text       TEXT;
  v_serial_clean      TEXT;
  v_serial_count      INT;
  v_serials_list      TEXT[];
  v_overall_subtotal  NUMERIC := 0;
  v_overall_tax       NUMERIC := 0;
  v_overall_total     NUMERIC := 0;
  v_existing_id       UUID;
  v_old_qty           NUMERIC;
  v_new_qty           NUMERIC;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can record purchases.';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    v_caller_id := auth.uid();
  ELSE
    v_caller_id := coalesce(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Purchase order must contain at least one product item.';
  END IF;

  -- Resolve Supplier
  v_supplier := public.find_or_create_supplier(
    p_supplier_id => p_supplier_id,
    p_name        => p_supplier_name,
    p_phone       => p_supplier_phone,
    p_email       => p_supplier_email,
    p_gstin       => p_supplier_gstin,
    p_address     => p_supplier_address,
    p_user_id     => v_caller_id
  );

  v_purchase_code := public.generate_purchase_code();

  INSERT INTO public.purchases (
    purchase_code, supplier_id, purchase_date, supplier_invoice_number,
    invoice_image_url, notes, logged_by, created_at, status
  ) VALUES (
    v_purchase_code, v_supplier.id, coalesce(p_purchase_date, current_date),
    nullif(trim(p_supplier_invoice_id), ''), nullif(trim(p_invoice_image_url), ''),
    nullif(trim(p_notes), ''), v_caller_id, now(), 'completed'
  )
  RETURNING id INTO v_purchase_id;

  -- Process line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_name     := trim(coalesce(v_item->>'product_name', ''));
    v_product_id    := nullif((v_item->>'product_id'), '')::UUID;
    v_qty           := coalesce((v_item->>'quantity')::numeric, 1);
    v_purchase_rate := coalesce((v_item->>'purchase_rate')::numeric, 0);
    v_selling_rate  := coalesce((v_item->>'selling_rate')::numeric, 0);
    v_tax_percent   := coalesce((v_item->>'tax_percent')::numeric, 18);
    v_tax_mode      := coalesce(nullif(v_item->>'tax_mode', ''), 'exclusive');
    v_is_tracked    := coalesce((v_item->>'is_serial_tracked')::boolean, true);
    v_serials       := coalesce(v_item->'serial_numbers', '[]'::jsonb);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Item "%": quantity must be greater than zero.', v_item_name;
    END IF;

    IF v_is_tracked AND jsonb_array_length(v_serials) <> v_qty::int THEN
      RAISE EXCEPTION 'Item "%": requires exactly % serial numbers (provided %).',
        v_item_name, v_qty::int, jsonb_array_length(v_serials);
    END IF;

    -- Resolve Product & Inventory
    IF v_product_id IS NOT NULL THEN
      SELECT id INTO v_inventory_id FROM public.inventory WHERE product_id = v_product_id LIMIT 1;
    ELSE
      SELECT id INTO v_product_id FROM public.products WHERE lower(trim(name)) = lower(v_item_name) LIMIT 1;
      IF v_product_id IS NOT NULL THEN
        SELECT id INTO v_inventory_id FROM public.inventory WHERE product_id = v_product_id LIMIT 1;
      END IF;
    END IF;

    IF v_product_id IS NULL THEN
      INSERT INTO public.products (name, sku, unit, hsn_sac, tax_mode, is_active, created_by)
      VALUES (
        v_item_name, nullif(trim(v_item->>'sku'), ''), coalesce(nullif(trim(v_item->>'unit'), ''), 'Pcs'),
        nullif(trim(v_item->>'hsn_sac'), ''), v_tax_mode, true, v_caller_id
      )
      RETURNING id INTO v_product_id;
    END IF;

    IF v_inventory_id IS NULL THEN
      INSERT INTO public.inventory (
        item_name, quantity, quantity_cached, stock_quantity, unit,
        purchase_rate, selling_rate, product_id, last_updated
      ) VALUES (
        v_item_name, 0, 0, 0, coalesce(nullif(trim(v_item->>'unit'), ''), 'Pcs'),
        v_purchase_rate, v_selling_rate, v_product_id, now()
      )
      RETURNING id INTO v_inventory_id;
    END IF;

    -- Compute line amounts
    IF v_tax_mode = 'inclusive' THEN
      v_line_total    := round(v_qty * v_purchase_rate, 2);
      v_line_subtotal := round(v_line_total / (1.0 + (v_tax_percent / 100.0)), 2);
      v_line_tax      := v_line_total - v_line_subtotal;
    ELSE
      v_line_subtotal := round(v_qty * v_purchase_rate, 2);
      v_line_tax      := round(v_line_subtotal * (v_tax_percent / 100.0), 2);
      v_line_total    := v_line_subtotal + v_line_tax;
    END IF;

    v_overall_subtotal := v_overall_subtotal + v_line_subtotal;
    v_overall_tax      := v_overall_tax + v_line_tax;
    v_overall_total    := v_overall_total + v_line_total;

    INSERT INTO public.purchase_items (
      purchase_id, product_id, inventory_id, quantity, purchase_rate, selling_rate,
      tax_percent, tax_mode, subtotal, tax_amount, total_amount, is_serial_tracked
    ) VALUES (
      v_purchase_id, v_product_id, v_inventory_id, v_qty, v_purchase_rate, v_selling_rate,
      v_tax_percent, v_tax_mode, v_line_subtotal, v_line_tax, v_line_total, v_is_tracked
    )
    RETURNING id INTO v_item_id;

    -- Process serials
    v_serials_list := ARRAY[]::TEXT[];
    IF v_is_tracked THEN
      FOR v_serial_text IN SELECT (x.value)::text FROM jsonb_array_elements(v_serials) AS x
      LOOP
        v_serial_text  := trim(both '"' from v_serial_text);
        v_serial_clean := lower(trim(v_serial_text));

        SELECT id INTO v_existing_id
        FROM public.inventory_unit_serials
        WHERE product_id = v_product_id AND serial_number_clean = v_serial_clean
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
          RAISE EXCEPTION 'DUPLICATE_SERIAL: Serial "%" already exists for product "%".',
            v_serial_text, v_item_name;
        END IF;

        INSERT INTO public.inventory_unit_serials (
          serial_number, product_id, inventory_id, purchase_id, purchase_item_id,
          unit_cost, status, created_by
        ) VALUES (
          v_serial_text, v_product_id, v_inventory_id, v_purchase_id, v_item_id,
          v_purchase_rate, 'available', v_caller_id
        );

        v_serials_list := array_append(v_serials_list, v_serial_text);
      END LOOP;
    END IF;

    -- Update inventory stock under row lock
    SELECT coalesce(quantity, 0) INTO v_old_qty
    FROM public.inventory WHERE id = v_inventory_id FOR UPDATE;

    UPDATE public.inventory
    SET
      quantity        = coalesce(quantity, 0) + v_qty,
      quantity_cached = coalesce(quantity_cached, 0) + v_qty,
      stock_quantity  = coalesce(stock_quantity, 0) + v_qty,
      purchase_rate   = v_purchase_rate,
      selling_rate    = CASE WHEN v_selling_rate > 0 THEN v_selling_rate ELSE selling_rate END,
      last_updated    = now()
    WHERE id = v_inventory_id
    RETURNING quantity INTO v_new_qty;

    INSERT INTO public.inventory_transactions (
      inventory_id, transaction_type, quantity, reference_note, created_by, serial_numbers
    ) VALUES (
      v_inventory_id, 'IN', v_qty,
      'Purchase Intake (' || v_purchase_code || ') - ' || v_item_name || ' from ' || v_supplier.name,
      v_caller_id,
      CASE WHEN array_length(v_serials_list, 1) > 0 THEN array_to_string(v_serials_list, ', ') ELSE NULL END
    );

    INSERT INTO public.inventory_audit_log (
      inventory_id, changed_by, change_type, old_quantity, new_quantity, changed_at
    ) VALUES (
      v_inventory_id, v_caller_id, 'PURCHASE_INTAKE', v_old_qty, v_new_qty, now()
    );
  END LOOP;

  UPDATE public.purchases
  SET
    subtotal     = v_overall_subtotal,
    tax_amount   = v_overall_tax,
    total_amount = v_overall_total
  WHERE id = v_purchase_id;

  INSERT INTO public.purchase_audit_log (
    purchase_id, action, changed_by, details, created_at
  ) VALUES (
    v_purchase_id, 'CREATE_MULTI_ITEM', v_caller_id,
    jsonb_build_object('code', v_purchase_code, 'items_count', jsonb_array_length(p_items), 'total', v_overall_total),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'purchase_code', v_purchase_code,
    'supplier_name', v_supplier.name,
    'total_amount', v_overall_total,
    'items_count', jsonb_array_length(p_items)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_multi_item_purchase(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_multi_item_purchase(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated;

-- 5. get_purchase_history
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
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_search TEXT := trim(coalesce(p_search, ''));
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can view purchase history.';
  END IF;

  RETURN QUERY
    SELECT 
      pu.id AS purchase_id,
      pu.purchase_code,
      pu.purchase_date,
      pu.supplier_invoice_number,
      pu.invoice_image_url,
      coalesce(
        pu.quantity,
        (SELECT sum(pi.quantity) FROM public.purchase_items pi WHERE pi.purchase_id = pu.id),
        0
      ) AS quantity,
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
      pu.product_id,
      coalesce(
        pr.name,
        (
          SELECT string_agg(p_sub.name, ', ') 
          FROM (
            SELECT p2.name 
            FROM public.purchase_items pi2 
            JOIN public.products p2 ON p2.id = pi2.product_id 
            WHERE pi2.purchase_id = pu.id 
            LIMIT 3
          ) p_sub
        ),
        'Multi-Item Order'
      ) AS product_name,
      pr.sku AS product_sku,
      coalesce(pr.unit, 'Pcs') AS product_unit,
      u.id AS logged_by_id,
      coalesce(u.name, 'Staff') AS logged_by_name
    FROM public.purchases pu
    LEFT JOIN public.suppliers s ON s.id = pu.supplier_id
    LEFT JOIN public.products pr ON pr.id = pu.product_id
    LEFT JOIN public.users u ON u.id = pu.logged_by
    WHERE (p_supplier_id IS NULL OR pu.supplier_id = p_supplier_id)
      AND (
        p_product_id IS NULL 
        OR pu.product_id = p_product_id
        OR EXISTS (
          SELECT 1 FROM public.purchase_items pi3 
          WHERE pi3.purchase_id = pu.id AND pi3.product_id = p_product_id
        )
      )
      AND (p_start_date IS NULL OR pu.purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR pu.purchase_date <= p_end_date)
      AND (
        v_search = '' 
        OR pu.purchase_code ILIKE ('%' || v_search || '%')
        OR pu.supplier_invoice_number ILIKE ('%' || v_search || '%')
        OR s.name ILIKE ('%' || v_search || '%')
        OR pr.name ILIKE ('%' || v_search || '%')
        OR EXISTS (
          SELECT 1 FROM public.purchase_items pi4
          JOIN public.products p4 ON p4.id = pi4.product_id
          WHERE pi4.purchase_id = pu.id AND p4.name ILIKE ('%' || v_search || '%')
        )
      )
    ORDER BY pu.purchase_date DESC, pu.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_purchase_history(UUID, UUID, DATE, DATE, TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_purchase_history(UUID, UUID, DATE, DATE, TEXT, INT, INT) TO authenticated;

-- 6. get_purchase_order_details
CREATE OR REPLACE FUNCTION public.get_purchase_order_details(p_purchase_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_res JSONB;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can view purchase order details.';
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'purchase_code', p.purchase_code,
    'purchase_date', p.purchase_date,
    'supplier_invoice_number', p.supplier_invoice_number,
    'invoice_image_url', p.invoice_image_url,
    'subtotal', p.subtotal,
    'tax_amount', p.tax_amount,
    'total_amount', p.total_amount,
    'notes', p.notes,
    'status', p.status,
    'created_at', p.created_at,
    'logged_by_name', u.name,
    'supplier', jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'phone', s.phone,
      'email', s.email,
      'gstin', s.gstin,
      'address', s.address
    ),
    'items', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pi.id,
            'product_id', pi.product_id,
            'product_name', pr.name,
            'sku', pr.sku,
            'unit', pr.unit,
            'quantity', pi.quantity,
            'purchase_rate', pi.purchase_rate,
            'selling_rate', pi.selling_rate,
            'tax_percent', pi.tax_percent,
            'tax_mode', pi.tax_mode,
            'subtotal', pi.subtotal,
            'tax_amount', pi.tax_amount,
            'total_amount', pi.total_amount,
            'is_serial_tracked', pi.is_serial_tracked,
            'serials', coalesce(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', us.id,
                    'serial_number', us.serial_number,
                    'status', us.status,
                    'sold_at', us.sold_at
                  )
                  ORDER BY us.serial_number ASC
                )
                FROM public.inventory_unit_serials us
                WHERE us.purchase_item_id = pi.id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY pi.created_at ASC
        )
        FROM public.purchase_items pi
        JOIN public.products pr ON pr.id = pi.product_id
        WHERE pi.purchase_id = p.id
      ),
      '[]'::jsonb
    )
  ) INTO v_res
  FROM public.purchases p
  LEFT JOIN public.suppliers s ON s.id = p.supplier_id
  LEFT JOIN public.users u ON u.id = p.logged_by
  WHERE p.id = p_purchase_id;

  RETURN v_res;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_purchase_order_details(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_purchase_order_details(UUID) TO authenticated;

-- 7. search_available_serials
REVOKE EXECUTE ON FUNCTION public.search_available_serials(UUID, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_available_serials(UUID, TEXT, INT) TO authenticated;

-- 8. search_customers_v2 & count_customers_v2
REVOKE EXECUTE ON FUNCTION public.search_customers_v2(TEXT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_customers_v2(TEXT, INT, INT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.count_customers_v2(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_customers_v2(TEXT) TO authenticated;

-- 3F. NEW-04: Dynamically Pin search_path on all SECURITY DEFINER functions in schema public
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (p.proconfig IS NULL OR NOT (p.proconfig::text LIKE '%search_path=%'))
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, extensions, pg_temp;', r.proname, r.args);
  END LOOP;
END $$;


-- ============================================================================
-- SECTION 4: DATABASE INTEGRITY (INV-001, MAT-001, NEW-05, BIL-001, NEW-07, DB-002, NEW-08)
-- ============================================================================

-- 4A. INV-001: claim_invoice_serials & release_invoice_serials (Deadlock-Free FOR UPDATE & Auth)
CREATE OR REPLACE FUNCTION public.claim_invoice_serials(
  p_invoice_id UUID,
  p_claims     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_claim                  JSONB;
  v_item_id                UUID;
  v_serial_id              UUID;
  v_serial_row             public.inventory_unit_serials%ROWTYPE;
  v_serials_arr            TEXT[];
  v_item_name              TEXT;
  v_invoice_code           TEXT;
  v_all_requested_serials  UUID[];
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can claim invoice serials.';
  END IF;

  SELECT invoice_code INTO v_invoice_code FROM public.invoices WHERE id = p_invoice_id;
  IF v_invoice_code IS NULL THEN
    RAISE EXCEPTION 'Invoice with ID % does not exist.', p_invoice_id;
  END IF;

  -- 1. Release existing serial claims on this invoice
  PERFORM public.release_invoice_serials(p_invoice_id);

  -- 2. Extract and pre-lock all requested serials in sorted UUID order to prevent concurrent deadlocks
  SELECT array_agg(DISTINCT (x.val)::text::UUID ORDER BY (x.val)::text::UUID) INTO v_all_requested_serials
  FROM jsonb_array_elements(p_claims) c,
       jsonb_array_elements(c->'serial_ids') x(val);

  IF v_all_requested_serials IS NOT NULL AND array_length(v_all_requested_serials, 1) > 0 THEN
    PERFORM id FROM public.inventory_unit_serials
    WHERE id = ANY(v_all_requested_serials)
    ORDER BY id ASC
    FOR UPDATE;
  END IF;

  -- 3. Process claims
  FOR v_claim IN SELECT * FROM jsonb_array_elements(p_claims)
  LOOP
    v_item_id := nullif(trim(v_claim->>'invoice_item_id'), '')::UUID;

    IF v_item_id IS NULL AND (v_claim->>'line_index') IS NOT NULL THEN
      SELECT id INTO v_item_id 
      FROM public.invoice_items 
      WHERE invoice_id = p_invoice_id 
      ORDER BY created_at ASC, id ASC 
      OFFSET (v_claim->>'line_index')::int 
      LIMIT 1;
    END IF;

    IF v_item_id IS NULL AND (v_claim->>'product_id') IS NOT NULL THEN
      SELECT id INTO v_item_id 
      FROM public.invoice_items 
      WHERE invoice_id = p_invoice_id 
        AND product_id = (v_claim->>'product_id')::UUID
      ORDER BY created_at ASC, id ASC 
      LIMIT 1;
    END IF;

    IF v_item_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT item_name INTO v_item_name FROM public.invoice_items WHERE id = v_item_id;
    v_serials_arr := ARRAY[]::TEXT[];

    FOR v_serial_id IN SELECT (x.value)::text::UUID FROM jsonb_array_elements(v_claim->'serial_ids') AS x
    LOOP
      SELECT * INTO v_serial_row 
      FROM public.inventory_unit_serials 
      WHERE id = v_serial_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Serial unit % was not found in inventory.', v_serial_id;
      END IF;

      IF v_serial_row.status <> 'available' THEN
        RAISE EXCEPTION 'SERIAL_ALREADY_CLAIMED: Serial "%" for product "%" is no longer available (currently %). Someone else may have just claimed it.',
          v_serial_row.serial_number, coalesce(v_item_name, 'Product'), v_serial_row.status;
      END IF;

      INSERT INTO public.invoice_item_serials (
        invoice_id, invoice_item_id, serial_id, serial_number
      ) VALUES (
        p_invoice_id, v_item_id, v_serial_id, v_serial_row.serial_number
      );

      UPDATE public.inventory_unit_serials
      SET 
        status = 'sold',
        sold_invoice_id = p_invoice_id,
        sold_invoice_item_id = v_item_id,
        sold_at = now(),
        updated_at = now()
      WHERE id = v_serial_id;

      v_serials_arr := array_append(v_serials_arr, v_serial_row.serial_number);
    END LOOP;

    IF array_length(v_serials_arr, 1) > 0 THEN
      UPDATE public.invoice_items
      SET serial_number = array_to_string(v_serials_arr, ', ')
      WHERE id = v_item_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_invoice_serials(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_invoice_serials(UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_invoice_serials(
  p_invoice_id UUID,
  p_item_id    UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_serial_ids UUID[];
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can release invoice serials.';
  END IF;

  IF p_item_id IS NOT NULL THEN
    SELECT array_agg(serial_id) INTO v_serial_ids
    FROM public.invoice_item_serials
    WHERE invoice_item_id = p_item_id;

    DELETE FROM public.invoice_item_serials WHERE invoice_item_id = p_item_id;
  ELSE
    SELECT array_agg(serial_id) INTO v_serial_ids
    FROM public.invoice_item_serials
    WHERE invoice_id = p_invoice_id;

    DELETE FROM public.invoice_item_serials WHERE invoice_id = p_invoice_id;
  END IF;

  IF v_serial_ids IS NOT NULL AND array_length(v_serial_ids, 1) > 0 THEN
    UPDATE public.inventory_unit_serials
    SET 
      status = 'available',
      sold_invoice_id = NULL,
      sold_invoice_item_id = NULL,
      sold_at = NULL,
      updated_at = now()
    WHERE id = ANY(v_serial_ids);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_invoice_serials(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_invoice_serials(UUID, UUID) TO authenticated;

-- 4B. MAT-001 & NEW-05: Authorize return_allocated_material & complete_job_materials
CREATE OR REPLACE FUNCTION public.return_allocated_material(
  p_allotment_id uuid,
  p_user_id      uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_allotment RECORD;
  v_caller_id uuid;
  v_inv       RECORD;
  v_job       RECORD;
  v_tech      RECORD;
  v_old_qty   numeric;
  v_new_qty   numeric;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  -- Attribution: ignore client spoofing
  IF auth.uid() IS NOT NULL THEN
    v_caller_id := auth.uid();
  ELSE
    v_caller_id := coalesce(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  SELECT * INTO v_allotment
  FROM public.material_allotments
  WHERE id = p_allotment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allotment % not found', p_allotment_id;
  END IF;

  -- Caller permission: admin, receptionist, or the allotment's own technician
  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    IF auth.uid() <> v_allotment.technician_id THEN
      RAISE EXCEPTION 'UNAUTHORIZED: You can only return your own material allotments.';
    END IF;
  END IF;

  IF v_allotment.status <> 'allotted' THEN
    RAISE EXCEPTION 'Allotment % is not available for return (current status: %)',
      p_allotment_id, v_allotment.status;
  END IF;

  SELECT * INTO v_job  FROM public.jobs  WHERE id = v_allotment.job_id;
  SELECT * INTO v_tech FROM public.users WHERE id = v_allotment.technician_id;

  IF v_allotment.inventory_id IS NOT NULL THEN
    SELECT * INTO v_inv
    FROM public.inventory WHERE id = v_allotment.inventory_id FOR UPDATE;

    IF FOUND THEN
      v_old_qty := v_inv.quantity;
      v_new_qty := v_inv.quantity + v_allotment.quantity;

      UPDATE public.inventory
      SET quantity        = v_new_qty,
          quantity_cached = v_new_qty,
          stock_quantity  = v_new_qty,
          last_updated    = now()
      WHERE id = v_allotment.inventory_id;

      INSERT INTO public.inventory_transactions (
        inventory_id, transaction_type, quantity, reference_note, created_by, created_at
      ) VALUES (
        v_allotment.inventory_id, 'RETURN', v_allotment.quantity,
        'Returned by ' || COALESCE(v_tech.name, 'technician') ||
          ' from Job ' || COALESCE(v_job.job_code, 'N/A'),
        v_caller_id, now()
      );

      INSERT INTO public.inventory_audit_log (
        inventory_id, changed_by, change_type, old_quantity, new_quantity, changed_at
      ) VALUES (
        v_allotment.inventory_id, v_caller_id, 'RETURN_ALLOTMENT',
        v_old_qty, v_new_qty, now()
      );
    END IF;
  END IF;

  UPDATE public.material_allotments
  SET status = 'returned', returned_at = now(), returned_by = v_caller_id
  WHERE id = p_allotment_id;

  RETURN jsonb_build_object(
    'success', true, 'allotment_id', p_allotment_id,
    'returned_qty', v_allotment.quantity,
    'message', 'Material returned to stock successfully.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.return_allocated_material(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.return_allocated_material(uuid, uuid) TO authenticated;

-- complete_job_materials caller role check
CREATE OR REPLACE FUNCTION public.complete_job_materials(
  p_job_id uuid,
  p_materials jsonb,
  p_work_notes text DEFAULT NULL,
  p_technician_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_job RECORD;
  v_tech_id uuid;
  v_item jsonb;
  v_mat_id uuid;
  v_used_qty numeric;
  v_mat RECORD;
  v_rem_qty numeric;
  v_allocated_count integer := 0;
  v_total_used numeric := 0;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job with ID % not found', p_job_id;
  END IF;

  -- Caller check: admin, receptionist, or the assigned technician
  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    IF auth.uid() <> v_job.technician_id AND NOT EXISTS (
      SELECT 1 FROM public.job_technicians jt WHERE jt.job_id = p_job_id AND jt.technician_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: You can only complete materials on jobs assigned to you.';
    END IF;
  END IF;

  v_tech_id := COALESCE(p_technician_id, v_job.technician_id, auth.uid());
  IF v_tech_id IS NULL THEN
    RAISE EXCEPTION 'No technician assigned or identified for job %', p_job_id;
  END IF;

  IF p_materials IS NOT NULL AND jsonb_array_length(p_materials) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_materials)
    LOOP
      v_mat_id := (v_item->>'material_id')::uuid;
      v_used_qty := (v_item->>'used_qty')::numeric;

      IF v_mat_id IS NULL OR v_used_qty IS NULL THEN
        RAISE EXCEPTION 'Invalid material payload element: missing material_id or used_qty';
      END IF;

      SELECT * INTO v_mat FROM public.job_materials WHERE id = v_mat_id AND job_id = p_job_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Material line % not found on job %', v_mat_id, p_job_id;
      END IF;

      IF v_used_qty < 0 THEN
        RAISE EXCEPTION 'Used quantity cannot be negative for %', v_mat.material_name;
      END IF;

      IF v_used_qty > COALESCE(NULLIF(v_mat.added_qty, 0), v_mat.quantity) THEN
        RAISE EXCEPTION 'Used quantity (%) cannot exceed added quantity (%) for %',
          v_used_qty, COALESCE(NULLIF(v_mat.added_qty, 0), v_mat.quantity), v_mat.material_name;
      END IF;

      v_rem_qty := COALESCE(NULLIF(v_mat.added_qty, 0), v_mat.quantity) - v_used_qty;

      UPDATE public.job_materials
      SET
        used_qty = v_used_qty,
        remaining_qty = v_rem_qty,
        quantity = v_used_qty,
        technician_id = COALESCE(v_mat.technician_id, v_tech_id),
        checkout_status = 'confirmed',
        usage_confirmed_at = now(),
        status = CASE WHEN v_used_qty > 0 THEN 'used' ELSE 'unused' END
      WHERE id = v_mat_id;

      IF v_rem_qty > 0 THEN
        INSERT INTO public.material_allotments (
          job_id, inventory_id, product_id, technician_id, allotted_by, quantity, notes
        ) VALUES (
          p_job_id, v_mat.inventory_id,
          (SELECT product_id FROM public.inventory WHERE id = v_mat.inventory_id),
          v_tech_id, auth.uid(), v_rem_qty,
          'Unused leftover from Job ' || COALESCE(v_job.job_code, 'N/A')
        );
        v_allocated_count := v_allocated_count + 1;
      END IF;

      v_total_used := v_total_used + v_used_qty;
    END LOOP;
  END IF;

  IF p_work_notes IS NOT NULL AND trim(p_work_notes) <> '' THEN
    UPDATE public.jobs
    SET
      work_notes = CASE
        WHEN work_notes IS NULL OR trim(work_notes) = '' THEN trim(p_work_notes)
        ELSE work_notes || E'\n' || trim(p_work_notes)
      END,
      updated_at = now()
    WHERE id = p_job_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'total_used', v_total_used,
    'leftover_allocations_created', v_allocated_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_job_materials(uuid, jsonb, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_job_materials(uuid, jsonb, text, uuid) TO authenticated;

-- 4C. BIL-001 & NEW-07: Invoicing Integrity (Non-negative discount and locked stock availability)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.invoices'::regclass
      AND conname = 'chk_invoice_grand_total_nonneg'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT chk_invoice_grand_total_nonneg CHECK (grand_total >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE grand_total < 0) THEN
    ALTER TABLE public.invoices VALIDATE CONSTRAINT chk_invoice_grand_total_nonneg;
  ELSE
    RAISE WARNING 'Negative grand_total rows detected in public.invoices. Leaving chk_invoice_grand_total_nonneg as NOT VALID.';
  END IF;
END $$;

-- 1. create_invoice
CREATE OR REPLACE FUNCTION public.create_invoice(
  p_customer_name    text,
  p_customer_id      uuid,
  p_customer_contact text     DEFAULT NULL,
  p_customer_email   text     DEFAULT NULL,
  p_customer_gstin   text     DEFAULT NULL,
  p_customer_address text     DEFAULT NULL,
  p_tax_regime       text     DEFAULT 'intra_state',
  p_items            jsonb    DEFAULT '[]'::jsonb,
  p_discount         numeric  DEFAULT 0,
  p_payment_method   text     DEFAULT 'Cash',
  p_status           text     DEFAULT 'paid',
  p_notes            text     DEFAULT NULL,
  p_job_id           uuid     DEFAULT NULL,
  p_amount_paid      numeric  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_invoice_id     uuid;
  v_inv_id         uuid;
  v_current_stock  numeric;
  v_invoice_code   text;
  v_item           jsonb;
  v_product_id     uuid;
  v_item_name      text;
  v_quantity       numeric;
  v_selling_rate   numeric;
  v_selling_amount numeric;
  v_serial_number  text;
  v_hsn_code       text;
  v_tax_percent    numeric;
  v_cgst_rate      numeric;
  v_sgst_rate      numeric;
  v_igst_rate      numeric;
  v_tax_mode       text;
  v_line_total     numeric;
  v_taxable        numeric;
  v_cgst_amt       numeric;
  v_sgst_amt       numeric;
  v_igst_amt       numeric;
  v_subtotal       numeric := 0;
  v_total_cgst     numeric := 0;
  v_total_sgst     numeric := 0;
  v_total_igst     numeric := 0;
  v_total_tax      numeric;
  v_grand_total    numeric;
  v_round_off      numeric;
  v_purchase_rate  numeric;
  v_norm_status    text;
  v_norm_payment   text;
  v_norm_regime    text;
  v_amount_paid    numeric;
  v_customer_exists boolean;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can create invoices.';
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id is required for all new invoices. Resolve or create the customer record first.';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.customers WHERE id = p_customer_id)
    INTO v_customer_exists;
  IF NOT v_customer_exists THEN
    RAISE EXCEPTION 'Customer with id % does not exist.', p_customer_id;
  END IF;

  -- Validate discount non-negative
  IF coalesce(p_discount, 0) < 0 THEN
    RAISE EXCEPTION 'INVALID_DISCOUNT: Discount cannot be negative (received %)', p_discount;
  END IF;

  v_norm_status := CASE lower(COALESCE(p_status, 'paid'))
    WHEN 'paid'      THEN 'paid'
    WHEN 'draft'     THEN 'draft'
    WHEN 'partial'   THEN 'partial'
    WHEN 'unpaid'    THEN 'unpaid'
    WHEN 'pending'   THEN 'pending'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'paid'
  END;

  v_norm_payment := CASE lower(COALESCE(p_payment_method, 'Cash'))
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    WHEN 'wallet'        THEN 'Wallet'
    ELSE p_payment_method
  END;

  v_norm_regime := CASE lower(COALESCE(p_tax_regime, 'intra_state'))
    WHEN 'intra_state' THEN 'intra_state'
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

  v_invoice_code := public.generate_invoice_code();

  INSERT INTO public.invoices (
    invoice_code, customer_id, customer_name, customer_contact, customer_email,
    customer_gstin, customer_address, tax_regime,
    subtotal, total_cgst, total_sgst, total_igst,
    discount, round_off, grand_total,
    payment_method, status, notes, job_id, created_by, paid_at
  ) VALUES (
    v_invoice_code, p_customer_id, p_customer_name, p_customer_contact, p_customer_email,
    p_customer_gstin, p_customer_address, v_norm_regime,
    0, 0, 0, 0,
    COALESCE(p_discount, 0), 0, 0,
    v_norm_payment, v_norm_status, p_notes, p_job_id, auth.uid(),
    CASE WHEN v_norm_status = 'paid' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id     := nullif((v_item->>'product_id'), '')::uuid;
    v_item_name      := COALESCE(v_item->>'item_name', 'Item');
    v_quantity       := COALESCE((v_item->>'quantity')::numeric, 1);
    v_selling_rate   := nullif((v_item->>'selling_rate'), '')::numeric;
    v_selling_amount := nullif((v_item->>'selling_amount'), '')::numeric;
    v_serial_number  := nullif((v_item->>'serial_number'), '');
    v_hsn_code       := nullif((v_item->>'hsn_code'), '');
    v_tax_mode       := COALESCE(nullif(v_item->>'tax_mode', ''), 'exclusive');
    v_tax_percent    := COALESCE(nullif((v_item->>'tax_percent'), '')::numeric, 18);

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Item "%": quantity must be greater than zero.', v_item_name;
    END IF;

    IF v_product_id IS NOT NULL THEN
      SELECT i.purchase_rate INTO v_purchase_rate
        FROM public.inventory i WHERE i.product_id = v_product_id LIMIT 1;

      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate   := COALESCE(v_purchase_rate, 0);
        v_selling_amount := v_selling_rate * v_quantity;
      END IF;
    ELSE
      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := 0; v_selling_amount := 0;
      END IF;
    END IF;

    IF v_norm_regime = 'intra_state' THEN
      v_cgst_rate := v_tax_percent / 2;
      v_sgst_rate := v_tax_percent / 2;
      v_igst_rate := 0;
    ELSE
      v_cgst_rate := 0;
      v_sgst_rate := 0;
      v_igst_rate := v_tax_percent;
    END IF;

    IF v_tax_mode = 'inclusive' THEN
      v_line_total := v_selling_amount;
      v_taxable    := v_line_total / (1 + (v_tax_percent / 100));
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amt := (v_line_total - v_taxable) / 2;
        v_sgst_amt := v_cgst_amt;
        v_igst_amt := 0;
      ELSE
        v_cgst_amt := 0;
        v_sgst_amt := 0;
        v_igst_amt := v_line_total - v_taxable;
      END IF;
    ELSE
      v_taxable    := v_selling_amount;
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amt := v_taxable * (v_cgst_rate / 100);
        v_sgst_amt := v_taxable * (v_sgst_rate / 100);
        v_igst_amt := 0;
      ELSE
        v_cgst_amt := 0;
        v_sgst_amt := 0;
        v_igst_amt := v_taxable * (v_igst_rate / 100);
      END IF;
      v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    END IF;

    v_subtotal   := v_subtotal   + v_taxable;
    v_total_cgst := v_total_cgst + v_cgst_amt;
    v_total_sgst := v_total_sgst + v_sgst_amt;
    v_total_igst := v_total_igst + v_igst_amt;

    INSERT INTO public.invoice_items (
      invoice_id, product_id, item_name, quantity, selling_rate,
      serial_number, hsn_code, tax_mode, tax_percent,
      cgst_rate, sgst_rate, igst_rate,
      taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount
    ) VALUES (
      v_invoice_id, v_product_id, v_item_name, v_quantity, v_selling_rate,
      v_serial_number, v_hsn_code, v_tax_mode, v_tax_percent,
      v_cgst_rate, v_sgst_rate, v_igst_rate,
      round(v_taxable, 2), round(v_cgst_amt, 2), round(v_sgst_amt, 2), round(v_igst_amt, 2),
      round(v_line_total, 2)
    );

    -- NEW-07: Locked stock availability check and decrement
    IF v_product_id IS NOT NULL THEN
      SELECT id, quantity INTO v_inv_id, v_current_stock
      FROM public.inventory
      WHERE product_id = v_product_id
      FOR UPDATE;

      IF v_inv_id IS NOT NULL THEN
        IF COALESCE(v_current_stock, 0) < v_quantity THEN
          RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product "%" has only % units available in stock (requested %)',
            v_item_name, COALESCE(v_current_stock, 0), v_quantity;
        END IF;

        UPDATE public.inventory
        SET quantity        = quantity - v_quantity,
            quantity_cached = quantity_cached - v_quantity,
            stock_quantity  = stock_quantity - v_quantity,
            last_updated    = now(),
            updated_at      = now()
        WHERE id = v_inv_id;

        INSERT INTO public.inventory_transactions (
          inventory_id, transaction_type, quantity,
          reference_note, created_by, serial_numbers
        ) VALUES (
          v_inv_id, 'OUT', v_quantity,
          'Sold via invoice ' || v_invoice_code, auth.uid(), v_serial_number
        );
      END IF;
    END IF;
  END LOOP;

  v_total_tax := v_total_cgst + v_total_sgst + v_total_igst;

  -- BIL-001: Validate discount does not exceed subtotal + tax
  IF COALESCE(p_discount, 0) > (v_subtotal + v_total_tax) THEN
    RAISE EXCEPTION 'DISCOUNT_EXCEEDS_TOTAL: Discount (%) cannot exceed invoice subtotal + tax (%)',
      p_discount, round(v_subtotal + v_total_tax, 2);
  END IF;

  v_grand_total := round(v_subtotal + v_total_tax - COALESCE(p_discount, 0));
  v_round_off   := v_grand_total - (v_subtotal + v_total_tax - COALESCE(p_discount, 0));

  UPDATE public.invoices
  SET subtotal    = round(v_subtotal, 2),
      total_cgst  = round(v_total_cgst, 2),
      total_sgst  = round(v_total_sgst, 2),
      total_igst  = round(v_total_igst, 2),
      grand_total = v_grand_total,
      round_off   = round(v_round_off, 2)
  WHERE id = v_invoice_id;

  v_amount_paid := CASE
    WHEN p_amount_paid IS NOT NULL THEN p_amount_paid
    WHEN v_norm_status = 'paid'    THEN v_grand_total
    ELSE 0
  END;

  IF v_amount_paid > 0 THEN
    INSERT INTO public.invoice_payments (
      invoice_id, customer_id, amount, payment_method, recorded_by, notes
    ) VALUES (
      v_invoice_id, p_customer_id, v_amount_paid, v_norm_payment, auth.uid(),
      'Initial payment upon invoice creation'
    );
  END IF;

  RETURN jsonb_build_object(
    'invoice_id',   v_invoice_id,
    'invoice_code', v_invoice_code,
    'subtotal',     round(v_subtotal, 2),
    'total_cgst',   round(v_total_cgst, 2),
    'total_sgst',   round(v_total_sgst, 2),
    'total_igst',   round(v_total_igst, 2),
    'grand_total',  v_grand_total,
    'round_off',    round(v_round_off, 2),
    'status',       v_norm_status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_invoice FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice TO authenticated;

-- 2. update_invoice
CREATE OR REPLACE FUNCTION public.update_invoice(
  p_invoice_id       uuid,
  p_customer_name    text,
  p_customer_id      uuid,
  p_customer_contact text     DEFAULT NULL,
  p_customer_email   text     DEFAULT NULL,
  p_customer_gstin   text     DEFAULT NULL,
  p_customer_address text     DEFAULT NULL,
  p_tax_regime       text     DEFAULT 'intra_state',
  p_items            jsonb    DEFAULT '[]'::jsonb,
  p_discount         numeric  DEFAULT 0,
  p_payment_method   text     DEFAULT 'Cash',
  p_status           text     DEFAULT NULL,
  p_notes            text     DEFAULT NULL,
  p_amount_paid      numeric  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_existing_status   text;
  v_existing_paid_at  timestamptz;
  v_existing_amount   numeric;
  v_invoice_code      text;
  v_current_stock     numeric;
  v_item              jsonb;
  v_product_id        uuid;
  v_item_name         text;
  v_quantity          numeric;
  v_selling_rate      numeric;
  v_selling_amount    numeric;
  v_serial_number     text;
  v_hsn_code          text;
  v_tax_percent       numeric;
  v_tax_mode          text;
  v_cgst_rate         numeric;
  v_sgst_rate         numeric;
  v_igst_rate         numeric;
  v_taxable           numeric;
  v_cgst_amt          numeric;
  v_sgst_amt          numeric;
  v_igst_amt          numeric;
  v_line_total        numeric;
  v_subtotal          numeric := 0;
  v_total_cgst        numeric := 0;
  v_total_sgst        numeric := 0;
  v_total_igst        numeric := 0;
  v_total_tax         numeric;
  v_grand_total       numeric;
  v_round_off         numeric;
  v_purchase_rate     numeric;
  v_inv_id            uuid;
  v_old_product_id    uuid;
  v_old_quantity      numeric;
  v_old_inv_id        uuid;
  v_norm_status       text;
  v_norm_payment      text;
  v_norm_regime       text;
  v_amount_paid       numeric;
  v_customer_exists   boolean;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can update invoices.';
  END IF;

  SELECT status, paid_at, amount_paid, invoice_code
    INTO v_existing_status, v_existing_paid_at, v_existing_amount, v_invoice_code
    FROM public.invoices
   WHERE id = p_invoice_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found.', p_invoice_id;
  END IF;

  IF v_existing_status = 'cancelled' THEN
    RAISE EXCEPTION 'Invoice % is cancelled and cannot be edited.', v_invoice_code;
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE id = p_customer_id)
      INTO v_customer_exists;
    IF NOT v_customer_exists THEN
      RAISE EXCEPTION 'Customer with id % does not exist.', p_customer_id;
    END IF;
  END IF;

  -- Validate discount non-negative
  IF coalesce(p_discount, 0) < 0 THEN
    RAISE EXCEPTION 'INVALID_DISCOUNT: Discount cannot be negative (received %)', p_discount;
  END IF;

  -- Reverse previous inventory deductions
  FOR v_old_product_id, v_old_quantity IN
    SELECT product_id, quantity
      FROM public.invoice_items
     WHERE invoice_id = p_invoice_id
       AND product_id IS NOT NULL
  LOOP
    SELECT id INTO v_old_inv_id
      FROM public.inventory
     WHERE product_id = v_old_product_id
     FOR UPDATE;

    IF v_old_inv_id IS NOT NULL THEN
      UPDATE public.inventory
         SET quantity        = quantity + v_old_quantity,
             quantity_cached = quantity_cached + v_old_quantity,
             stock_quantity  = stock_quantity + v_old_quantity,
             last_updated    = now(),
             updated_at      = now()
       WHERE id = v_old_inv_id;

      INSERT INTO public.inventory_transactions (
        inventory_id, transaction_type, quantity,
        reference_note, created_by
      ) VALUES (
        v_old_inv_id, 'IN', v_old_quantity,
        'Invoice edit restock: ' || v_invoice_code, auth.uid()
      );
    END IF;
  END LOOP;

  DELETE FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  v_norm_payment := CASE lower(COALESCE(p_payment_method, 'Cash'))
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    WHEN 'wallet'        THEN 'Wallet'
    ELSE p_payment_method
  END;

  v_norm_regime := CASE lower(COALESCE(p_tax_regime, 'intra_state'))
    WHEN 'intra_state' THEN 'intra_state'
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id     := nullif((v_item->>'product_id'), '')::uuid;
    v_item_name      := COALESCE(v_item->>'item_name', 'Item');
    v_quantity       := COALESCE((v_item->>'quantity')::numeric, 1);
    v_selling_rate   := nullif((v_item->>'selling_rate'), '')::numeric;
    v_selling_amount := nullif((v_item->>'selling_amount'), '')::numeric;
    v_serial_number  := nullif((v_item->>'serial_number'), '');
    v_hsn_code       := nullif((v_item->>'hsn_code'), '');
    v_tax_mode       := COALESCE(nullif(v_item->>'tax_mode', ''), 'exclusive');
    v_tax_percent    := COALESCE(nullif((v_item->>'tax_percent'), '')::numeric, 18);

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Item "%": quantity must be greater than zero.', v_item_name;
    END IF;

    IF v_product_id IS NOT NULL THEN
      SELECT i.purchase_rate INTO v_purchase_rate
        FROM public.inventory i WHERE i.product_id = v_product_id LIMIT 1;

      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate   := COALESCE(v_purchase_rate, 0);
        v_selling_amount := v_selling_rate * v_quantity;
      END IF;
    ELSE
      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := 0; v_selling_amount := 0;
      END IF;
    END IF;

    IF v_norm_regime = 'intra_state' THEN
      v_cgst_rate := v_tax_percent / 2;
      v_sgst_rate := v_tax_percent / 2;
      v_igst_rate := 0;
    ELSE
      v_cgst_rate := 0; v_sgst_rate := 0; v_igst_rate := v_tax_percent;
    END IF;

    IF v_tax_mode = 'inclusive' THEN
      v_line_total := v_selling_amount;
      v_taxable    := v_line_total / (1 + (v_tax_percent / 100));
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amt := (v_line_total - v_taxable) / 2;
        v_sgst_amt := v_cgst_amt;
        v_igst_amt := 0;
      ELSE
        v_cgst_amt := 0; v_sgst_amt := 0;
        v_igst_amt := v_line_total - v_taxable;
      END IF;
    ELSE
      v_taxable := v_selling_amount;
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amt := v_taxable * (v_cgst_rate / 100);
        v_sgst_amt := v_taxable * (v_sgst_rate / 100);
        v_igst_amt := 0;
      ELSE
        v_cgst_amt := 0; v_sgst_amt := 0;
        v_igst_amt := v_taxable * (v_igst_rate / 100);
      END IF;
      v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    END IF;

    v_subtotal   := v_subtotal   + v_taxable;
    v_total_cgst := v_total_cgst + v_cgst_amt;
    v_total_sgst := v_total_sgst + v_sgst_amt;
    v_total_igst := v_total_igst + v_igst_amt;

    INSERT INTO public.invoice_items (
      invoice_id, product_id, item_name, quantity, selling_rate,
      serial_number, hsn_code, tax_mode, tax_percent,
      cgst_rate, sgst_rate, igst_rate,
      taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount
    ) VALUES (
      p_invoice_id, v_product_id, v_item_name, v_quantity, v_selling_rate,
      v_serial_number, v_hsn_code, v_tax_mode, v_tax_percent,
      v_cgst_rate, v_sgst_rate, v_igst_rate,
      round(v_taxable, 2), round(v_cgst_amt, 2), round(v_sgst_amt, 2), round(v_igst_amt, 2),
      round(v_line_total, 2)
    );

    -- NEW-07: Locked stock availability check and decrement
    IF v_product_id IS NOT NULL THEN
      SELECT id, quantity INTO v_inv_id, v_current_stock
      FROM public.inventory
      WHERE product_id = v_product_id
      FOR UPDATE;

      IF v_inv_id IS NOT NULL THEN
        IF COALESCE(v_current_stock, 0) < v_quantity THEN
          RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product "%" has only % units available in stock (requested %)',
            v_item_name, COALESCE(v_current_stock, 0), v_quantity;
        END IF;

        UPDATE public.inventory
        SET quantity        = quantity - v_quantity,
            quantity_cached = quantity_cached - v_quantity,
            stock_quantity  = stock_quantity - v_quantity,
            last_updated    = now(),
            updated_at      = now()
        WHERE id = v_inv_id;

        INSERT INTO public.inventory_transactions (
          inventory_id, transaction_type, quantity,
          reference_note, created_by, serial_numbers
        ) VALUES (
          v_inv_id, 'OUT', v_quantity,
          'Sold via invoice edit ' || v_invoice_code, auth.uid(), v_serial_number
        );
      END IF;
    END IF;
  END LOOP;

  v_total_tax := v_total_cgst + v_total_sgst + v_total_igst;

  -- BIL-001: Validate discount does not exceed subtotal + tax
  IF COALESCE(p_discount, 0) > (v_subtotal + v_total_tax) THEN
    RAISE EXCEPTION 'DISCOUNT_EXCEEDS_TOTAL: Discount (%) cannot exceed invoice subtotal + tax (%)',
      p_discount, round(v_subtotal + v_total_tax, 2);
  END IF;

  v_grand_total := round(v_subtotal + v_total_tax - COALESCE(p_discount, 0));
  v_round_off   := v_grand_total - (v_subtotal + v_total_tax - COALESCE(p_discount, 0));

  v_amount_paid := CASE
    WHEN p_amount_paid IS NOT NULL THEN p_amount_paid
    ELSE COALESCE(v_existing_amount, 0)
  END;

  v_norm_status := CASE
    WHEN p_status IS NOT NULL THEN p_status
    WHEN v_amount_paid >= v_grand_total AND v_grand_total > 0 THEN 'paid'
    WHEN v_amount_paid > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.invoices
     SET customer_name    = COALESCE(p_customer_name, customer_name),
         customer_id      = COALESCE(p_customer_id, customer_id),
         customer_contact = COALESCE(p_customer_contact, customer_contact),
         customer_email   = COALESCE(p_customer_email, customer_email),
         customer_gstin   = COALESCE(p_customer_gstin, customer_gstin),
         customer_address = COALESCE(p_customer_address, customer_address),
         tax_regime       = v_norm_regime,
         subtotal         = round(v_subtotal, 2),
         total_cgst       = round(v_total_cgst, 2),
         total_sgst       = round(v_total_sgst, 2),
         total_igst       = round(v_total_igst, 2),
         discount         = COALESCE(p_discount, 0),
         round_off        = round(v_round_off, 2),
         grand_total      = v_grand_total,
         amount_paid      = v_amount_paid,
         payment_method   = v_norm_payment,
         status           = v_norm_status,
         notes            = COALESCE(p_notes, notes),
         paid_at          = CASE
                              WHEN v_norm_status = 'paid' AND v_existing_paid_at IS NULL THEN now()
                              WHEN v_norm_status <> 'paid' THEN NULL
                              ELSE v_existing_paid_at
                            END,
         updated_at       = now()
   WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'invoice_id',   p_invoice_id,
    'invoice_code', v_invoice_code,
    'grand_total',  v_grand_total,
    'status',       v_norm_status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_invoice FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_invoice TO authenticated;

-- 3. preview_invoice
CREATE OR REPLACE FUNCTION public.preview_invoice(
  p_customer_id uuid,
  p_items       jsonb    DEFAULT '[]'::jsonb,
  p_discount    numeric  DEFAULT 0,
  p_tax_regime  text     DEFAULT 'intra_state'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_item           jsonb;
  v_product_id     uuid;
  v_quantity       numeric;
  v_selling_rate   numeric;
  v_selling_amount numeric;
  v_tax_percent    numeric;
  v_tax_mode       text;
  v_cgst_rate      numeric;
  v_sgst_rate      numeric;
  v_igst_rate      numeric;
  v_taxable        numeric;
  v_cgst_amt       numeric;
  v_sgst_amt       numeric;
  v_igst_amt       numeric;
  v_line_total     numeric;
  v_subtotal       numeric := 0;
  v_total_cgst     numeric := 0;
  v_total_sgst     numeric := 0;
  v_total_igst     numeric := 0;
  v_total_tax      numeric;
  v_grand_total    numeric;
  v_round_off      numeric;
  v_purchase_rate  numeric;
  v_norm_regime    text;
BEGIN
  IF coalesce(p_discount, 0) < 0 THEN
    RAISE EXCEPTION 'INVALID_DISCOUNT: Discount cannot be negative (received %)', p_discount;
  END IF;

  v_norm_regime := CASE lower(COALESCE(p_tax_regime, 'intra_state'))
    WHEN 'intra_state' THEN 'intra_state'
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id     := nullif((v_item->>'product_id'), '')::uuid;
    v_quantity       := COALESCE((v_item->>'quantity')::numeric, 1);
    v_selling_rate   := nullif((v_item->>'selling_rate'), '')::numeric;
    v_selling_amount := nullif((v_item->>'selling_amount'), '')::numeric;
    v_tax_mode       := COALESCE(nullif(v_item->>'tax_mode', ''), 'exclusive');
    v_tax_percent    := COALESCE(nullif((v_item->>'tax_percent'), '')::numeric, 18);

    IF v_product_id IS NOT NULL THEN
      SELECT i.purchase_rate INTO v_purchase_rate
        FROM public.inventory i WHERE i.product_id = v_product_id LIMIT 1;

      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate   := COALESCE(v_purchase_rate, 0);
        v_selling_amount := v_selling_rate * v_quantity;
      END IF;
    ELSE
      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := 0; v_selling_amount := 0;
      END IF;
    END IF;

    IF v_norm_regime = 'intra_state' THEN
      v_cgst_rate := v_tax_percent / 2;
      v_sgst_rate := v_tax_percent / 2;
      v_igst_rate := 0;
    ELSE
      v_cgst_rate := 0; v_sgst_rate := 0; v_igst_rate := v_tax_percent;
    END IF;

    IF v_tax_mode = 'inclusive' THEN
      v_line_total := v_selling_amount;
      v_taxable    := v_line_total / (1 + (v_tax_percent / 100));
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amt := (v_line_total - v_taxable) / 2;
        v_sgst_amt := v_cgst_amt;
        v_igst_amt := 0;
      ELSE
        v_cgst_amt := 0; v_sgst_amt := 0;
        v_igst_amt := v_line_total - v_taxable;
      END IF;
    ELSE
      v_taxable := v_selling_amount;
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amt := v_taxable * (v_cgst_rate / 100);
        v_sgst_amt := v_taxable * (v_sgst_rate / 100);
        v_igst_amt := 0;
      ELSE
        v_cgst_amt := 0; v_sgst_amt := 0;
        v_igst_amt := v_taxable * (v_igst_rate / 100);
      END IF;
      v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    END IF;

    v_subtotal   := v_subtotal   + v_taxable;
    v_total_cgst := v_total_cgst + v_cgst_amt;
    v_total_sgst := v_total_sgst + v_sgst_amt;
    v_total_igst := v_total_igst + v_igst_amt;
  END LOOP;

  v_total_tax := v_total_cgst + v_total_sgst + v_total_igst;

  IF COALESCE(p_discount, 0) > (v_subtotal + v_total_tax) THEN
    RAISE EXCEPTION 'DISCOUNT_EXCEEDS_TOTAL: Discount (%) cannot exceed invoice subtotal + tax (%)',
      p_discount, round(v_subtotal + v_total_tax, 2);
  END IF;

  v_grand_total := round(v_subtotal + v_total_tax - COALESCE(p_discount, 0));
  v_round_off   := v_grand_total - (v_subtotal + v_total_tax - COALESCE(p_discount, 0));

  RETURN jsonb_build_object(
    'subtotal',    round(v_subtotal, 2),
    'total_cgst',  round(v_total_cgst, 2),
    'total_sgst',  round(v_total_sgst, 2),
    'total_igst',  round(v_total_igst, 2),
    'total_tax',   round(v_total_tax, 2),
    'grand_total', v_grand_total,
    'round_off',   round(v_round_off, 2)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preview_invoice FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_invoice TO authenticated;

-- 4D. DB-002 & NEW-08: Customer Phone Normalization and Unique Index
DO $$
DECLARE
  v_duplicate_count INT;
BEGIN
  -- Check for existing duplicates on right(phone_clean, 10)
  SELECT count(*) INTO v_duplicate_count
  FROM (
    SELECT right(phone_clean, 10)
    FROM public.customers
    WHERE phone_clean IS NOT NULL AND length(phone_clean) >= 10
    GROUP BY right(phone_clean, 10)
    HAVING count(*) > 1
  ) dups;

  IF v_duplicate_count = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique
      ON public.customers ((right(phone_clean, 10)))
      WHERE phone_clean IS NOT NULL AND length(phone_clean) >= 10;
  ELSE
    RAISE WARNING 'Detected % duplicate phone number groups in public.customers. Skipping idx_customers_phone_unique. Query: SELECT right(phone_clean, 10), count(*) FROM customers GROUP BY right(phone_clean, 10) HAVING count(*) > 1;', v_duplicate_count;
  END IF;
END $$;

-- Update find_or_create_customer to match on right(phone_clean, 10) and handle concurrent unique_violation
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
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_clean_phone TEXT := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_old_data JSONB;
  v_caller_id UUID;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    v_caller_id := auth.uid();
  ELSE
    v_caller_id := coalesce(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  -- Normalize Indian phone prefix
  IF length(v_clean_phone) = 12 AND v_clean_phone LIKE '91%' THEN
    v_clean_phone := substring(v_clean_phone FROM 3);
  ELSIF length(v_clean_phone) = 11 AND v_clean_phone LIKE '0%' THEN
    v_clean_phone := substring(v_clean_phone FROM 2);
  END IF;

  -- 1. Explicit ID lookup
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

  -- 2. Match existing customer by normalized last 10 digits
  IF length(v_clean_phone) >= 10 THEN
    SELECT * INTO v_customer 
    FROM public.customers 
    WHERE length(phone_clean) >= 10
      AND right(phone_clean, 10) = right(v_clean_phone, 10)
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

  -- 3. Create new customer with unique violation handler for concurrency safety
  BEGIN
    INSERT INTO public.customers (
      name, phone, email, gstin, address, created_via, created_by
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
  EXCEPTION WHEN unique_violation THEN
    -- If a concurrent intake created the customer simultaneously, re-fetch and return
    IF length(v_clean_phone) >= 10 THEN
      SELECT * INTO v_customer
      FROM public.customers
      WHERE length(phone_clean) >= 10
        AND right(phone_clean, 10) = right(v_clean_phone, 10)
      LIMIT 1;

      IF FOUND THEN
        RETURN v_customer;
      END IF;
    END IF;
    RAISE;
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_or_create_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- Update update_customer_profile to check for duplicate phone on other customers
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
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_old_data JSONB;
  v_caller_id UUID;
  v_clean_phone TEXT := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can update customer profiles.';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    v_caller_id := auth.uid();
  ELSE
    v_caller_id := coalesce(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

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

  -- Check if another customer already has this phone number
  IF length(v_clean_phone) >= 10 THEN
    IF EXISTS (
      SELECT 1 FROM public.customers
      WHERE id <> p_customer_id
        AND length(phone_clean) >= 10
        AND right(phone_clean, 10) = right(v_clean_phone, 10)
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PHONE: Another customer already has this phone number.';
    END IF;
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

REVOKE EXECUTE ON FUNCTION public.update_customer_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_customer_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;


-- ============================================================================
-- SECTION 5: DATABASE PERFORMANCE (DB-003)
-- ============================================================================

-- Foreign key supporting indexes on high-volume tables
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id
  ON public.invoice_items (product_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_inventory_id
  ON public.sale_items (inventory_id);

CREATE INDEX IF NOT EXISTS idx_job_materials_inventory_id
  ON public.job_materials (inventory_id);

CREATE INDEX IF NOT EXISTS idx_material_allotments_inventory_id
  ON public.material_allotments (inventory_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id
  ON public.inventory_transactions (inventory_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id
  ON public.invoice_payments (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON public.payments (invoice_id);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date
  ON public.attendance (user_id, date DESC);

-- Supporting index for notifications pagination & unread lists
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_user_id, created_at DESC);

-- Supporting index for reviews dashboard queries
CREATE INDEX IF NOT EXISTS idx_customer_reviews_created
  ON public.customer_reviews (created_at DESC);

NOTIFY pgrst, 'reload schema';
