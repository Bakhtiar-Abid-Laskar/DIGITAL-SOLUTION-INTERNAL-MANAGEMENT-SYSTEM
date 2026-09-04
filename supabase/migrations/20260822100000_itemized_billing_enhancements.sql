-- =============================================================================
-- Migration: 20260822100000_itemized_billing_enhancements.sql
-- Description:
--   1. Adds device serial_number column to jobs table.
--   2. Adds hsn_code and tax_percent (default 18) to invoice_items table.
--   3. Backfills existing invoice_items with computed tax_percent and product HSN codes.
--   4. Updates create_invoice() and preview_invoice() RPCs to support per-item
--      tax_percent (defaulting to 18%) and snapshotted hsn_code, prioritizing
--      client-edited line rates over product catalog defaults.
-- =============================================================================

-- ─── 1. Schema Extensions ───────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS serial_number text;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS hsn_code text,
  ADD COLUMN IF NOT EXISTS tax_percent numeric DEFAULT 18;

-- ─── 2. Safe Backfill ────────────────────────────────────────────────────────

UPDATE public.invoice_items
SET tax_percent = COALESCE(NULLIF(cgst_rate + sgst_rate, 0), NULLIF(igst_rate, 0), 18)
WHERE tax_percent IS NULL;

-- Allow updating invoice_items temporarily for this migration
alter table public.invoice_items disable trigger trg_prevent_invoice_item_update;

UPDATE public.invoice_items ii
SET hsn_code = p.hsn_sac
FROM public.products p
WHERE ii.product_id = p.id
  AND ii.hsn_code IS NULL
  AND p.hsn_sac IS NOT NULL;

-- Re-enable the immutability trigger
alter table public.invoice_items enable trigger trg_prevent_invoice_item_update;

-- ─── 3. Updated preview_invoice() RPC ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.preview_invoice(
  p_items       jsonb    DEFAULT '[]',
  p_tax_regime  text     DEFAULT 'intra_state',
  p_discount    numeric  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
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
  v_total_tax      numeric := 0;
  v_grand_total    numeric;
  v_round_off      numeric;
  v_norm_regime    text;

  v_items_out      jsonb   := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_norm_regime := CASE lower(p_tax_regime)
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

    -- Resolve default tax_percent (defaults to 18 if not supplied)
    v_tax_percent    := COALESCE(nullif((v_item->>'tax_percent'), '')::numeric, 18);

    -- Resolve rates & HSN from inventory/products if product_id supplied and rate is null
    IF v_product_id IS NOT NULL THEN
      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        SELECT COALESCE(i.purchase_rate, 0) INTO v_selling_rate
        FROM public.inventory i WHERE i.product_id = v_product_id LIMIT 1;
        v_selling_amount := COALESCE(v_selling_rate, 0) * v_quantity;
      END IF;

      -- If hsn_code wasn't explicitly provided, read from products
      IF v_hsn_code IS NULL THEN
        SELECT p.hsn_sac INTO v_hsn_code
        FROM public.products p WHERE p.id = v_product_id;
      END IF;

      -- Only fallback tax_percent to product default if item didn't supply an explicit rate
      IF (v_item->>'tax_percent') IS NULL THEN
        SELECT COALESCE(p.cgst_rate + p.sgst_rate, p.igst_rate, 18) INTO v_tax_percent
        FROM public.products p WHERE p.id = v_product_id;
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

    -- Derive CGST/SGST/IGST rates from unified per-line tax_percent
    IF v_norm_regime = 'inter_state' THEN
      v_cgst_rate := 0;
      v_sgst_rate := 0;
      v_igst_rate := COALESCE(v_tax_percent, 18);
    ELSE
      v_cgst_rate := round(COALESCE(v_tax_percent, 18) / 2, 2);
      v_sgst_rate := round(COALESCE(v_tax_percent, 18) / 2, 2);
      v_igst_rate := 0;
    END IF;

    -- Calculate taxable and tax amounts per item
    IF v_tax_mode = 'inclusive' THEN
      DECLARE v_combined_rate numeric := v_cgst_rate + v_sgst_rate + v_igst_rate;
      BEGIN
        v_taxable    := round(COALESCE(v_selling_amount, 0) / (1 + v_combined_rate / 100), 2);
        v_cgst_amt   := round(v_taxable * v_cgst_rate / 100, 2);
        v_sgst_amt   := round(v_taxable * v_sgst_rate / 100, 2);
        v_igst_amt   := round(v_taxable * v_igst_rate / 100, 2);
        v_line_total := COALESCE(v_selling_amount, 0);
      END;
    ELSE
      v_taxable    := COALESCE(v_selling_amount, 0);
      v_cgst_amt   := round(v_taxable * v_cgst_rate / 100, 2);
      v_sgst_amt   := round(v_taxable * v_sgst_rate / 100, 2);
      v_igst_amt   := round(v_taxable * v_igst_rate / 100, 2);
      v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    END IF;

    v_subtotal   := v_subtotal   + COALESCE(v_taxable, 0);
    v_total_cgst := v_total_cgst + COALESCE(v_cgst_amt, 0);
    v_total_sgst := v_total_sgst + COALESCE(v_sgst_amt, 0);
    v_total_igst := v_total_igst + COALESCE(v_igst_amt, 0);
    v_total_tax  := v_total_tax  + COALESCE(v_cgst_amt, 0) + COALESCE(v_sgst_amt, 0) + COALESCE(v_igst_amt, 0);

    v_items_out := v_items_out || jsonb_build_object(
      'item_name',       v_item_name,
      'quantity',        v_quantity,
      'selling_rate',    COALESCE(v_selling_rate, 0),
      'serial_number',   v_serial_number,
      'hsn_code',        v_hsn_code,
      'tax_percent',     v_tax_percent,
      'taxable_amount',  COALESCE(v_taxable, 0),
      'cgst_rate',       v_cgst_rate,
      'sgst_rate',       v_sgst_rate,
      'igst_rate',       v_igst_rate,
      'cgst_amount',     COALESCE(v_cgst_amt, 0),
      'sgst_amount',     COALESCE(v_sgst_amt, 0),
      'igst_amount',     COALESCE(v_igst_amt, 0),
      'line_total',      COALESCE(v_line_total, 0)
    );
  END LOOP;

  v_grand_total := v_subtotal + v_total_tax - COALESCE(p_discount, 0);
  v_round_off   := round(v_grand_total) - v_grand_total;
  v_grand_total := round(v_grand_total);

  RETURN jsonb_build_object(
    'subtotal',     round(v_subtotal, 2),
    'total_cgst',   round(v_total_cgst, 2),
    'total_sgst',   round(v_total_sgst, 2),
    'total_igst',   round(v_total_igst, 2),
    'total_tax',    round(v_total_tax, 2),
    'discount',     COALESCE(p_discount, 0),
    'round_off',    round(v_round_off, 2),
    'grand_total',  v_grand_total,
    'items',        v_items_out
  );
END;
$$;

-- ─── 4. Updated create_invoice() RPC ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_invoice(
  p_customer_name    text,
  p_customer_contact text     DEFAULT NULL,
  p_customer_email   text     DEFAULT NULL,
  p_customer_gstin   text     DEFAULT NULL,
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
  v_total_tax      numeric := 0;
  v_grand_total    numeric;
  v_round_off      numeric;
  v_purchase_rate  numeric;
  v_norm_status    text;
  v_norm_payment   text;
  v_norm_regime    text;
  v_amount_paid    numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_norm_status := CASE lower(p_status)
    WHEN 'paid'      THEN 'paid'
    WHEN 'draft'     THEN 'draft'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'paid'
  END;

  v_norm_payment := CASE lower(p_payment_method)
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    ELSE p_payment_method
  END;

  v_norm_regime := CASE lower(p_tax_regime)
    WHEN 'intra_state' THEN 'intra_state'
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

  v_invoice_code := public.generate_invoice_code();

  INSERT INTO public.invoices (
    invoice_code, customer_name, customer_contact, customer_email,
    customer_gstin, tax_regime, subtotal, total_cgst, total_sgst, total_igst,
    discount, round_off, grand_total, payment_method, status, notes, job_id,
    created_by, paid_at
  ) VALUES (
    v_invoice_code, p_customer_name, p_customer_contact, p_customer_email,
    p_customer_gstin, v_norm_regime,
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

    -- Resolve default tax_percent (defaults to 18 if not supplied)
    v_tax_percent    := COALESCE(nullif((v_item->>'tax_percent'), '')::numeric, 18);

    IF v_product_id IS NOT NULL THEN
      SELECT i.purchase_rate INTO v_purchase_rate
      FROM public.inventory i WHERE i.product_id = v_product_id LIMIT 1;

      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := COALESCE(v_purchase_rate, 0);
        v_selling_amount := v_selling_rate * v_quantity;
      END IF;

      -- If hsn_code wasn't explicitly provided, read from products
      IF v_hsn_code IS NULL THEN
        SELECT p.hsn_sac INTO v_hsn_code
        FROM public.products p WHERE p.id = v_product_id;
      END IF;

      -- Only fallback tax_percent to product default if item didn't supply an explicit rate
      IF (v_item->>'tax_percent') IS NULL THEN
        SELECT COALESCE(p.cgst_rate + p.sgst_rate, p.igst_rate, 18) INTO v_tax_percent
        FROM public.products p WHERE p.id = v_product_id;
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

    -- Derive CGST/SGST/IGST rates from unified per-line tax_percent
    IF v_norm_regime = 'inter_state' THEN
      v_cgst_rate := 0;
      v_sgst_rate := 0;
      v_igst_rate := COALESCE(v_tax_percent, 18);
    ELSE
      v_cgst_rate := round(COALESCE(v_tax_percent, 18) / 2, 2);
      v_sgst_rate := round(COALESCE(v_tax_percent, 18) / 2, 2);
      v_igst_rate := 0;
    END IF;

    IF v_tax_mode = 'inclusive' THEN
      DECLARE v_combined_rate numeric := v_cgst_rate + v_sgst_rate + v_igst_rate;
      BEGIN
        v_taxable  := round(COALESCE(v_selling_amount, 0) / (1 + v_combined_rate / 100), 2);
        v_cgst_amt := round(v_taxable * v_cgst_rate / 100, 2);
        v_sgst_amt := round(v_taxable * v_sgst_rate / 100, 2);
        v_igst_amt := round(v_taxable * v_igst_rate / 100, 2);
        v_line_total := COALESCE(v_selling_amount, 0);
      END;
    ELSE
      v_taxable    := COALESCE(v_selling_amount, 0);
      v_cgst_amt   := round(v_taxable * v_cgst_rate / 100, 2);
      v_sgst_amt   := round(v_taxable * v_sgst_rate / 100, 2);
      v_igst_amt   := round(v_taxable * v_igst_rate / 100, 2);
      v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    END IF;

    v_subtotal   := v_subtotal   + COALESCE(v_taxable, 0);
    v_total_cgst := v_total_cgst + v_cgst_amt;
    v_total_sgst := v_total_sgst + v_sgst_amt;
    v_total_igst := v_total_igst + v_igst_amt;
    v_total_tax  := v_total_tax  + v_cgst_amt + v_sgst_amt + v_igst_amt;

    INSERT INTO public.invoice_items (
      invoice_id, product_id, item_name, quantity, selling_rate, serial_number,
      hsn_code, tax_percent,
      cgst_rate, sgst_rate, igst_rate, taxable_amount,
      cgst_amount, sgst_amount, igst_amount, discount_amount, line_total
    ) VALUES (
      v_invoice_id, v_product_id, v_item_name, v_quantity,
      COALESCE(v_selling_rate, 0), v_serial_number,
      v_hsn_code, v_tax_percent,
      v_cgst_rate, v_sgst_rate, v_igst_rate,
      COALESCE(v_taxable, 0), v_cgst_amt, v_sgst_amt, v_igst_amt, 0, v_line_total
    );

    IF v_product_id IS NOT NULL THEN
      UPDATE public.inventory
      SET quantity_cached = greatest(COALESCE(quantity_cached, 0) - v_quantity, 0),
          last_updated    = now()
      WHERE product_id = v_product_id;
    END IF;
  END LOOP;

  v_grand_total := v_subtotal + v_total_tax - COALESCE(p_discount, 0);
  v_round_off   := round(v_grand_total) - v_grand_total;
  v_grand_total := round(v_grand_total);

  v_amount_paid := CASE
    WHEN p_amount_paid IS NOT NULL THEN LEAST(GREATEST(p_amount_paid, 0), v_grand_total)
    WHEN v_norm_status = 'paid'    THEN v_grand_total
    ELSE 0
  END;

  UPDATE public.invoices
  SET subtotal    = round(v_subtotal, 2),
      total_cgst  = round(v_total_cgst, 2),
      total_sgst  = round(v_total_sgst, 2),
      total_igst  = round(v_total_igst, 2),
      grand_total = v_grand_total,
      round_off   = round(v_round_off, 2),
      amount_paid = v_amount_paid
  WHERE id = v_invoice_id;

  RETURN jsonb_build_object(
    'invoice_id',   v_invoice_id,
    'invoice_code', v_invoice_code,
    'grand_total',  v_grand_total,
    'amount_paid',  v_amount_paid,
    'status',       v_norm_status
  );
END;
$$;
