-- =============================================================================
-- Migration: 20260905163600_ledger_system_phase1_schema.sql
-- Description:
--   Phase 1 of the Customer Ledger & Pending Payments Overhaul.
--
--   1. Creates public.invoice_payments  — per-installment ledger rows.
--   2. Creates public.customer_wallet_transactions — unallocated advance wallet.
--   3. Creates public.credit_notes      — refund/adjustment records (separate
--      from invoice_payments per confirmed architectural decision).
--   4. Fixes public.create_invoice()    — now requires and stores customer_id.
--      New invoices created without a resolvable customer_id raise a hard error.
--      Existing NULL customer_id rows are NOT backfilled (confirmed decision).
--
--   IMPORTANT: The existing public.payments table (staff payroll / expenditure)
--   is NEVER touched, renamed, or dropped in this migration.
-- =============================================================================

-- ============================================================================
-- SECTION 1 — invoice_payments
--   The true per-installment ledger. One row per payment event on an invoice.
--   Delta amounts only — never cumulative totals.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID        NOT NULL REFERENCES public.invoices(id)   ON DELETE RESTRICT,
  customer_id      UUID        NOT NULL REFERENCES public.customers(id)  ON DELETE RESTRICT,
  amount           NUMERIC     NOT NULL CHECK (amount > 0),
  payment_method   TEXT        NOT NULL,
  reference_number TEXT,
  recorded_by      UUID        NOT NULL REFERENCES public.users(id)      ON DELETE RESTRICT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invoice_payments
  IS 'Per-installment customer payment ledger. Each row is one payment event — delta amount only, never cumulative. The running balance per invoice is derived: invoices.grand_total minus SUM(invoice_payments.amount WHERE invoice_id = ...).';

COMMENT ON COLUMN public.invoice_payments.amount
  IS 'The delta amount paid in this single installment. Never a cumulative total.';

COMMENT ON COLUMN public.invoice_payments.customer_id
  IS 'Denormalized FK to customers for fast per-customer ledger queries without joining through invoices.';

COMMENT ON COLUMN public.invoice_payments.recorded_by
  IS 'The users.id of the staff member who recorded this installment. Always set by the RPC from auth.uid() — never supplied by client code.';

-- Indexes for ledger query patterns
CREATE INDEX IF NOT EXISTS idx_invoice_payments_customer_created
  ON public.invoice_payments (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_created
  ON public.invoice_payments (invoice_id, created_at ASC);

-- RLS
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Admin: full access
DROP POLICY IF EXISTS "invoice_payments_admin_all" ON public.invoice_payments;
CREATE POLICY "invoice_payments_admin_all"
  ON public.invoice_payments FOR ALL TO authenticated
  USING  ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Receptionist: select + insert (no update/delete — immutable ledger)
DROP POLICY IF EXISTS "invoice_payments_receptionist_select" ON public.invoice_payments;
CREATE POLICY "invoice_payments_receptionist_select"
  ON public.invoice_payments FOR SELECT TO authenticated
  USING  ((SELECT public.is_receptionist()));

DROP POLICY IF EXISTS "invoice_payments_receptionist_insert" ON public.invoice_payments;
CREATE POLICY "invoice_payments_receptionist_insert"
  ON public.invoice_payments FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_receptionist()));

-- Technician: no access to payment rows (matches role boundary spec)

-- ============================================================================
-- SECTION 2 — customer_wallet_transactions
--   Unallocated customer advance / wallet. Balance is always derived:
--     SUM(amount WHERE type='deposit')
--   - SUM(amount WHERE type='applied_to_invoice')
--   - SUM(amount WHERE type='refund')
--   There is intentionally NO standalone stored balance column.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_wallet_transactions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID        NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  type                TEXT        NOT NULL CHECK (type IN ('deposit', 'applied_to_invoice', 'refund')),
  amount              NUMERIC     NOT NULL CHECK (amount > 0),
  applied_invoice_id  UUID        REFERENCES public.invoices(id) ON DELETE RESTRICT,
  recorded_by         UUID        NOT NULL REFERENCES public.users(id)     ON DELETE RESTRICT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Enforce: applied_invoice_id must be set iff type = 'applied_to_invoice'
  CONSTRAINT wallet_applied_invoice_consistency CHECK (
    (type = 'applied_to_invoice' AND applied_invoice_id IS NOT NULL) OR
    (type <> 'applied_to_invoice' AND applied_invoice_id IS NULL)
  )
);

COMMENT ON TABLE public.customer_wallet_transactions
  IS 'Unallocated customer advance wallet. Wallet balance = SUM(deposit) - SUM(applied_to_invoice) - SUM(refund) — never a stored editable column. Each row is immutable once inserted.';

COMMENT ON COLUMN public.customer_wallet_transactions.type
  IS 'deposit: cash/UPI received but not yet allocated to any invoice. applied_to_invoice: wallet balance consumed against a specific invoice. refund: amount returned to customer from wallet.';

COMMENT ON COLUMN public.customer_wallet_transactions.applied_invoice_id
  IS 'Only non-NULL when type=applied_to_invoice. Links the wallet application to the specific invoice it paid toward.';

COMMENT ON COLUMN public.customer_wallet_transactions.recorded_by
  IS 'Set from auth.uid() by the RPC — never supplied by client code.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cwt_customer_created
  ON public.customer_wallet_transactions (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cwt_applied_invoice
  ON public.customer_wallet_transactions (applied_invoice_id)
  WHERE applied_invoice_id IS NOT NULL;

-- RLS
ALTER TABLE public.customer_wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cwt_admin_all" ON public.customer_wallet_transactions;
CREATE POLICY "cwt_admin_all"
  ON public.customer_wallet_transactions FOR ALL TO authenticated
  USING  ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "cwt_receptionist_select" ON public.customer_wallet_transactions;
CREATE POLICY "cwt_receptionist_select"
  ON public.customer_wallet_transactions FOR SELECT TO authenticated
  USING  ((SELECT public.is_receptionist()));

DROP POLICY IF EXISTS "cwt_receptionist_insert" ON public.customer_wallet_transactions;
CREATE POLICY "cwt_receptionist_insert"
  ON public.customer_wallet_transactions FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_receptionist()));

-- Technician: no access

-- ============================================================================
-- SECTION 3 — credit_notes
--   Refunds / adjustments. Deliberately separate from invoice_payments and from
--   the wallet — confirmed architectural decision. Does NOT alter amount_paid or
--   any balance column; it is a record of a credit issued, not a payment received.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_notes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID        NOT NULL REFERENCES public.invoices(id)  ON DELETE RESTRICT,
  customer_id  UUID        NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount       NUMERIC     NOT NULL CHECK (amount > 0),
  reason       TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'void')),
  recorded_by  UUID        NOT NULL REFERENCES public.users(id)     ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.credit_notes
  IS 'Refunds and adjustments issued against invoices. Completely separate from invoice_payments. Does NOT affect invoices.amount_paid or any running balance — it is an audit record of a credit, not a payment collection event.';

COMMENT ON COLUMN public.credit_notes.status
  IS 'issued: active credit note. void: nullified (e.g., issued in error). Voiding does not delete the row.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice
  ON public.credit_notes (invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_notes_customer
  ON public.credit_notes (customer_id, created_at DESC);

-- RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_notes_admin_all" ON public.credit_notes;
CREATE POLICY "credit_notes_admin_all"
  ON public.credit_notes FOR ALL TO authenticated
  USING  ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "credit_notes_receptionist_select" ON public.credit_notes;
CREATE POLICY "credit_notes_receptionist_select"
  ON public.credit_notes FOR SELECT TO authenticated
  USING  ((SELECT public.is_receptionist()));

DROP POLICY IF EXISTS "credit_notes_receptionist_insert" ON public.credit_notes;
CREATE POLICY "credit_notes_receptionist_insert"
  ON public.credit_notes FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_receptionist()));

-- ============================================================================
-- SECTION 4 — Fix create_invoice() to require + store customer_id
--   The current create_invoice() does not accept p_customer_id and never sets
--   invoices.customer_id, leaving it NULL for all new invoices.
--   From go-live forward, customer_id is mandatory.
--   Existing NULLs on legacy rows are NOT backfilled (confirmed decision).
-- ============================================================================

-- Drop all existing overloads of create_invoice to eliminate ambiguity
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT oid::regprocedure AS func_sig
    FROM pg_proc
    WHERE proname = 'create_invoice'
      AND pronamespace = 'public'::regnamespace
  ) LOOP
    EXECUTE 'DROP FUNCTION ' || r.func_sig || ' CASCADE';
  END LOOP;
END $$;

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Hard error: customer_id is mandatory for all new invoices
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id is required for all new invoices. Resolve or create the customer record first.';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.customers WHERE id = p_customer_id)
    INTO v_customer_exists;
  IF NOT v_customer_exists THEN
    RAISE EXCEPTION 'Customer with id % does not exist.', p_customer_id;
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
    v_invoice_code,
    p_customer_id,
    p_customer_name,
    p_customer_contact,
    p_customer_email,
    p_customer_gstin,
    p_customer_address,
    v_norm_regime,
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
          'Sold via invoice ' || v_invoice_code, auth.uid(), v_serial_number
        );
      END IF;
    END IF;
  END LOOP;

  v_total_tax   := v_total_cgst + v_total_sgst + v_total_igst;
  v_grand_total := round(v_subtotal + v_total_tax - COALESCE(p_discount, 0));
  v_round_off   := v_grand_total - (v_subtotal + v_total_tax - COALESCE(p_discount, 0));

  v_amount_paid := CASE
    WHEN p_amount_paid IS NOT NULL THEN p_amount_paid
    WHEN v_norm_status = 'paid'    THEN v_grand_total
    ELSE 0
  END;

  IF p_amount_paid IS NOT NULL THEN
    IF p_amount_paid >= v_grand_total AND v_grand_total > 0 THEN
      v_norm_status := 'paid';
    ELSIF p_amount_paid > 0 THEN
      v_norm_status := 'partial';
    ELSE
      v_norm_status := 'draft';
    END IF;
  END IF;

  UPDATE public.invoices
    SET subtotal    = round(v_subtotal, 2),
        total_cgst  = round(v_total_cgst, 2),
        total_sgst  = round(v_total_sgst, 2),
        total_igst  = round(v_total_igst, 2),
        grand_total = v_grand_total,
        round_off   = round(v_round_off, 2),
        amount_paid = v_amount_paid,
        status      = v_norm_status,
        paid_at     = CASE WHEN v_norm_status = 'paid' THEN now() ELSE NULL END
    WHERE id = v_invoice_id;

  -- Opening installment row: if any amount was collected at invoice creation,
  -- seed invoice_payments so the ledger has full history from day one.
  IF v_amount_paid > 0 THEN
    INSERT INTO public.invoice_payments (
      invoice_id,
      customer_id,
      amount,
      payment_method,
      recorded_by,
      notes
    ) VALUES (
      v_invoice_id,
      p_customer_id,
      v_amount_paid,
      v_norm_payment,
      auth.uid(),
      'Initial payment at invoice creation'
    );
  END IF;

  RETURN jsonb_build_object(
    'invoice_id',   v_invoice_id,
    'invoice_code', v_invoice_code,
    'grand_total',  v_grand_total,
    'amount_paid',  v_amount_paid,
    'status',       v_norm_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_invoice(
  text, uuid, text, text, text, text, text, jsonb, numeric, text, text, text, uuid, numeric
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invoice(
  text, uuid, text, text, text, text, text, jsonb, numeric, text, text, text, uuid, numeric
) TO authenticated;

COMMENT ON FUNCTION public.create_invoice(text, uuid, text, text, text, text, text, jsonb, numeric, text, text, text, uuid, numeric)
  IS 'Creates a new invoice with mandatory customer_id linkage. Hard error if customer_id is NULL or not found. Atomically creates invoice, line items, inventory deductions, and the opening invoice_payments ledger row if an initial payment is provided.';

-- ============================================================================
-- SECTION 5 — Grant DML access on new tables to authenticated role
--   Note: RLS policies above restrict access by role.
--   Security-definer RPCs (Phases 2+) bypass RLS automatically.
-- ============================================================================

GRANT SELECT, INSERT ON public.invoice_payments             TO authenticated;
GRANT SELECT, INSERT ON public.customer_wallet_transactions TO authenticated;
GRANT SELECT, INSERT ON public.credit_notes                 TO authenticated;
