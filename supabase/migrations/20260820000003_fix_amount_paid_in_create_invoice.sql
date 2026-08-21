-- =============================================================================
-- Migration: 20260820000003_fix_amount_paid_in_create_invoice.sql
-- Description:
--   Root-cause fix for "paid invoices appearing in Pending Payments".
--
--   Problem: create_invoice() never wrote amount_paid. The web had a separate
--   best-effort client-side .update({ amount_paid }) that could silently fail.
--   The mobile app never wrote amount_paid at all. Both Pending Payments
--   implementations read balance = grand_total - amount_paid, so every invoice
--   with amount_paid = 0 (including all mobile-created paid invoices) appeared
--   as pending.
--
--   Fix:
--     1. Drop the old create_invoice() overload (adding a param requires drop+recreate).
--     2. Recreate with p_amount_paid numeric DEFAULT NULL.
--     3. Write amount_paid atomically inside the same UPDATE that sets grand_total.
--        - NULL  + status='paid'  → amount_paid = grand_total  (auto-fully-paid)
--        - NULL  + status='draft' → amount_paid = 0            (unpaid)
--        - value provided         → LEAST(value, grand_total)  (explicit, with safety cap)
--     4. Backfill existing rows: status='paid' AND amount_paid=0 → set to grand_total.
--        These are invoices created before this fix. Setting amount_paid=grand_total
--        for them is safe and correct — they were already marked paid; only the
--        tracking column was missing.
-- =============================================================================


-- ─── 1. Drop old function overload ───────────────────────────────────────────
-- Must drop before recreating with a different signature (new p_amount_paid param).
DROP FUNCTION IF EXISTS public.create_invoice(
  text, text, text, text, text, jsonb, numeric, text, text, text, uuid
);


-- ─── 2. Recreate create_invoice() with atomic amount_paid write ───────────────
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
  p_job_id            uuid    DEFAULT NULL,
  p_amount_paid       numeric DEFAULT NULL   -- NEW: explicit amount received; NULL = auto-derive from status
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
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
    v_product_id    := nullif((v_item->>'product_id'), '')::uuid;
    v_item_name     := COALESCE(v_item->>'item_name', 'Item');
    v_quantity      := COALESCE((v_item->>'quantity')::numeric, 1);
    v_selling_rate  := nullif((v_item->>'selling_rate'), '')::numeric;
    v_selling_amount:= nullif((v_item->>'selling_amount'), '')::numeric;
    v_serial_number := nullif((v_item->>'serial_number'), '');
    v_cgst_rate     := COALESCE(nullif((v_item->>'cgst_rate'), '')::numeric, 0);
    v_sgst_rate     := COALESCE(nullif((v_item->>'sgst_rate'), '')::numeric, 0);
    v_igst_rate     := COALESCE(nullif((v_item->>'igst_rate'), '')::numeric, 0);
    v_tax_mode      := COALESCE(nullif(v_item->>'tax_mode', ''), 'exclusive');

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

      SELECT COALESCE(p.cgst_rate, 9), COALESCE(p.sgst_rate, 9),
             COALESCE(p.igst_rate, 18), COALESCE(p.tax_mode, 'exclusive')
      INTO v_cgst_rate, v_sgst_rate, v_igst_rate, v_tax_mode
      FROM public.products p WHERE p.id = v_product_id;
    ELSE
      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := 0; v_selling_amount := 0;
      END IF;
    END IF;

    IF v_norm_regime = 'inter_state' THEN
      v_cgst_rate := 0; v_sgst_rate := 0;
    ELSE
      v_igst_rate := 0;
    END IF;

    IF v_tax_mode = 'inclusive' THEN
      DECLARE v_combined_rate numeric := v_cgst_rate + v_sgst_rate + v_igst_rate;
      BEGIN
        v_taxable  := round(v_selling_amount / (1 + v_combined_rate / 100), 2);
        v_cgst_amt := round(v_taxable * v_cgst_rate / 100, 2);
        v_sgst_amt := round(v_taxable * v_sgst_rate / 100, 2);
        v_igst_amt := round(v_taxable * v_igst_rate / 100, 2);
        v_line_total := v_selling_amount;
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
      cgst_rate, sgst_rate, igst_rate, taxable_amount,
      cgst_amount, sgst_amount, igst_amount, discount_amount, line_total
    ) VALUES (
      v_invoice_id, v_product_id, v_item_name, v_quantity,
      COALESCE(v_selling_rate, 0), v_serial_number,
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

  -- Derive amount_paid atomically:
  --   p_amount_paid explicitly provided → use it, capped at grand_total for safety
  --   p_amount_paid = NULL + status='paid'  → auto-set to grand_total (fully paid)
  --   p_amount_paid = NULL + status='draft' → 0 (unpaid)
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
      round_off   = round(v_round_off, 2),
      grand_total = v_grand_total,
      amount_paid = v_amount_paid          -- ← atomic: same transaction as grand_total
  WHERE id = v_invoice_id;

  RETURN jsonb_build_object('invoice_id', v_invoice_id, 'invoice_code', v_invoice_code);
END;
$$;

-- Restore grant on the new signature
GRANT EXECUTE ON FUNCTION public.create_invoice(
  text, text, text, text, text, jsonb, numeric, text, text, text, uuid, numeric
) TO authenticated;

COMMENT ON FUNCTION public.create_invoice(
  text, text, text, text, text, jsonb, numeric, text, text, text, uuid, numeric
) IS 'Creates a GST invoice atomically. amount_paid is written in the same transaction as grand_total — no separate client-side update needed. Pass p_amount_paid explicitly for partial payments; omit (NULL) to auto-derive from p_status.';


-- ─── 3. Backfill existing invoices ───────────────────────────────────────────
-- Target: invoices where status='paid' but amount_paid=0.
-- These were created before this fix. amount_paid=0 on a paid invoice is
-- definitionally wrong. Setting it to grand_total is safe and correct.
-- Invoices where status='draft' are correctly left at 0 (they are unpaid).
-- Cancelled invoices are intentionally excluded — their amount_paid is irrelevant.
UPDATE public.invoices
SET amount_paid = grand_total
WHERE status = 'paid'
  AND amount_paid = 0
  AND grand_total > 0;

COMMENT ON COLUMN public.invoices.amount_paid
  IS 'Amount actually received from the customer. Written atomically by create_invoice(). For fully paid invoices this equals grand_total. For draft (unpaid) invoices this is 0. For partial payments this is the amount received so far. pending = grand_total - amount_paid.';
