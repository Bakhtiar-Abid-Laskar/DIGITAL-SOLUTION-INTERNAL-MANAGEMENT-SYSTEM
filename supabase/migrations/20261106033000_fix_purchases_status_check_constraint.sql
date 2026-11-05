-- ============================================================================
-- Migration: 20261106033000_fix_purchases_status_check_constraint.sql
-- Description: Fix purchases_status_check constraint and log_multi_item_purchase RPC
--
-- Root Cause:
--   The table constraint `purchases_status_check` on `public.purchases` only allowed
--   ('received', 'cancelled'). However, `log_multi_item_purchase` in migration
--   `20261026050000_full_audit_remediation.sql` inserted 'completed' as the status.
--   This caused: ERROR: new row for relation "purchases" violates check constraint "purchases_status_check".
--
-- Solution:
--   1. Widen `purchases_status_check` to allow ('received', 'completed', 'cancelled', 'draft', 'pending').
--   2. Update `log_multi_item_purchase` to use 'received' (matching existing table records and defaults).
--   3. Reload PostgREST schema cache.
-- ============================================================================

-- ─── 1. Widen purchases_status_check constraint ──────────────────────────────
ALTER TABLE public.purchases 
  DROP CONSTRAINT IF EXISTS purchases_status_check;

ALTER TABLE public.purchases 
  ADD CONSTRAINT purchases_status_check 
  CHECK (status IN ('received', 'completed', 'cancelled', 'draft', 'pending'));


-- ─── 2. Update log_multi_item_purchase RPC ───────────────────────────────────
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

  -- Insert purchase header with valid status 'received'
  INSERT INTO public.purchases (
    purchase_code, supplier_id, purchase_date, supplier_invoice_number,
    invoice_image_url, notes, logged_by, created_at, status
  ) VALUES (
    v_purchase_code, v_supplier.id, coalesce(p_purchase_date, current_date),
    nullif(trim(p_supplier_invoice_id), ''), nullif(trim(p_invoice_image_url), ''),
    nullif(trim(p_notes), ''), v_caller_id, now(), 'received'
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

NOTIFY pgrst, 'reload schema';
