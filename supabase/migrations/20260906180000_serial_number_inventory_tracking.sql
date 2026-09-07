-- ============================================================================
-- REPAIRSHOP — SERIAL-NUMBER-TRACKED INVENTORY & MULTI-ITEM PURCHASES
-- Migration: 20260906180000_serial_number_inventory_tracking.sql
--
-- Provides:
--   1. public.purchase_items table (child table for multi-product purchase orders)
--   2. public.inventory_unit_serials table (unit-level serial tracking with status lifecycle)
--   3. public.invoice_item_serials table (enforces 1 serial sold at a time at the DB level)
--   4. Alterations to public.purchases (making single-product columns nullable)
--   5. Backfill of historical purchases into purchase_items
--   6. RPCs:
--      - search_available_serials(p_product_id, p_query, p_limit)
--      - log_multi_item_purchase(...) [Single atomic multi-product purchase transaction]
--      - claim_invoice_serials(p_invoice_id, p_claims)
--      - release_invoice_serials(p_invoice_id, p_item_id)
--      - get_purchase_order_details(p_purchase_id)
--   7. RLS policies and indexes for performance & security
-- ============================================================================

-- ── 0. Ensure Prerequisites (Sequence, Suppliers & Purchases) ────────────────
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

CREATE TABLE IF NOT EXISTS public.purchases (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_code            TEXT UNIQUE NOT NULL DEFAULT public.generate_purchase_code(),
  supplier_id              UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  product_id               UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  inventory_id             UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  purchase_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_invoice_number  TEXT,
  invoice_image_url        TEXT,
  quantity                 NUMERIC,
  purchase_rate            NUMERIC NOT NULL DEFAULT 0,
  selling_rate             NUMERIC DEFAULT 0,
  subtotal                 NUMERIC NOT NULL DEFAULT 0,
  tax_amount               NUMERIC NOT NULL DEFAULT 0,
  total_amount             NUMERIC NOT NULL DEFAULT 0,
  status                   TEXT DEFAULT 'received' CHECK (status IN ('received', 'cancelled')),
  notes                    TEXT,
  logged_by                UUID REFERENCES public.users(id),
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON public.purchases (product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_inventory_id ON public.purchases (inventory_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases (purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases (created_at DESC);

CREATE TABLE IF NOT EXISTS public.purchase_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  changed_by  UUID REFERENCES public.users(id),
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 1. Adjust public.purchases for multi-item support ────────────────────────
ALTER TABLE public.purchases 
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN quantity DROP NOT NULL;

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'received' CHECK (status IN ('received', 'cancelled'));


-- ── 2. public.purchase_items Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id       UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  inventory_id      UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  quantity          NUMERIC NOT NULL CHECK (quantity > 0),
  purchase_rate     NUMERIC NOT NULL DEFAULT 0 CHECK (purchase_rate >= 0),
  selling_rate      NUMERIC DEFAULT 0 CHECK (selling_rate >= 0),
  tax_percent       NUMERIC NOT NULL DEFAULT 18 CHECK (tax_percent >= 0),
  tax_mode          TEXT NOT NULL DEFAULT 'exclusive' CHECK (tax_mode IN ('inclusive', 'exclusive')),
  subtotal          NUMERIC NOT NULL DEFAULT 0,
  tax_amount        NUMERIC NOT NULL DEFAULT 0,
  total_amount      NUMERIC NOT NULL DEFAULT 0,
  is_serial_tracked BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON public.purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_inventory_id ON public.purchase_items(inventory_id);


-- ── 3. Backfill historical single-item purchases into purchase_items ─────────
INSERT INTO public.purchase_items (
  purchase_id, product_id, inventory_id, quantity, purchase_rate, selling_rate,
  subtotal, tax_amount, total_amount, is_serial_tracked, created_at
)
SELECT 
  id, product_id, inventory_id, quantity, purchase_rate, selling_rate,
  subtotal, tax_amount, total_amount, false, created_at
FROM public.purchases
WHERE product_id IS NOT NULL
  AND id NOT IN (SELECT purchase_id FROM public.purchase_items);


-- ── 4. public.inventory_unit_serials Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_unit_serials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number       TEXT NOT NULL,
  serial_number_clean TEXT GENERATED ALWAYS AS (lower(trim(serial_number))) STORED,
  product_id          UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  inventory_id        UUID NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
  purchase_id         UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  purchase_item_id    UUID REFERENCES public.purchase_items(id) ON DELETE SET NULL,
  unit_cost           NUMERIC NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  status              TEXT NOT NULL DEFAULT 'available' 
                      CHECK (status IN ('available', 'reserved', 'sold', 'returned', 'damaged')),
  
  -- Sold metadata
  sold_invoice_id      UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  sold_invoice_item_id UUID REFERENCES public.invoice_items(id) ON DELETE SET NULL,
  sold_at              TIMESTAMPTZ,
  sold_price           NUMERIC DEFAULT 0,

  -- Reservation metadata (active jobs / bench checkouts)
  reserved_job_id      UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  reserved_at          TIMESTAMPTZ,

  created_by          UUID REFERENCES public.users(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),

  -- Hard database constraint: A product can NEVER have duplicate serial numbers
  CONSTRAINT uq_product_serial_number UNIQUE (product_id, serial_number_clean)
);

CREATE INDEX IF NOT EXISTS idx_inventory_serials_product_status 
  ON public.inventory_unit_serials(product_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_serials_inventory_status 
  ON public.inventory_unit_serials(inventory_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_serials_purchase_id 
  ON public.inventory_unit_serials(purchase_id);

CREATE INDEX IF NOT EXISTS idx_inventory_serials_sold_invoice 
  ON public.inventory_unit_serials(sold_invoice_id);

CREATE INDEX IF NOT EXISTS idx_inventory_serials_search 
  ON public.inventory_unit_serials(serial_number_clean);


-- ── 5. public.invoice_item_serials Table ────────────────────────────────────
-- Enforces hard database guarantee: A serial can ONLY be attached to ONE invoice item at a time!
CREATE TABLE IF NOT EXISTS public.invoice_item_serials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_item_id UUID NOT NULL REFERENCES public.invoice_items(id) ON DELETE CASCADE,
  serial_id       UUID NOT NULL REFERENCES public.inventory_unit_serials(id) ON DELETE RESTRICT,
  serial_number   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),

  -- Hard constraint preventing double-sales
  CONSTRAINT uq_invoice_item_serials_serial UNIQUE (serial_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_item_serials_item ON public.invoice_item_serials(invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_item_serials_invoice ON public.invoice_item_serials(invoice_id);


-- ── 6. RLS Policies ─────────────────────────────────────────────────────────
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_unit_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_item_serials ENABLE ROW LEVEL SECURITY;

-- purchase_items policies
DROP POLICY IF EXISTS "purchase_items_admin_receptionist_all" ON public.purchase_items;
CREATE POLICY "purchase_items_admin_receptionist_all"
  ON public.purchase_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'receptionist')
        AND users.is_active = true
    )
  );

-- inventory_unit_serials policies
DROP POLICY IF EXISTS "inventory_serials_admin_receptionist_all" ON public.inventory_unit_serials;
CREATE POLICY "inventory_serials_admin_receptionist_all"
  ON public.inventory_unit_serials FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'receptionist')
        AND users.is_active = true
    )
  );

DROP POLICY IF EXISTS "inventory_serials_technician_select" ON public.inventory_unit_serials;
CREATE POLICY "inventory_serials_technician_select"
  ON public.inventory_unit_serials FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'technician'
        AND users.is_active = true
    )
  );

-- invoice_item_serials policies
DROP POLICY IF EXISTS "invoice_item_serials_admin_receptionist_all" ON public.invoice_item_serials;
CREATE POLICY "invoice_item_serials_admin_receptionist_all"
  ON public.invoice_item_serials FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'receptionist')
        AND users.is_active = true
    )
  );


-- ── 7. RPC: search_available_serials ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_available_serials(
  p_product_id UUID,
  p_query      TEXT DEFAULT NULL,
  p_limit      INT DEFAULT 20
)
RETURNS TABLE (
  id            UUID,
  serial_number TEXT,
  unit_cost     NUMERIC,
  purchase_date DATE,
  supplier_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT := lower(trim(coalesce(p_query, '')));
BEGIN
  RETURN QUERY
    SELECT 
      s.id,
      s.serial_number,
      s.unit_cost,
      p.purchase_date,
      sup.name AS supplier_name
    FROM public.inventory_unit_serials s
    LEFT JOIN public.purchases p ON p.id = s.purchase_id
    LEFT JOIN public.suppliers sup ON sup.id = p.supplier_id
    WHERE s.product_id = p_product_id
      AND s.status = 'available'
      AND (v_q = '' OR s.serial_number_clean LIKE ('%' || v_q || '%'))
    ORDER BY 
      CASE WHEN s.serial_number_clean = v_q THEN 0
           WHEN s.serial_number_clean LIKE (v_q || '%') THEN 1
           ELSE 2
      END,
      s.created_at ASC
    LIMIT coalesce(p_limit, 20);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_available_serials(UUID, TEXT, INT) TO authenticated, anon;


-- ── 8. RPC: log_multi_item_purchase (Atomic Multi-Item Purchase Intake) ─────
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
SET search_path = public
AS $$
DECLARE
  v_supplier          public.suppliers%ROWTYPE;
  v_purchase_id       UUID;
  v_purchase_code     TEXT;
  v_caller_id         UUID := coalesce(p_user_id, auth.uid());
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
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Purchase order must contain at least one product item.';
  END IF;

  -- 1. Resolve Supplier
  v_supplier := public.find_or_create_supplier(
    p_supplier_id => p_supplier_id,
    p_name        => p_supplier_name,
    p_phone       => p_supplier_phone,
    p_email       => p_supplier_email,
    p_gstin       => p_supplier_gstin,
    p_address     => p_supplier_address,
    p_user_id     => v_caller_id
  );

  -- 2. Generate Purchase Code & Create Header
  v_purchase_code := public.generate_purchase_code();

  INSERT INTO public.purchases (
    purchase_code,
    supplier_id,
    purchase_date,
    supplier_invoice_number,
    invoice_image_url,
    subtotal,
    tax_amount,
    total_amount,
    notes,
    logged_by,
    created_at,
    status
  ) VALUES (
    v_purchase_code,
    v_supplier.id,
    coalesce(p_purchase_date, CURRENT_DATE),
    nullif(trim(p_supplier_invoice_id), ''),
    nullif(trim(p_invoice_image_url), ''),
    0, 0, 0,
    nullif(trim(p_notes), ''),
    v_caller_id,
    now(),
    'received'
  ) RETURNING id INTO v_purchase_id;

  -- 3. Process Each Product Line
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_item_name := trim(coalesce(v_item->>'name', v_item->>'product_name', ''));
    v_sku := nullif(trim(v_item->>'sku'), '');
    v_unit := coalesce(nullif(trim(v_item->>'unit'), ''), 'Pcs');
    v_hsn_sac := nullif(trim(v_item->>'hsn_sac'), '');
    v_tax_percent := coalesce((v_item->>'tax_percent')::NUMERIC, 18);
    v_tax_mode := coalesce(nullif(trim(v_item->>'tax_mode'), ''), 'exclusive');
    v_qty := coalesce((v_item->>'quantity')::NUMERIC, 1);
    v_purchase_rate := coalesce((v_item->>'purchase_rate')::NUMERIC, 0);
    v_selling_rate := coalesce((v_item->>'selling_rate')::NUMERIC, 0);
    v_is_tracked := coalesce((v_item->>'is_serial_tracked')::BOOLEAN, true);
    v_serials := coalesce(v_item->'serials', '[]'::jsonb);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Item "%" quantity must be greater than zero (received %)', v_item_name, v_qty;
    END IF;

    -- Validate Serials for Tracked Items
    IF v_is_tracked THEN
      v_serial_count := jsonb_array_length(v_serials);
      IF v_serial_count <> v_qty THEN
        RAISE EXCEPTION 'Item "%": % serial number(s) required, but % provided.', 
          v_item_name, v_qty, v_serial_count;
      END IF;
    END IF;

    -- Resolve Product
    IF v_product_id IS NOT NULL THEN
      SELECT id INTO v_inventory_id FROM public.inventory WHERE product_id = v_product_id LIMIT 1;
    ELSE
      SELECT id INTO v_product_id FROM public.products WHERE lower(trim(name)) = lower(v_item_name) LIMIT 1;
      IF v_product_id IS NOT NULL THEN
        SELECT id INTO v_inventory_id FROM public.inventory WHERE product_id = v_product_id LIMIT 1;
      END IF;
    END IF;

    IF v_product_id IS NULL THEN
      INSERT INTO public.products (
        name, sku, unit, hsn_sac, cgst_rate, sgst_rate, igst_rate, tax_mode, is_active, created_by
      ) VALUES (
        v_item_name,
        v_sku,
        v_unit,
        v_hsn_sac,
        v_tax_percent / 2,
        v_tax_percent / 2,
        v_tax_percent,
        v_tax_mode,
        true,
        v_caller_id
      ) RETURNING id INTO v_product_id;
    END IF;

    IF v_inventory_id IS NULL THEN
      INSERT INTO public.inventory (
        item_name, quantity, quantity_cached, stock_quantity, unit, purchase_rate, selling_rate, product_id, last_updated, updated_at
      ) VALUES (
        v_item_name,
        0, 0, 0,
        v_unit,
        v_purchase_rate,
        v_selling_rate,
        v_product_id,
        now(),
        now()
      ) RETURNING id INTO v_inventory_id;
    END IF;

    -- Calculate Line Amounts
    v_line_subtotal := v_qty * v_purchase_rate;
    v_line_tax := round(v_line_subtotal * (v_tax_percent / 100.0), 2);
    v_line_total := v_line_subtotal + v_line_tax;

    v_overall_subtotal := v_overall_subtotal + v_line_subtotal;
    v_overall_tax := v_overall_tax + v_line_tax;
    v_overall_total := v_overall_total + v_line_total;

    -- Insert Purchase Item
    INSERT INTO public.purchase_items (
      purchase_id, product_id, inventory_id, quantity, purchase_rate, selling_rate,
      tax_percent, tax_mode, subtotal, tax_amount, total_amount, is_serial_tracked
    ) VALUES (
      v_purchase_id, v_product_id, v_inventory_id, v_qty, v_purchase_rate, v_selling_rate,
      v_tax_percent, v_tax_mode, v_line_subtotal, v_line_tax, v_line_total, v_is_tracked
    ) RETURNING id INTO v_item_id;

    -- Insert Serials if Tracked
    v_serials_list := ARRAY[]::TEXT[];
    IF v_is_tracked THEN
      FOR v_serial_text IN SELECT jsonb_array_elements_text(v_serials)
      LOOP
        v_serial_text := trim(v_serial_text);
        v_serial_clean := lower(v_serial_text);

        IF v_serial_text = '' THEN
          RAISE EXCEPTION 'Serial number cannot be blank for product "%"', v_item_name;
        END IF;

        -- Intra-purchase check
        IF v_serial_clean = ANY(SELECT lower(trim(x)) FROM unnest(v_serials_list) AS x) THEN
          RAISE EXCEPTION 'Duplicate serial "%" entered twice within the same purchase for "%"', v_serial_text, v_item_name;
        END IF;

        -- System-wide check for this product
        SELECT id INTO v_existing_id 
        FROM public.inventory_unit_serials 
        WHERE product_id = v_product_id AND serial_number_clean = v_serial_clean;

        IF v_existing_id IS NOT NULL THEN
          RAISE EXCEPTION 'Serial number "%" already exists in the system for product "%".', v_serial_text, v_item_name;
        END IF;

        v_serials_list := array_append(v_serials_list, v_serial_text);

        INSERT INTO public.inventory_unit_serials (
          serial_number, product_id, inventory_id, purchase_id, purchase_item_id,
          unit_cost, status, created_by
        ) VALUES (
          v_serial_text, v_product_id, v_inventory_id, v_purchase_id, v_item_id,
          v_purchase_rate, 'available', v_caller_id
        );
      END LOOP;
    END IF;

    -- Increment Inventory Stock
    SELECT coalesce(quantity, 0) INTO v_old_qty FROM public.inventory WHERE id = v_inventory_id FOR UPDATE;

    UPDATE public.inventory
    SET 
      quantity = coalesce(quantity, 0) + v_qty,
      quantity_cached = coalesce(quantity_cached, 0) + v_qty,
      stock_quantity = coalesce(stock_quantity, 0) + v_qty,
      purchase_rate = v_purchase_rate,
      selling_rate = CASE WHEN v_selling_rate > 0 THEN v_selling_rate ELSE selling_rate END,
      last_updated = now(),
      updated_at = now()
    WHERE id = v_inventory_id
    RETURNING quantity INTO v_new_qty;

    -- Record Transaction Ledger
    INSERT INTO public.inventory_transactions (
      inventory_id, transaction_type, quantity, reference_note, created_by, serial_numbers
    ) VALUES (
      v_inventory_id, 'IN', v_qty,
      'Purchase Intake (' || v_purchase_code || ') - ' || v_item_name || ' from ' || v_supplier.name,
      v_caller_id,
      CASE WHEN array_length(v_serials_list, 1) > 0 THEN array_to_string(v_serials_list, ', ') ELSE NULL END
    );

    -- Audit Log
    INSERT INTO public.inventory_audit_log (
      inventory_id, changed_by, change_type, old_quantity, new_quantity, changed_at
    ) VALUES (
      v_inventory_id, v_caller_id, 'PURCHASE_INTAKE', v_old_qty, v_new_qty, now()
    );
  END LOOP;

  -- 4. Update Header Totals
  UPDATE public.purchases
  SET 
    subtotal = v_overall_subtotal,
    tax_amount = v_overall_tax,
    total_amount = v_overall_total
  WHERE id = v_purchase_id;

  -- Audit Log on Purchase
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

GRANT EXECUTE ON FUNCTION public.log_multi_item_purchase(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, JSONB, UUID
) TO authenticated, anon;


-- ── 9. RPC: claim_invoice_serials (Atomic Serial Selection & Sale Binding) ──
CREATE OR REPLACE FUNCTION public.claim_invoice_serials(
  p_invoice_id UUID,
  p_claims     JSONB -- Array of { invoice_item_id: UUID, serial_ids: [UUID, ...] }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim         JSONB;
  v_item_id       UUID;
  v_serial_id     UUID;
  v_serial_row    public.inventory_unit_serials%ROWTYPE;
  v_serials_arr   TEXT[];
  v_item_name     TEXT;
  v_invoice_code  TEXT;
BEGIN
  SELECT invoice_code INTO v_invoice_code FROM public.invoices WHERE id = p_invoice_id;
  IF v_invoice_code IS NULL THEN
    RAISE EXCEPTION 'Invoice with ID % does not exist.', p_invoice_id;
  END IF;

  -- 1. First release any existing serial claims on this invoice so editing/swapping works seamlessly
  PERFORM public.release_invoice_serials(p_invoice_id);

  -- 2. Process claims
  FOR v_claim IN SELECT * FROM jsonb_array_elements(p_claims)
  LOOP
    v_item_id := (v_claim->>'invoice_item_id')::UUID;
    SELECT item_name INTO v_item_name FROM public.invoice_items WHERE id = v_item_id;
    v_serials_arr := ARRAY[]::TEXT[];

    FOR v_serial_id IN SELECT (x.value)::text::UUID FROM jsonb_array_elements(v_claim->'serial_ids') AS x
    LOOP
      -- Lock serial row FOR UPDATE to guard against simultaneous race conditions
      SELECT * INTO v_serial_row 
      FROM public.inventory_unit_serials 
      WHERE id = v_serial_id 
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Serial unit % was not found in inventory.', v_serial_id;
      END IF;

      IF v_serial_row.status <> 'available' THEN
        RAISE EXCEPTION 'Serial "%" for product "%" is no longer available (currently %). Someone else may have just claimed it.',
          v_serial_row.serial_number, coalesce(v_item_name, 'Product'), v_serial_row.status;
      END IF;

      -- Bind to invoice item
      INSERT INTO public.invoice_item_serials (
        invoice_id, invoice_item_id, serial_id, serial_number
      ) VALUES (
        p_invoice_id, v_item_id, v_serial_id, v_serial_row.serial_number
      );

      -- Update unit serial status
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

    -- Update legacy invoice_items.serial_number string for invoice prints & reports
    IF array_length(v_serials_arr, 1) > 0 THEN
      UPDATE public.invoice_items
      SET serial_number = array_to_string(v_serials_arr, ', ')
      WHERE id = v_item_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invoice_serials(UUID, JSONB) TO authenticated, anon;


-- ── 10. RPC: release_invoice_serials ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.release_invoice_serials(
  p_invoice_id UUID,
  p_item_id    UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serial_ids UUID[];
BEGIN
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

GRANT EXECUTE ON FUNCTION public.release_invoice_serials(UUID, UUID) TO authenticated, anon;


-- ── 11. RPC: get_purchase_order_details ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_purchase_order_details(p_purchase_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res JSONB;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.get_purchase_order_details(UUID) TO authenticated, anon;
