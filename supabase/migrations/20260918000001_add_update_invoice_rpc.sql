-- Migration: 20260918000001_add_update_invoice_rpc.sql
-- Description: Creates public.update_invoice() to restore single-RPC authority
--              for invoice edits. Fixes F-JOB-04 / F-BIL-03.
--
-- Before this migration, editing an existing invoice executed three raw client-side
-- mutations (invoices UPDATE + invoice_items DELETE + invoice_items INSERT), which
-- bypassed inventory deduction reversal, inventory_transactions logging, and all
-- other side-effects that create_invoice() enforces.
--
-- After this migration, the web admin must call this RPC for all invoice edits.
-- The RPC:
--   1. Validates the invoice exists and is not cancelled.
--   2. Reverses old inventory deductions (restocks) for each existing item.
--   3. Logs each reversal to inventory_transactions (type='IN', note='Invoice edit reversal').
--   4. Deletes old invoice_items.
--   5. Inserts new invoice_items and applies new inventory deductions using the
--      same tax calculation logic as create_invoice().
--   6. Logs each new deduction to inventory_transactions (type='OUT').
--   7. Updates the invoices header row atomically (totals, status, paid_at).
--   8. Returns { invoice_id, invoice_code, grand_total, status }.
-- ============================================================================

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
  -- 1. Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Validate invoice exists and is not cancelled
  SELECT status, paid_at, amount_paid, invoice_code
    INTO v_existing_status, v_existing_paid_at, v_existing_amount, v_invoice_code
    FROM public.invoices
   WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found.', p_invoice_id;
  END IF;

  IF v_existing_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot edit a cancelled invoice (%).', v_invoice_code;
  END IF;

  -- 3. Validate customer
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id is required for invoice updates.';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.customers WHERE id = p_customer_id)
    INTO v_customer_exists;
  IF NOT v_customer_exists THEN
    RAISE EXCEPTION 'Customer with id % does not exist.', p_customer_id;
  END IF;

  -- 4. Normalise enums
  v_norm_regime := CASE lower(COALESCE(p_tax_regime, 'intra_state'))
    WHEN 'intra_state' THEN 'intra_state'
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

  v_norm_payment := CASE lower(COALESCE(p_payment_method, 'Cash'))
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    WHEN 'wallet'        THEN 'Wallet'
    ELSE p_payment_method
  END;

  v_norm_status := CASE lower(COALESCE(p_status, v_existing_status))
    WHEN 'paid'      THEN 'paid'
    WHEN 'draft'     THEN 'draft'
    WHEN 'partial'   THEN 'partial'
    WHEN 'unpaid'    THEN 'unpaid'
    WHEN 'pending'   THEN 'pending'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE v_existing_status
  END;

  -- 5. Reverse old inventory deductions (restock)
  FOR v_old_product_id, v_old_quantity IN
    SELECT ii.product_id, ii.quantity
      FROM public.invoice_items ii
     WHERE ii.invoice_id = p_invoice_id
       AND ii.product_id IS NOT NULL
  LOOP
    UPDATE public.inventory
       SET quantity        = COALESCE(quantity, 0) + v_old_quantity,
           quantity_cached = COALESCE(quantity_cached, 0) + v_old_quantity,
           stock_quantity  = COALESCE(stock_quantity, quantity_cached, quantity, 0) + v_old_quantity,
           last_updated    = now(),
           updated_at      = now()
     WHERE product_id = v_old_product_id
     RETURNING id INTO v_old_inv_id;

    IF v_old_inv_id IS NOT NULL THEN
      INSERT INTO public.inventory_transactions (
        inventory_id, transaction_type, quantity, reference_note, created_by
      ) VALUES (
        v_old_inv_id, 'IN', v_old_quantity,
        'Invoice edit reversal — ' || v_invoice_code, auth.uid()
      );
    END IF;
  END LOOP;

  -- 6. Delete old invoice items
  DELETE FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  -- 7. Insert new items + new inventory deductions
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

    IF v_product_id IS NOT NULL THEN
      UPDATE public.inventory
         SET quantity        = GREATEST(0, COALESCE(quantity, 0) - v_quantity),
             quantity_cached = GREATEST(0, COALESCE(quantity_cached, 0) - v_quantity),
             stock_quantity  = GREATEST(0, COALESCE(stock_quantity, quantity_cached, quantity, 0) - v_quantity),
             last_updated    = now(),
             updated_at      = now()
       WHERE product_id = v_product_id
       RETURNING id INTO v_inv_id;

      IF v_inv_id IS NOT NULL THEN
        INSERT INTO public.inventory_transactions (
          inventory_id, transaction_type, quantity,
          reference_note, created_by, serial_numbers
        ) VALUES (
          v_inv_id, 'OUT', v_quantity,
          'Invoice edit — ' || v_invoice_code, auth.uid(), v_serial_number
        );
      END IF;
    END IF;
  END LOOP;

  -- 8. Recalculate totals + update invoice header
  v_total_tax   := v_total_cgst + v_total_sgst + v_total_igst;
  v_grand_total := round(v_subtotal + v_total_tax - COALESCE(p_discount, 0));
  v_round_off   := v_grand_total - (v_subtotal + v_total_tax - COALESCE(p_discount, 0));
  v_amount_paid := COALESCE(p_amount_paid, v_existing_amount);

  IF p_amount_paid IS NOT NULL THEN
    IF p_amount_paid >= v_grand_total AND v_grand_total > 0 THEN
      v_norm_status := 'paid';
    ELSIF p_amount_paid > 0 THEN
      v_norm_status := 'partial';
    ELSE
      v_norm_status := COALESCE(p_status, v_existing_status, 'draft');
    END IF;
  END IF;

  UPDATE public.invoices
     SET customer_id      = p_customer_id,
         customer_name    = p_customer_name,
         customer_contact = p_customer_contact,
         customer_email   = p_customer_email,
         customer_gstin   = p_customer_gstin,
         customer_address = p_customer_address,
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
                              WHEN v_norm_status = 'paid'
                              THEN COALESCE(v_existing_paid_at, now())
                              ELSE NULL
                            END,
         updated_at       = now()
   WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'invoice_id',   p_invoice_id,
    'invoice_code', v_invoice_code,
    'grand_total',  v_grand_total,
    'amount_paid',  v_amount_paid,
    'status',       v_norm_status
  );
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.update_invoice(
  uuid, text, uuid, text, text, text, text, text, jsonb, numeric, text, text, text, numeric
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_invoice(
  uuid, text, uuid, text, text, text, text, text, jsonb, numeric, text, text, text, numeric
) TO authenticated;

COMMENT ON FUNCTION public.update_invoice(uuid, text, uuid, text, text, text, text, text, jsonb, numeric, text, text, text, numeric)
  IS 'Atomically edits an existing invoice. Reverses old inventory deductions, deletes old line items, inserts new line items, applies new inventory deductions with full inventory_transactions logging, and updates the invoice header. Prohibited on cancelled invoices. Fixes F-JOB-04 / F-BIL-03.';
