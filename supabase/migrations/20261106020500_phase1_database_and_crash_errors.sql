-- ============================================================================
-- Migration: 20261106020500_phase1_database_and_crash_errors.sql
-- Description: Phase 1 — Database and Crash Errors
--
-- Error A: Add updated_at column to public.users with auto-update trigger
--          to fix schema cache crashes during staff activation, deactivation, and edits.
--
-- Error B: Update invoice_items immutability protection and update_invoice RPC:
--          1. Prevent any modification to paid/finalized invoices (accounting integrity).
--          2. Allow atomic item replacement strictly within update_invoice() for
--             unpaid/draft/pending invoices via transaction-local session config.
--          3. Direct REST updates and deletes on invoice_items remain strictly blocked.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1: Fix Error A (users.updated_at and invoices.updated_at)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill any existing rows
UPDATE public.users 
   SET updated_at = COALESCE(created_at, now()) 
 WHERE updated_at IS NULL;

-- Trigger to maintain updated_at automatically on all future updates
CREATE OR REPLACE FUNCTION public.handle_users_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_users_updated_at();

-- Add updated_at to public.invoices as well (written by update_invoice)
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.invoices 
   SET updated_at = COALESCE(created_at, now()) 
 WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.handle_invoices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoices_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 2: Fix Error B (invoice_items immutability & update_invoice)
-- ─────────────────────────────────────────────────────────────────────────────

-- Update prevent_invoice_item_mutation to permit authorized mutations
-- strictly within the update_invoice() transaction scope.
CREATE OR REPLACE FUNCTION public.prevent_invoice_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check transaction-local config variable set strictly by update_invoice()
  IF current_setting('app.allow_invoice_item_mutation', true) = 'true' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'invoice_items is immutable — updates and deletes are not allowed on finalized invoices or external queries.';
END;
$$;

-- Ensure triggers exist on invoice_items
DROP TRIGGER IF EXISTS trg_prevent_invoice_item_update ON public.invoice_items;
CREATE TRIGGER trg_prevent_invoice_item_update
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_invoice_item_mutation();

DROP TRIGGER IF EXISTS trg_prevent_invoice_item_delete ON public.invoice_items;
CREATE TRIGGER trg_prevent_invoice_item_delete
  BEFORE DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_invoice_item_mutation();

-- Update update_invoice RPC to:
-- 1. Strictly block editing paid or finalized invoices (accounting compliance)
-- 2. Safely authorize invoice_items replacement for draft/pending invoices
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

  -- Strictly block editing finalized/paid invoices for accounting audit compliance
  IF v_existing_status = 'paid' THEN
    RAISE EXCEPTION 'PAID_INVOICE_LOCKED: Invoice % is already PAID and finalized. Line items cannot be modified for accounting integrity.', v_invoice_code;
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

  -- Set transaction-local flag so the immutability trigger allows this authorized update
  PERFORM set_config('app.allow_invoice_item_mutation', 'true', true);

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
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

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
      p_invoice_id, v_product_id, v_item_name, v_quantity, v_selling_rate,
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
          'Sold via invoice edit ' || v_invoice_code, auth.uid(), v_serial_number
        );
      END IF;
    END IF;
  END LOOP;

  v_total_tax := v_total_cgst + v_total_sgst + v_total_igst;

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

GRANT EXECUTE ON FUNCTION public.update_invoice(
  uuid, text, uuid, text, text, text, text, text, jsonb, numeric, text, text, text, numeric
) TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
