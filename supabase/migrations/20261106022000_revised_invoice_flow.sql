-- ============================================================================
-- Migration: 20261106022000_revised_invoice_flow.sql
-- Description: Revised Invoice Flow for Finalized/Paid Invoices
--
-- Enables issuing revised invoices (e.g., INV-2026-0052-R1) when a customer
-- requires changes to an already paid/finalized bill:
--   1. Adds 'amended' / 'Amended' to public.invoices status check constraint.
--   2. Adds parent_invoice_id, is_revision, and revision_number columns.
--   3. Creates public.create_revised_invoice() RPC that atomically:
--      - Validates original invoice is finalized/paid.
--      - Computes next revision code (e.g. INV-XXXX-R1).
--      - Reverses original inventory deductions with audit log.
--      - Inserts new invoice & invoice_items with new stock deductions.
--      - Transfers payment credit from the original bill.
--      - Marks the original invoice as 'amended' with cross-reference note.
-- ============================================================================

-- 1. Update status constraint on public.invoices to allow 'amended'
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY[
    'paid'::text, 'draft'::text, 'cancelled'::text, 'partial'::text, 'unpaid'::text, 'pending'::text, 'amended'::text,
    'Paid'::text, 'Draft'::text, 'Cancelled'::text, 'Partial'::text, 'Unpaid'::text, 'Pending'::text, 'Amended'::text
  ]));

-- 2. Add revision tracking columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_revision BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS revision_number INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_invoices_parent_invoice_id ON public.invoices(parent_invoice_id);

-- 3. Create public.create_revised_invoice() RPC
CREATE OR REPLACE FUNCTION public.create_revised_invoice(
  p_original_invoice_id uuid,
  p_items               jsonb    DEFAULT '[]'::jsonb,
  p_discount            numeric  DEFAULT 0,
  p_payment_method      text     DEFAULT 'Cash',
  p_notes               text     DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_orig              record;
  v_base_code         text;
  v_rev_count         int;
  v_rev_code          text;
  v_new_invoice_id    uuid := gen_random_uuid();
  v_old_product_id    uuid;
  v_old_quantity      numeric;
  v_old_inv_id        uuid;
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
  v_inv_id            uuid;
  v_current_stock     numeric;
  v_carried_payment   numeric;
  v_new_status        text;
  v_norm_payment      text;
  v_norm_regime       text;
BEGIN
  -- 1. Authorization check
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only administrators and receptionists can issue revised invoices.';
  END IF;

  -- 2. Fetch original invoice with row lock
  SELECT * INTO v_orig
  FROM public.invoices
  WHERE id = p_original_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original invoice % not found.', p_original_invoice_id;
  END IF;

  IF lower(v_orig.status) = 'amended' THEN
    RAISE EXCEPTION 'Invoice % has already been amended by another revision.', v_orig.invoice_code;
  END IF;

  IF lower(v_orig.status) = 'cancelled' THEN
    RAISE EXCEPTION 'Invoice % is cancelled and cannot be revised.', v_orig.invoice_code;
  END IF;

  IF lower(v_orig.status) <> 'paid' THEN
    RAISE EXCEPTION 'Only paid/finalized invoices require revision. Unpaid invoices can be updated directly.';
  END IF;

  -- 3. Compute base code and revision code (e.g. INV-2026-0052-R1)
  -- If original already has -R suffix, strip it to obtain the root code
  v_base_code := regexp_replace(v_orig.invoice_code, '-R[0-9]+$', '', 'i');

  SELECT count(*) INTO v_rev_count
  FROM public.invoices
  WHERE invoice_code LIKE v_base_code || '-R%';

  v_rev_code := v_base_code || '-R' || (v_rev_count + 1);

  -- 4. Reverse original inventory deductions (restock)
  FOR v_old_product_id, v_old_quantity IN
    SELECT product_id, quantity
    FROM public.invoice_items
    WHERE invoice_id = p_original_invoice_id
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
        'Revision reversal restock: ' || v_orig.invoice_code || ' -> ' || v_rev_code, auth.uid()
      );
    END IF;
  END LOOP;

  -- 5. Prepare tax regime and payment method
  v_norm_payment := CASE lower(COALESCE(p_payment_method, v_orig.payment_method, 'Cash'))
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    WHEN 'wallet'        THEN 'Wallet'
    ELSE COALESCE(p_payment_method, 'Cash')
  END;

  v_norm_regime := CASE lower(COALESCE(v_orig.tax_regime, 'intra_state'))
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

  -- 6. Insert new revision invoice header placeholder
  INSERT INTO public.invoices (
    id, invoice_code, job_id, customer_name, customer_id, customer_contact,
    customer_email, customer_gstin, customer_address, tax_regime, subtotal,
    total_cgst, total_sgst, total_igst, total_tax, discount, round_off,
    grand_total, amount_paid, payment_method, status, notes, created_by,
    parent_invoice_id, is_revision, revision_number, created_at, updated_at
  ) VALUES (
    v_new_invoice_id, v_rev_code, v_orig.job_id, v_orig.customer_name, v_orig.customer_id,
    v_orig.customer_contact, v_orig.customer_email, v_orig.customer_gstin, v_orig.customer_address,
    v_norm_regime, 0, 0, 0, 0, 0, COALESCE(p_discount, 0), 0, 0, 0,
    v_norm_payment, 'draft',
    COALESCE(p_notes, '') || ' (Revision of ' || v_orig.invoice_code || ')',
    auth.uid(), v_orig.id, true, v_rev_count + 1, now(), now()
  );

  -- 7. Insert new invoice items and apply deductions
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id     := CASE WHEN (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') <> ''
                             THEN (v_item->>'product_id')::uuid ELSE NULL END;
    v_item_name      := coalesce(trim(v_item->>'item_name'), 'Item');
    v_quantity       := coalesce((v_item->>'quantity')::numeric, 1);
    v_selling_rate   := coalesce((v_item->>'selling_rate')::numeric, (v_item->>'unit_price')::numeric, 0);
    v_selling_amount := v_quantity * v_selling_rate;
    v_serial_number  := NULLIF(trim(coalesce(v_item->>'serial_number', '')), '');
    v_hsn_code       := NULLIF(trim(coalesce(v_item->>'hsn_code', '')), '');
    v_tax_percent    := coalesce((v_item->>'tax_percent')::numeric, 18);
    v_tax_mode       := coalesce(v_item->>'tax_mode', 'exclusive');

    IF v_product_id IS NOT NULL THEN
      SELECT hsn_code, tax_rate INTO v_hsn_code, v_tax_percent
      FROM public.products
      WHERE id = v_product_id;
      v_tax_percent := coalesce(v_tax_percent, 18);
    END IF;

    IF v_tax_mode = 'inclusive' THEN
      v_taxable := v_selling_amount / (1 + (v_tax_percent / 100.0));
    ELSE
      v_taxable := v_selling_amount;
    END IF;

    IF v_norm_regime = 'inter_state' THEN
      v_cgst_rate := 0;
      v_sgst_rate := 0;
      v_igst_rate := v_tax_percent;
      v_cgst_amt  := 0;
      v_sgst_amt  := 0;
      v_igst_amt  := round(v_taxable * (v_igst_rate / 100.0), 2);
    ELSE
      v_cgst_rate := round(v_tax_percent / 2.0, 2);
      v_sgst_rate := round(v_tax_percent / 2.0, 2);
      v_igst_rate := 0;
      v_cgst_amt  := round(v_taxable * (v_cgst_rate / 100.0), 2);
      v_sgst_amt  := round(v_taxable * (v_sgst_rate / 100.0), 2);
      v_igst_amt  := 0;
    END IF;

    v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    v_subtotal   := v_subtotal + v_taxable;
    v_total_cgst := v_total_cgst + v_cgst_amt;
    v_total_sgst := v_total_sgst + v_sgst_amt;
    v_total_igst := v_total_igst + v_igst_amt;

    INSERT INTO public.invoice_items (
      invoice_id, product_id, item_name, quantity, selling_rate,
      serial_number, hsn_code, tax_mode, tax_percent,
      cgst_rate, sgst_rate, igst_rate,
      taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount
    ) VALUES (
      v_new_invoice_id, v_product_id, v_item_name, v_quantity, v_selling_rate,
      v_serial_number, v_hsn_code, v_tax_mode, v_tax_percent,
      v_cgst_rate, v_sgst_rate, v_igst_rate,
      round(v_taxable, 2), round(v_cgst_amt, 2), round(v_sgst_amt, 2), round(v_igst_amt, 2),
      round(v_line_total, 2)
    );

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
          'Sold via invoice revision ' || v_rev_code, auth.uid(), v_serial_number
        );
      END IF;
    END IF;
  END LOOP;

  v_total_tax   := v_total_cgst + v_total_sgst + v_total_igst;
  v_grand_total := round(v_subtotal + v_total_tax - COALESCE(p_discount, 0));
  v_round_off   := v_grand_total - (v_subtotal + v_total_tax - COALESCE(p_discount, 0));

  -- 8. Credit payment from original invoice
  v_carried_payment := COALESCE(v_orig.amount_paid, v_orig.grand_total, 0);

  IF v_carried_payment >= v_grand_total AND v_grand_total > 0 THEN
    v_new_status := 'paid';
  ELSIF v_carried_payment > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;

  -- 9. Update the revision invoice with finalized totals
  UPDATE public.invoices
  SET subtotal       = round(v_subtotal, 2),
      total_cgst     = round(v_total_cgst, 2),
      total_sgst     = round(v_total_sgst, 2),
      total_igst     = round(v_total_igst, 2),
      total_tax      = round(v_total_tax, 2),
      discount       = COALESCE(p_discount, 0),
      round_off      = round(v_round_off, 2),
      grand_total    = v_grand_total,
      amount_paid    = v_carried_payment,
      status         = v_new_status,
      paid_at        = CASE WHEN v_new_status = 'paid' THEN now() ELSE NULL END,
      updated_at     = now()
  WHERE id = v_new_invoice_id;

  -- 10. Mark original invoice as amended
  UPDATE public.invoices
  SET status     = 'amended',
      notes      = COALESCE(notes, '') || E'\n[Amended]: Replaced by revision ' || v_rev_code || ' on ' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS IST'),
      updated_at = now()
  WHERE id = p_original_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_invoice_id', v_new_invoice_id,
    'new_invoice_code', v_rev_code,
    'original_invoice_code', v_orig.invoice_code,
    'grand_total', v_grand_total,
    'amount_paid', v_carried_payment,
    'status', v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_revised_invoice(uuid, jsonb, numeric, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

