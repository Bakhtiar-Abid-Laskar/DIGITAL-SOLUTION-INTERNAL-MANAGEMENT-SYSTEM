-- Migration: 20260818000003_fix_create_invoice_serial_number.sql
-- Description: Drop all overloads of create_invoice and recreate a single clean version
--              that persists serial_number per invoice_item.

-- Drop ALL overloads so there is no ambiguity for PostgREST
DROP FUNCTION IF EXISTS public.create_invoice(
  text, text, text, text, text,
  jsonb, numeric, text, text, text, uuid
);
DROP FUNCTION IF EXISTS public.create_invoice(
  text, text, text, text, text,
  text, numeric, numeric, text, uuid, text, jsonb
);
-- Also drop any other potential overloads by name (broadest possible)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_invoice'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_invoice(
  p_customer_name     text,
  p_customer_contact  text    DEFAULT NULL,
  p_customer_email    text    DEFAULT NULL,
  p_customer_gstin    text    DEFAULT NULL,
  p_tax_regime        text    DEFAULT 'intra_state',
  p_items             jsonb   DEFAULT '[]',
  p_discount          numeric DEFAULT 0,
  p_payment_method    text    DEFAULT 'Cash',
  p_status            text    DEFAULT 'paid',
  p_notes             text    DEFAULT NULL,
  p_job_id            uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_invoice_id        uuid;
  v_invoice_code      text;
  v_item              jsonb;
  v_product_id        uuid;
  v_item_name         text;
  v_quantity          numeric;
  v_selling_rate      numeric;
  v_selling_amount    numeric;
  v_serial_number     text;
  v_cgst_rate         numeric;
  v_sgst_rate         numeric;
  v_igst_rate         numeric;
  v_tax_mode          text;
  v_line_total        numeric;
  v_taxable           numeric;
  v_cgst_amt          numeric;
  v_sgst_amt          numeric;
  v_igst_amt          numeric;
  v_subtotal          numeric := 0;
  v_total_cgst        numeric := 0;
  v_total_sgst        numeric := 0;
  v_total_igst        numeric := 0;
  v_total_tax         numeric := 0;
  v_grand_total       numeric;
  v_round_off         numeric;
  v_purchase_rate     numeric;
  v_norm_status       text;
  v_norm_payment      text;
  v_norm_regime       text;
BEGIN
  -- Auth guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Normalize status
  v_norm_status := CASE lower(p_status)
    WHEN 'paid'      THEN 'paid'
    WHEN 'draft'     THEN 'draft'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'paid'
  END;

  -- Normalize payment method
  v_norm_payment := CASE lower(p_payment_method)
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    ELSE p_payment_method
  END;

  -- Normalize tax regime
  v_norm_regime := CASE lower(p_tax_regime)
    WHEN 'intra_state' THEN 'intra_state'
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

  -- Generate invoice code
  v_invoice_code := public.generate_invoice_code();

  -- Create the invoice header
  INSERT INTO public.invoices (
    invoice_code,
    customer_name,
    customer_contact,
    customer_email,
    customer_gstin,
    tax_regime,
    subtotal,
    total_cgst,
    total_sgst,
    total_igst,
    discount,
    round_off,
    grand_total,
    payment_method,
    status,
    notes,
    job_id,
    created_by,
    paid_at
  ) VALUES (
    v_invoice_code,
    p_customer_name,
    p_customer_contact,
    p_customer_email,
    p_customer_gstin,
    v_norm_regime,
    0, 0, 0, 0,
    COALESCE(p_discount, 0),
    0, 0,
    v_norm_payment,
    v_norm_status,
    p_notes,
    p_job_id,
    auth.uid(),
    CASE WHEN v_norm_status = 'paid' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_invoice_id;

  -- Process each line item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id    := NULLIF((v_item->>'product_id'), '')::uuid;
    v_item_name     := COALESCE(v_item->>'item_name', 'Item');
    v_quantity      := COALESCE((v_item->>'quantity')::numeric, 1);
    v_selling_rate  := NULLIF((v_item->>'selling_rate'), '')::numeric;
    v_selling_amount:= NULLIF((v_item->>'selling_amount'), '')::numeric;
    v_serial_number := NULLIF((v_item->>'serial_number'), '');
    v_cgst_rate     := COALESCE(NULLIF((v_item->>'cgst_rate'), '')::numeric, 0);
    v_sgst_rate     := COALESCE(NULLIF((v_item->>'sgst_rate'), '')::numeric, 0);
    v_igst_rate     := COALESCE(NULLIF((v_item->>'igst_rate'), '')::numeric, 0);
    v_tax_mode      := COALESCE(NULLIF(v_item->>'tax_mode', ''), 'exclusive');

    -- Derive rate/amount from product if not given
    IF v_product_id IS NOT NULL THEN
      SELECT i.purchase_rate INTO v_purchase_rate
      FROM public.inventory i
      WHERE i.product_id = v_product_id
      LIMIT 1;

      -- Use product selling price if not provided
      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := COALESCE(v_purchase_rate, 0);
        v_selling_amount := v_selling_rate * v_quantity;
      END IF;

      -- Get tax rates from product
      SELECT
        COALESCE(p.cgst_rate, 9),
        COALESCE(p.sgst_rate, 9),
        COALESCE(p.igst_rate, 18),
        COALESCE(p.tax_mode, 'exclusive')
      INTO v_cgst_rate, v_sgst_rate, v_igst_rate, v_tax_mode
      FROM public.products p
      WHERE p.id = v_product_id;
    ELSE
      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := 0;
        v_selling_amount := 0;
      END IF;
    END IF;

    -- Compute tax based on regime
    IF v_norm_regime = 'inter_state' THEN
      v_cgst_rate := 0;
      v_sgst_rate := 0;
    ELSE
      v_igst_rate := 0;
    END IF;

    -- Compute taxable & line amounts
    IF v_tax_mode = 'inclusive' THEN
      DECLARE
        v_combined_rate numeric := v_cgst_rate + v_sgst_rate + v_igst_rate;
      BEGIN
        v_taxable  := ROUND(v_selling_amount / (1 + v_combined_rate / 100), 2);
        v_cgst_amt := ROUND(v_taxable * v_cgst_rate / 100, 2);
        v_sgst_amt := ROUND(v_taxable * v_sgst_rate / 100, 2);
        v_igst_amt := ROUND(v_taxable * v_igst_rate / 100, 2);
        v_line_total := v_selling_amount;
      END;
    ELSE
      v_taxable  := COALESCE(v_selling_amount, 0);
      v_cgst_amt := ROUND(v_taxable * v_cgst_rate / 100, 2);
      v_sgst_amt := ROUND(v_taxable * v_sgst_rate / 100, 2);
      v_igst_amt := ROUND(v_taxable * v_igst_rate / 100, 2);
      v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    END IF;

    -- Accumulate totals
    v_subtotal   := v_subtotal   + COALESCE(v_taxable, 0);
    v_total_cgst := v_total_cgst + v_cgst_amt;
    v_total_sgst := v_total_sgst + v_sgst_amt;
    v_total_igst := v_total_igst + v_igst_amt;
    v_total_tax  := v_total_tax  + v_cgst_amt + v_sgst_amt + v_igst_amt;

    -- Insert line item (with serial_number)
    INSERT INTO public.invoice_items (
      invoice_id,
      product_id,
      item_name,
      quantity,
      selling_rate,
      serial_number,
      cgst_rate,
      sgst_rate,
      igst_rate,
      taxable_amount,
      cgst_amount,
      sgst_amount,
      igst_amount,
      discount_amount,
      line_total
    ) VALUES (
      v_invoice_id,
      v_product_id,
      v_item_name,
      v_quantity,
      COALESCE(v_selling_rate, 0),
      v_serial_number,
      v_cgst_rate,
      v_sgst_rate,
      v_igst_rate,
      COALESCE(v_taxable, 0),
      v_cgst_amt,
      v_sgst_amt,
      v_igst_amt,
      0,
      v_line_total
    );

    -- Deduct inventory if product linked
    -- (mirrors add_stock RPC pattern: uses quantity_cached on products-based inventory)
    IF v_product_id IS NOT NULL THEN
      UPDATE public.inventory
      SET
        quantity_cached = GREATEST(COALESCE(quantity_cached, 0) - v_quantity, 0),
        last_updated    = now()
      WHERE product_id = v_product_id;
    END IF;
  END LOOP;

  -- Grand total
  v_grand_total := v_subtotal + v_total_tax - COALESCE(p_discount, 0);
  v_round_off   := ROUND(v_grand_total) - v_grand_total;
  v_grand_total := ROUND(v_grand_total);

  -- Update invoice header with computed totals
  -- NOTE: total_tax is a generated column (cgst+sgst+igst), do NOT set it explicitly
  UPDATE public.invoices
  SET
    subtotal   = ROUND(v_subtotal, 2),
    total_cgst = ROUND(v_total_cgst, 2),
    total_sgst = ROUND(v_total_sgst, 2),
    total_igst = ROUND(v_total_igst, 2),
    round_off  = ROUND(v_round_off, 2),
    grand_total= v_grand_total
  WHERE id = v_invoice_id;

  RETURN jsonb_build_object(
    'invoice_id',   v_invoice_id,
    'invoice_code', v_invoice_code
  );
END;
$$;

-- Re-grant permissions (they were set in a previous migration but function was recreated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_invoice'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_invoice(text,text,text,text,text,jsonb,numeric,text,text,text,uuid) TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
