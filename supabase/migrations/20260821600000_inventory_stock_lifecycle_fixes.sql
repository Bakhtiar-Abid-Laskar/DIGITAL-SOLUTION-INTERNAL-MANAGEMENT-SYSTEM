-- ============================================================================
-- REPAIRSHOP — INVENTORY STOCK LIFECYCLE FIXES (v2 — CORRECTED)
-- Migration: 20260821600000_inventory_stock_lifecycle_fixes.sql
--
-- DESIRED STOCK FLOW:
--   1. Technician takes 10 SSDs  → stock -10 IMMEDIATELY on INSERT
--   2. Job completed, 4 used, 6 leftover → 6 goes to material_allotments
--      Stock stays at -10 (no refund on confirmation)
--   3. "Mark Returned" clicked → stock +6
--   Net: stock -4 (only the consumed amount)
--
-- BUGS FIXED:
--   A. CRITICAL: process_inventory_stock_change() used CASE new.item_name
--      which threw "record has no field item_name" on job_materials trigger.
--      Fix: use row_to_json() for all cross-table record field reads.
--   B. quantity_cached never synced — display showed stale stock values.
--   C. use_material_allotment() RPC was missing — "Use on Job" silently failed.
--   D. return_allocated_material() now syncs quantity_cached on return.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- A+B. FIX process_inventory_stock_change()
--   - Use row_to_json() for all cross-table field reads (no more field errors)
--   - Sync quantity_cached on every stock operation
--   - Preserve correct early-return on confirmation (no double refund)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_inventory_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_inventory_id uuid;
  current_stock       numeric;
  display_name        text;
  qty_needed          numeric;
  qty_delta           numeric;
  r_new               jsonb;
  r_old               jsonb;
BEGIN
  -- Serialize records to JSON for safe cross-table field access
  -- (avoids "record has no field X" errors when trigger fires on different tables)
  IF tg_op <> 'INSERT' THEN
    r_old := row_to_json(old)::jsonb;
  END IF;
  IF tg_op <> 'DELETE' THEN
    r_new := row_to_json(new)::jsonb;
  END IF;

  -- Resolve inventory_id and item display name
  IF tg_op = 'DELETE' THEN
    target_inventory_id := (r_old->>'inventory_id')::uuid;
    IF tg_table_name = 'job_materials' THEN
      display_name := r_old->>'material_name';
    ELSE
      display_name := r_old->>'item_name';
    END IF;
  ELSE
    target_inventory_id := (r_new->>'inventory_id')::uuid;
    IF tg_table_name = 'job_materials' THEN
      display_name := r_new->>'material_name';
    ELSE
      display_name := r_new->>'item_name';
    END IF;
  END IF;

  -- Fallback: find inventory row by item name
  IF target_inventory_id IS NULL AND display_name IS NOT NULL THEN
    SELECT id INTO target_inventory_id
    FROM public.inventory
    WHERE lower(item_name) = lower(display_name)
    LIMIT 1;
  END IF;

  -- Nothing to do if we cannot identify the inventory row
  IF target_inventory_id IS NULL THEN
    RETURN COALESCE(new, old);
  END IF;

  -- Lock inventory row for this transaction
  SELECT quantity INTO current_stock
  FROM public.inventory
  WHERE id = target_inventory_id
  FOR UPDATE;
  current_stock := COALESCE(current_stock, 0);

  -- ── INSERT: deduct stock immediately when technician takes items ──────────
  IF tg_op = 'INSERT' THEN

    -- NULL inventory_id = bypass (used by use_material_allotment to avoid
    -- double-deduction when picking from already-deducted allotments)
    IF (r_new->>'inventory_id') IS NULL THEN
      RETURN new;
    END IF;

    qty_needed := (r_new->>'quantity')::numeric;

    IF current_stock < qty_needed THEN
      RAISE EXCEPTION 'Insufficient stock for "%": requested %, only % available.',
        display_name, qty_needed, current_stock;
    END IF;

    UPDATE public.inventory
    SET quantity        = quantity - qty_needed,
        quantity_cached = quantity - qty_needed,
        last_updated    = now()
    WHERE id = target_inventory_id;

  -- ── UPDATE ────────────────────────────────────────────────────────────────
  ELSIF tg_op = 'UPDATE' THEN

    -- When complete_job_materials confirms a material:
    -- the unused quantity moves to material_allotments (NOT back to stock).
    -- Stock is only restored when the technician physically returns items.
    -- DO NOT refund here — return_allocated_material handles the +N on return.
    IF tg_table_name = 'job_materials' AND (
      ( (r_new->>'checkout_status') = 'confirmed'
        AND (r_old->>'checkout_status') IS DISTINCT FROM 'confirmed' ) OR
      ( (r_new->>'usage_confirmed_at') IS NOT NULL
        AND (r_old->>'usage_confirmed_at') IS NULL )
    ) THEN
      RETURN new;  -- no stock change on confirmation
    END IF;

    -- Normal quantity adjustment (manual receptionist/admin edit)
    qty_delta := (r_new->>'quantity')::numeric - (r_old->>'quantity')::numeric;

    IF qty_delta > 0 AND current_stock < qty_delta THEN
      RAISE EXCEPTION 'Insufficient stock for "%": additional % requested, only % available.',
        display_name, qty_delta, current_stock;
    END IF;

    UPDATE public.inventory
    SET quantity        = quantity - qty_delta,
        quantity_cached = quantity - qty_delta,
        last_updated    = now()
    WHERE id = target_inventory_id;

  -- ── DELETE: full refund when material row is removed before job completion ─
  ELSIF tg_op = 'DELETE' THEN

    UPDATE public.inventory
    SET quantity        = quantity + (r_old->>'quantity')::numeric,
        quantity_cached = quantity + (r_old->>'quantity')::numeric,
        last_updated    = now()
    WHERE id = target_inventory_id;

  END IF;

  RETURN COALESCE(new, old);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- C. CREATE use_material_allotment RPC (was missing — caused silent failures)
--    Technician uses items from their held allotment on a job.
--    Stock was ALREADY deducted at original checkout — NO double-deduction.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.use_material_allotment(
  p_allotment_id uuid,
  p_job_id       uuid,
  p_quantity     numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allotment     RECORD;
  v_inv           RECORD;
  v_caller_id     uuid;
  v_new_allot_qty numeric;
  v_jm_id         uuid;
BEGIN
  v_caller_id := auth.uid();

  SELECT * INTO v_allotment
  FROM public.material_allotments
  WHERE id = p_allotment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allotment % not found', p_allotment_id;
  END IF;

  IF v_allotment.status <> 'allotted' THEN
    RAISE EXCEPTION 'Allotment % is not available (status: %)', p_allotment_id, v_allotment.status;
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF p_quantity > v_allotment.quantity THEN
    RAISE EXCEPTION 'Cannot use % — only % available in this allotment',
      p_quantity, v_allotment.quantity;
  END IF;

  SELECT * INTO v_inv FROM public.inventory WHERE id = v_allotment.inventory_id;

  -- Insert a pre-confirmed job_materials row.
  -- Set inventory_id = NULL so the INSERT trigger SKIPS stock deduction
  -- (stock was already deducted when the technician originally checked out).
  -- The UPDATE afterward sets inventory_id for audit trail only.
  INSERT INTO public.job_materials (
    job_id, material_name, quantity, added_qty, used_qty, remaining_qty,
    unit_cost, inventory_id, technician_id, checkout_status, usage_confirmed_at, status
  ) VALUES (
    p_job_id,
    COALESCE(v_inv.item_name, 'Material'),
    p_quantity, p_quantity, p_quantity, 0,
    COALESCE(v_inv.cost_price, 0),
    NULL,             -- NULL bypasses stock deduction trigger
    v_caller_id,
    'confirmed',
    now(),
    'used'
  ) RETURNING id INTO v_jm_id;

  -- Now set inventory_id for audit trail (UPDATE trigger skips for confirmed rows)
  UPDATE public.job_materials
  SET inventory_id = v_allotment.inventory_id
  WHERE id = v_jm_id;

  -- Reduce or close the allotment
  v_new_allot_qty := v_allotment.quantity - p_quantity;

  IF v_new_allot_qty <= 0 THEN
    -- Fully consumed — mark returned (stock not refunded; material was used on job)
    UPDATE public.material_allotments
    SET status = 'returned', returned_at = now(), returned_by = v_caller_id, quantity = 0
    WHERE id = p_allotment_id;
  ELSE
    -- Partially used — reduce remaining allotment
    UPDATE public.material_allotments
    SET quantity = v_new_allot_qty
    WHERE id = p_allotment_id;
  END IF;

  RETURN jsonb_build_object(
    'success',             true,
    'job_material_id',     v_jm_id,
    'used_qty',            p_quantity,
    'remaining_allotment', v_new_allot_qty
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_material_allotment(uuid, uuid, numeric) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- D. FIX return_allocated_material — sync quantity_cached on physical return
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.return_allocated_material(
  p_allotment_id uuid,
  p_user_id      uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allotment RECORD;
  v_caller_id uuid;
  v_inv       RECORD;
  v_job       RECORD;
  v_tech      RECORD;
  v_old_qty   numeric;
  v_new_qty   numeric;
BEGIN
  v_caller_id := COALESCE(p_user_id, auth.uid());

  SELECT * INTO v_allotment
  FROM public.material_allotments
  WHERE id = p_allotment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allotment % not found', p_allotment_id;
  END IF;

  IF v_allotment.status = 'returned' THEN
    RAISE EXCEPTION 'Allotment % has already been returned', p_allotment_id;
  END IF;

  SELECT * INTO v_job  FROM public.jobs  WHERE id = v_allotment.job_id;
  SELECT * INTO v_tech FROM public.users WHERE id = v_allotment.technician_id;

  -- Restore unused quantity to central inventory
  IF v_allotment.inventory_id IS NOT NULL THEN
    SELECT * INTO v_inv
    FROM public.inventory WHERE id = v_allotment.inventory_id FOR UPDATE;

    IF FOUND THEN
      v_old_qty := v_inv.quantity;
      v_new_qty := v_inv.quantity + v_allotment.quantity;

      UPDATE public.inventory
      SET quantity        = v_new_qty,
          quantity_cached = v_new_qty,
          last_updated    = now()
      WHERE id = v_allotment.inventory_id;

      INSERT INTO public.inventory_transactions (
        inventory_id, transaction_type, quantity, reference_note, created_by, created_at
      ) VALUES (
        v_allotment.inventory_id, 'RETURN', v_allotment.quantity,
        'Returned by ' || COALESCE(v_tech.name, 'technician') ||
          ' from Job ' || COALESCE(v_job.job_code, 'N/A'),
        v_caller_id, now()
      );

      INSERT INTO public.inventory_audit_log (
        inventory_id, changed_by, change_type, old_quantity, new_quantity, changed_at
      ) VALUES (
        v_allotment.inventory_id, v_caller_id, 'RETURN_ALLOTMENT',
        v_old_qty, v_new_qty, now()
      );
    END IF;
  END IF;

  UPDATE public.material_allotments
  SET status = 'returned', returned_at = now(), returned_by = v_caller_id
  WHERE id = p_allotment_id;

  RETURN jsonb_build_object(
    'success', true, 'allotment_id', p_allotment_id,
    'returned_qty', v_allotment.quantity,
    'message', 'Material returned to stock successfully.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.return_allocated_material(uuid, uuid) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- E. Sync trigger: always keep quantity_cached = quantity
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_inventory_quantity_cached()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF new.quantity IS DISTINCT FROM old.quantity THEN
    new.quantity_cached := new.quantity;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_quantity_cached ON public.inventory;
CREATE TRIGGER trg_sync_quantity_cached
BEFORE UPDATE OF quantity ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_quantity_cached();


-- ────────────────────────────────────────────────────────────────────────────
-- F. One-time backfill existing inventory rows
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.inventory
SET quantity_cached = quantity
WHERE quantity_cached IS DISTINCT FROM quantity;


NOTIFY pgrst, 'reload schema';
