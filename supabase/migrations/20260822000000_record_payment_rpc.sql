-- =============================================================================
-- Migration: 20260822000000_record_payment_rpc.sql
-- Description:
--   Unified server-side payment recording RPC for all invoices (Job + Sale).
--   Enforces rigid bounds check (amount <= grand_total, amount >= 0),
--   atomically updates invoices.amount_paid, invoices.payment_status / status,
--   sets paid_at timestamp when fully paid, and enforces caller role boundaries
--   (Admin and Receptionist only).
-- =============================================================================

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
  v_caller_id         uuid;
  v_caller_role       text;
  v_caller_active     boolean;
  v_invoice           public.invoices%ROWTYPE;
  v_grand_total       numeric;
  v_new_amount_paid   numeric;
  v_new_status        text;
  v_paid_at           timestamptz;
  v_norm_payment      text;
  v_balance           numeric;
BEGIN
  -- 1. Authentication & Role Boundary Check
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  SELECT role, is_active INTO v_caller_role, v_caller_active
  FROM public.users
  WHERE id = v_caller_id;

  IF v_caller_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: inactive staff account';
  END IF;

  IF v_caller_role NOT IN ('admin', 'receptionist') THEN
    RAISE EXCEPTION 'Forbidden: only administrators and receptionists can record payments';
  END IF;

  -- 2. Validate Target Invoice
  IF p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invoice: invoice_id is required';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice with ID % not found', p_invoice_id;
  END IF;

  IF v_invoice.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot record payment for a cancelled invoice';
  END IF;

  -- 3. Canonical Server-Side Totals & Bounds Check
  v_grand_total := COALESCE(v_invoice.grand_total, 0);

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Invalid payment amount: amount cannot be negative or null';
  END IF;

  -- Server-side rounding to 2 decimal places
  v_new_amount_paid := round(p_amount, 2);

  IF v_new_amount_paid > v_grand_total THEN
    RAISE EXCEPTION 'Payment amount (₹%) cannot exceed invoice grand total (₹%)', v_new_amount_paid, v_grand_total;
  END IF;

  -- 4. Status Determination (Rigid Rule: Equal = Paid, Less = Draft/Unpaid)
  IF v_new_amount_paid >= v_grand_total AND v_grand_total > 0 THEN
    v_new_status := 'paid';
    v_paid_at    := COALESCE(v_invoice.paid_at, now());
  ELSIF v_new_amount_paid = 0 AND v_grand_total = 0 THEN
    -- Zero-total invoice marked as paid
    v_new_status := 'paid';
    v_paid_at    := COALESCE(v_invoice.paid_at, now());
  ELSIF v_new_amount_paid > 0 THEN
    v_new_status := 'partial';
    v_paid_at    := NULL;
  ELSE
    v_new_status := 'draft';
    v_paid_at    := NULL;
  END IF;

  -- Normalize payment method
  v_norm_payment := CASE lower(COALESCE(p_payment_method, 'Cash'))
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    ELSE p_payment_method
  END;

  -- 5. Atomic Update on Invoices Row
  UPDATE public.invoices
  SET amount_paid    = v_new_amount_paid,
      status         = v_new_status,
      payment_method = v_norm_payment,
      paid_at        = v_paid_at,
      notes          = COALESCE(p_notes, notes)
  WHERE id = p_invoice_id
  RETURNING * INTO v_invoice;

  v_balance := round(v_grand_total - v_new_amount_paid, 2);

  -- 6. Return structured response for UI
  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice.id,
    'invoice_code', v_invoice.invoice_code,
    'grand_total', v_invoice.grand_total,
    'amount_paid', v_invoice.amount_paid,
    'balance_due', v_balance,
    'status', v_invoice.status,
    'paid_at', v_invoice.paid_at,
    'payment_method', v_invoice.payment_method
  );
END;
$$;

-- Grant execution to authenticated users (role checked internally)
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, text, text) TO authenticated;

COMMENT ON FUNCTION public.record_payment(uuid, numeric, text, text)
  IS 'Atomically records an invoice payment (full or partial). Re-derives grand_total server-side, validates bounds, updates amount_paid, status, and paid_at. Callable only by admin and receptionist.';
