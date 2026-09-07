-- =============================================================================
-- Migration: 20260905170000_ledger_system_phase2_rpc.sql
-- Description:
--   Phase 2 of the Customer Ledger & Pending Payments Overhaul.
--
--   1. Creates public.record_installment_payment()
--        — The replacement for record_payment().
--        — Inserts a new row into invoice_payments (immutable ledger).
--        — Recomputes invoices.amount_paid as SUM(invoice_payments.amount)
--          for the given invoice (additive, never destructive).
--        — Updates invoices.status based on the new running total.
--        — Supports optional wallet application (consumes wallet credit first,
--          then applies cash top-up if needed).
--        — Returns full ledger context: running total, balance_due, installment row.
--
--   2. Creates public.deposit_to_wallet()
--        — Records an unallocated advance from a customer.
--        — Inserts into customer_wallet_transactions (type='deposit').
--        — Returns the new wallet balance.
--
--   3. Creates public.get_customer_ledger()
--        — Returns the per-customer installment ledger as an ordered JSON array
--          (invoice_payments rows joined with invoice + wallet rows, unified view).
--        — Used by both the web admin panel and the mobile ledger screen.
--
--   4. Creates public.get_customer_wallet_balance()
--        — Returns the current unallocated wallet balance for a customer.
--
--   5. Keeps public.record_payment() as a DEPRECATED wrapper that calls
--      record_installment_payment() internally. Removes the old destructive logic.
--      This maintains backward compatibility with existing callers during Phase 3
--      client-code migration.
--
--   IMPORTANT: public.payments (staff payroll) is never touched.
-- =============================================================================


-- ============================================================================
-- FUNCTION 1: public.deposit_to_wallet()
--   Admin/Receptionist can record an unallocated advance from a customer.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deposit_to_wallet(
  p_customer_id    uuid,
  p_amount         numeric,
  p_payment_method text    DEFAULT 'Cash',
  p_notes          text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_caller_role    text;
  v_caller_active  boolean;
  v_customer_exists boolean;
  v_wallet_balance numeric;
  v_txn_id         uuid;
BEGIN
  -- Auth
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT role, is_active INTO v_caller_role, v_caller_active
    FROM public.users WHERE id = auth.uid();

  IF v_caller_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: inactive account';
  END IF;

  IF v_caller_role NOT IN ('admin', 'receptionist') THEN
    RAISE EXCEPTION 'Forbidden: only admin and receptionist can record wallet deposits';
  END IF;

  -- Validate customer
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id is required';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.customers WHERE id = p_customer_id)
    INTO v_customer_exists;
  IF NOT v_customer_exists THEN
    RAISE EXCEPTION 'Customer % not found', p_customer_id;
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Deposit amount must be greater than zero';
  END IF;

  -- Insert wallet deposit row
  INSERT INTO public.customer_wallet_transactions (
    customer_id, type, amount, recorded_by, notes
  ) VALUES (
    p_customer_id, 'deposit', round(p_amount, 2), auth.uid(), p_notes
  )
  RETURNING id INTO v_txn_id;

  -- Derive new wallet balance
  SELECT COALESCE(SUM(CASE WHEN type = 'deposit'            THEN amount ELSE 0 END), 0)
       - COALESCE(SUM(CASE WHEN type = 'applied_to_invoice' THEN amount ELSE 0 END), 0)
       - COALESCE(SUM(CASE WHEN type = 'refund'             THEN amount ELSE 0 END), 0)
    INTO v_wallet_balance
    FROM public.customer_wallet_transactions
    WHERE customer_id = p_customer_id;

  RETURN jsonb_build_object(
    'success',         true,
    'transaction_id',  v_txn_id,
    'customer_id',     p_customer_id,
    'deposited',       round(p_amount, 2),
    'wallet_balance',  v_wallet_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.deposit_to_wallet(uuid, numeric, text, text) TO authenticated;

COMMENT ON FUNCTION public.deposit_to_wallet(uuid, numeric, text, text)
  IS 'Records an unallocated customer advance (wallet deposit). Inserts into customer_wallet_transactions. Returns the new derived wallet balance.';


-- ============================================================================
-- FUNCTION 2: public.get_customer_wallet_balance()
--   Derives current unallocated wallet balance for a customer.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_customer_wallet_balance(
  p_customer_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(CASE WHEN type = 'deposit'            THEN amount ELSE -amount END),
    0
  )
  FROM public.customer_wallet_transactions
  WHERE customer_id = p_customer_id
    AND type IN ('deposit', 'applied_to_invoice', 'refund');
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_wallet_balance(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_customer_wallet_balance(uuid)
  IS 'Returns the current unallocated wallet balance for a customer. Derived: SUM(deposits) - SUM(applied) - SUM(refunds). Never a stored value.';


-- ============================================================================
-- FUNCTION 3: public.record_installment_payment()
--   The core Phase 2 RPC. Replaces record_payment().
--   Additive ledger — never overwrites amount_paid.
--
--   Flow:
--     A. Lock the invoice row (FOR UPDATE).
--     B. Validate bounds: existing paid + this installment <= grand_total.
--     C. Optionally apply wallet credit first (p_apply_wallet_amount).
--     D. Insert installment row(s) into invoice_payments.
--     E. Recompute invoices.amount_paid = SUM(invoice_payments.amount).
--     F. Update invoices.status accordingly.
--     G. Return structured ledger response.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_installment_payment(
  p_invoice_id          uuid,
  p_cash_amount         numeric,              -- Cash/card/UPI tendered now (can be 0 if wallet covers it all)
  p_payment_method      text    DEFAULT 'Cash',
  p_reference_number    text    DEFAULT NULL,
  p_notes               text    DEFAULT NULL,
  p_apply_wallet_amount numeric DEFAULT 0     -- How much wallet credit to consume against this invoice
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_caller_role      text;
  v_caller_active    boolean;
  v_invoice          public.invoices%ROWTYPE;
  v_customer_id      uuid;
  v_grand_total      numeric;
  v_current_paid     numeric;
  v_balance_before   numeric;
  v_wallet_balance   numeric;
  v_total_tendered   numeric;
  v_new_paid_total   numeric;
  v_new_status       text;
  v_norm_payment     text;
  v_cash_row_id      uuid;
  v_wallet_row_id    uuid;
BEGIN
  -- 1. Auth & role check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT role, is_active INTO v_caller_role, v_caller_active
    FROM public.users WHERE id = auth.uid();

  IF v_caller_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: inactive account';
  END IF;

  IF v_caller_role NOT IN ('admin', 'receptionist') THEN
    RAISE EXCEPTION 'Forbidden: only admin and receptionist can record payments';
  END IF;

  -- 2. Validate inputs
  IF p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'invoice_id is required';
  END IF;

  IF p_cash_amount IS NULL OR p_cash_amount < 0 THEN
    RAISE EXCEPTION 'cash_amount must be >= 0';
  END IF;

  IF COALESCE(p_apply_wallet_amount, 0) < 0 THEN
    RAISE EXCEPTION 'apply_wallet_amount must be >= 0';
  END IF;

  IF round(p_cash_amount, 2) = 0 AND round(COALESCE(p_apply_wallet_amount, 0), 2) = 0 THEN
    RAISE EXCEPTION 'At least one of cash_amount or apply_wallet_amount must be > 0';
  END IF;

  -- 3. Lock invoice row
  SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;

  IF v_invoice.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot record payment on a cancelled invoice';
  END IF;

  -- 4. Derive totals from server-side truth
  v_customer_id  := v_invoice.customer_id;
  v_grand_total  := COALESCE(v_invoice.grand_total, 0);

  -- Current paid = SUM of existing installment rows (source of truth)
  SELECT COALESCE(SUM(amount), 0)
    INTO v_current_paid
    FROM public.invoice_payments
    WHERE invoice_id = p_invoice_id;

  v_balance_before := v_grand_total - v_current_paid;

  IF v_balance_before <= 0 THEN
    RAISE EXCEPTION 'Invoice % is already fully paid (balance = 0)', v_invoice.invoice_code;
  END IF;

  -- 5. Validate wallet application
  IF COALESCE(p_apply_wallet_amount, 0) > 0 THEN
    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'Cannot apply wallet: invoice has no linked customer_id';
    END IF;

    v_wallet_balance := public.get_customer_wallet_balance(v_customer_id);

    IF round(p_apply_wallet_amount, 2) > round(v_wallet_balance, 2) THEN
      RAISE EXCEPTION 'Wallet application (%) exceeds available wallet balance (%)',
        round(p_apply_wallet_amount, 2), round(v_wallet_balance, 2);
    END IF;
  END IF;

  -- 6. Bounds check: total tendered must not exceed remaining balance
  v_total_tendered := round(COALESCE(p_cash_amount, 0), 2)
                    + round(COALESCE(p_apply_wallet_amount, 0), 2);

  IF v_total_tendered > v_balance_before THEN
    RAISE EXCEPTION 'Total tendered (%) exceeds remaining balance (%) on invoice %',
      v_total_tendered, round(v_balance_before, 2), v_invoice.invoice_code;
  END IF;

  -- 7. Normalize payment method
  v_norm_payment := CASE lower(COALESCE(p_payment_method, 'Cash'))
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    WHEN 'wallet'        THEN 'Wallet'
    ELSE p_payment_method
  END;

  -- 8a. Insert wallet-portion installment row (if wallet being applied)
  IF round(COALESCE(p_apply_wallet_amount, 0), 2) > 0 THEN
    INSERT INTO public.invoice_payments (
      invoice_id, customer_id, amount, payment_method, reference_number, recorded_by, notes
    ) VALUES (
      p_invoice_id,
      v_customer_id,
      round(p_apply_wallet_amount, 2),
      'Wallet',
      p_reference_number,
      auth.uid(),
      COALESCE(p_notes, 'Applied from customer wallet')
    )
    RETURNING id INTO v_wallet_row_id;

    -- Deduct from wallet
    INSERT INTO public.customer_wallet_transactions (
      customer_id, type, amount, applied_invoice_id, recorded_by, notes
    ) VALUES (
      v_customer_id,
      'applied_to_invoice',
      round(p_apply_wallet_amount, 2),
      p_invoice_id,
      auth.uid(),
      'Applied toward invoice ' || v_invoice.invoice_code
    );
  END IF;

  -- 8b. Insert cash/card/UPI installment row (if cash amount > 0)
  IF round(p_cash_amount, 2) > 0 THEN
    INSERT INTO public.invoice_payments (
      invoice_id, customer_id, amount, payment_method, reference_number, recorded_by, notes
    ) VALUES (
      p_invoice_id,
      v_customer_id,
      round(p_cash_amount, 2),
      v_norm_payment,
      p_reference_number,
      auth.uid(),
      p_notes
    )
    RETURNING id INTO v_cash_row_id;
  END IF;

  -- 9. Recompute amount_paid from source of truth (SUM of all installment rows)
  SELECT COALESCE(SUM(amount), 0)
    INTO v_new_paid_total
    FROM public.invoice_payments
    WHERE invoice_id = p_invoice_id;

  -- 10. Determine new invoice status
  IF v_new_paid_total >= v_grand_total AND v_grand_total > 0 THEN
    v_new_status := 'paid';
  ELSIF v_new_paid_total > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'draft';
  END IF;

  -- 11. Atomically update invoice
  UPDATE public.invoices
    SET amount_paid    = v_new_paid_total,
        status         = v_new_status,
        payment_method = v_norm_payment,
        paid_at        = CASE WHEN v_new_status = 'paid' THEN COALESCE(paid_at, now()) ELSE NULL END
    WHERE id = p_invoice_id;

  -- 12. Return structured ledger response
  RETURN jsonb_build_object(
    'success',            true,
    'invoice_id',         p_invoice_id,
    'invoice_code',       v_invoice.invoice_code,
    'grand_total',        v_grand_total,
    'amount_paid',        v_new_paid_total,
    'balance_due',        round(v_grand_total - v_new_paid_total, 2),
    'status',             v_new_status,
    'cash_installment_id', v_cash_row_id,
    'wallet_installment_id', v_wallet_row_id,
    'wallet_applied',     round(COALESCE(p_apply_wallet_amount, 0), 2),
    'cash_applied',       round(p_cash_amount, 2)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_installment_payment(uuid, numeric, text, text, text, numeric) TO authenticated;

COMMENT ON FUNCTION public.record_installment_payment(uuid, numeric, text, text, text, numeric)
  IS 'Additive installment ledger — inserts into invoice_payments and recomputes invoices.amount_paid as SUM of all installments. Never overwrites. Optionally applies wallet credit before cash. Returns full ledger context.';


-- ============================================================================
-- FUNCTION 4: public.get_customer_ledger()
--   Returns a unified, per-customer ledger JSON array.
--   Includes both invoice_payments rows and wallet transactions.
--   Ordered by created_at ASC (oldest first = natural ledger order).
--   Includes running balance after each event.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_customer_ledger(
  p_customer_id uuid,
  p_limit       int  DEFAULT 200,
  p_offset      int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role   text;
  v_caller_active boolean;
  v_rows          jsonb;
  v_total_charged numeric;
  v_total_paid    numeric;
  v_wallet_balance numeric;
  v_customer      record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT role, is_active INTO v_caller_role, v_caller_active
    FROM public.users WHERE id = auth.uid();

  IF v_caller_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: inactive account';
  END IF;

  IF v_caller_role NOT IN ('admin', 'receptionist') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id is required';
  END IF;

  -- Customer summary
  SELECT name, contact INTO v_customer
    FROM public.customers WHERE id = p_customer_id;

  -- Total charged = SUM of all invoice grand_totals for this customer
  SELECT COALESCE(SUM(grand_total), 0) INTO v_total_charged
    FROM public.invoices
    WHERE customer_id = p_customer_id
      AND status <> 'cancelled';

  -- Total paid = SUM of all installment rows for this customer
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.invoice_payments
    WHERE customer_id = p_customer_id;

  -- Wallet balance
  v_wallet_balance := public.get_customer_wallet_balance(p_customer_id);

  -- Build unified ledger rows (invoice payments + wallet events in chronological order)
  WITH ledger_rows AS (
    -- Invoice installment payments
    SELECT
      ip.id,
      ip.created_at,
      'payment'                    AS event_type,
      ip.invoice_id,
      inv.invoice_code,
      ip.amount,
      ip.payment_method,
      ip.reference_number,
      ip.notes,
      NULL::text                   AS wallet_event_type
    FROM public.invoice_payments ip
    JOIN public.invoices inv ON inv.id = ip.invoice_id
    WHERE ip.customer_id = p_customer_id

    UNION ALL

    -- Wallet events
    SELECT
      cwt.id,
      cwt.created_at,
      'wallet'                     AS event_type,
      cwt.applied_invoice_id       AS invoice_id,
      inv2.invoice_code,
      cwt.amount,
      NULL::text                   AS payment_method,
      NULL::text                   AS reference_number,
      cwt.notes,
      cwt.type                     AS wallet_event_type
    FROM public.customer_wallet_transactions cwt
    LEFT JOIN public.invoices inv2 ON inv2.id = cwt.applied_invoice_id
    WHERE cwt.customer_id = p_customer_id
  ),
  ordered AS (
    SELECT
      *,
      ROW_NUMBER() OVER (ORDER BY created_at ASC, event_type ASC) AS rn
    FROM ledger_rows
    ORDER BY created_at ASC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',               id,
      'created_at',       created_at,
      'event_type',       event_type,
      'wallet_event_type', wallet_event_type,
      'invoice_id',       invoice_id,
      'invoice_code',     invoice_code,
      'amount',           amount,
      'payment_method',   payment_method,
      'reference_number', reference_number,
      'notes',            notes
    ) ORDER BY created_at ASC
  )
  INTO v_rows
  FROM ordered;

  RETURN jsonb_build_object(
    'customer_id',       p_customer_id,
    'customer_name',     v_customer.name,
    'customer_contact',  v_customer.contact,
    'total_charged',     v_total_charged,
    'total_paid',        v_total_paid,
    'balance_due',       round(v_total_charged - v_total_paid, 2),
    'wallet_balance',    v_wallet_balance,
    'rows',              COALESCE(v_rows, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_ledger(uuid, int, int) TO authenticated;

COMMENT ON FUNCTION public.get_customer_ledger(uuid, int, int)
  IS 'Returns unified per-customer ledger: all invoice_payments and wallet transactions in chronological order with summary totals. Used by web ledger page and mobile ledger screen.';


-- ============================================================================
-- FUNCTION 5: public.record_payment() — DEPRECATED WRAPPER
--   Keeps the old signature so existing callers (PaymentRecordingBox, admin panel)
--   do not break during Phase 3 client migration.
--   Internally translates to record_installment_payment().
--   All new code MUST call record_installment_payment() directly.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_payment(
  p_invoice_id        uuid,
  p_amount            numeric,
  p_payment_method    text    DEFAULT 'Cash',
  p_notes             text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_invoice        public.invoices%ROWTYPE;
  v_current_paid   numeric;
  v_delta          numeric;
BEGIN
  -- Resolve the delta: legacy callers pass the NEW total amount_paid.
  -- We must translate from "new cumulative amount" to "installment delta".
  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_current_paid
    FROM public.invoice_payments
    WHERE invoice_id = p_invoice_id;

  v_delta := round(p_amount, 2) - round(v_current_paid, 2);

  -- If delta <= 0 the caller is passing an equal or lower amount (e.g. editing down).
  -- The old destructive RPC allowed this; we cannot support destructive edits in the
  -- new ledger model. Surface an actionable error instead of silently corrupting data.
  IF v_delta <= 0 THEN
    RAISE EXCEPTION
      '[DEPRECATED record_payment] New total (%) is not greater than already-recorded total (%). '
      'Use the new payment recording UI to add a positive installment.',
      round(p_amount, 2), round(v_current_paid, 2);
  END IF;

  RETURN public.record_installment_payment(
    p_invoice_id       => p_invoice_id,
    p_cash_amount      => v_delta,
    p_payment_method   => p_payment_method,
    p_reference_number => NULL,
    p_notes            => COALESCE(p_notes, '[migrated from record_payment]'),
    p_apply_wallet_amount => 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, text, text) TO authenticated;

COMMENT ON FUNCTION public.record_payment(uuid, numeric, text, text)
  IS 'DEPRECATED: backward-compat wrapper around record_installment_payment(). Translates the old cumulative-amount calling convention into an additive delta. All new code must call record_installment_payment() directly. This wrapper will be dropped after Phase 3 client migration is complete.';


-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
