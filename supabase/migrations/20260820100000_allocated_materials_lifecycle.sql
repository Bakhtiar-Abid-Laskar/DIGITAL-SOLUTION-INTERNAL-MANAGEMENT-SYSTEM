-- ============================================================================
-- REPAIRSHOP — ALLOCATED MATERIALS LIFECYCLE & TECHNICIAN ATTRIBUTION
-- Migration: 20260820100000_allocated_materials_lifecycle.sql
-- ============================================================================

-- 1. ADD COLUMNS TO material_allotments (Additive Schema)
ALTER TABLE public.material_allotments
  ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS source_job_material_id uuid REFERENCES public.job_materials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS returned_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS notes text;

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_material_allotments_tech_id ON public.material_allotments(technician_id);
CREATE INDEX IF NOT EXISTS idx_material_allotments_status ON public.material_allotments(status);
CREATE INDEX IF NOT EXISTS idx_material_allotments_job_id ON public.material_allotments(job_id);

-- 2. ADD COLUMNS TO job_materials (Additive Schema)
ALTER TABLE public.job_materials
  ADD COLUMN IF NOT EXISTS added_qty numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_qty numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_qty numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_job_materials_tech_id ON public.job_materials(technician_id);

-- 3. BACKFILL HISTORICAL DATA (Safe & Non-Destructive)
-- Backfill job_materials quantities
UPDATE public.job_materials
SET 
  added_qty = COALESCE(NULLIF(added_qty, 0), quantity),
  used_qty = COALESCE(NULLIF(used_qty, 0), quantity),
  remaining_qty = COALESCE(remaining_qty, 0)
WHERE added_qty IS NULL OR added_qty = 0;

-- Backfill missing technician_id on job_materials from parent jobs table
UPDATE public.job_materials jm
SET technician_id = j.technician_id
FROM public.jobs j
WHERE jm.job_id = j.id
  AND jm.technician_id IS NULL
  AND j.technician_id IS NOT NULL;

-- Backfill missing technician_id on material_allotments from parent jobs table
UPDATE public.material_allotments ma
SET technician_id = j.technician_id
FROM public.jobs j
WHERE ma.job_id = j.id
  AND ma.technician_id IS NULL
  AND j.technician_id IS NOT NULL;


-- 4. UPDATE INVENTORY STOCK TRIGGER FUNCTION
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
BEGIN
  IF tg_op = 'DELETE' THEN
    target_inventory_id := old.inventory_id;
    IF tg_table_name = 'job_materials' THEN
      display_name := row_to_json(old)->>'material_name';
    ELSIF tg_table_name = 'sale_items' THEN
      display_name := row_to_json(old)->>'item_name';
    END IF;
  ELSE
    target_inventory_id := new.inventory_id;
    IF tg_table_name = 'job_materials' THEN
      display_name := row_to_json(new)->>'material_name';
    ELSIF tg_table_name = 'sale_items' THEN
      display_name := row_to_json(new)->>'item_name';
    END IF;
  END IF;

  IF target_inventory_id IS NULL THEN
    SELECT id INTO target_inventory_id FROM public.inventory
    WHERE lower(item_name) = lower(display_name) LIMIT 1;
  END IF;

  IF target_inventory_id IS NULL THEN
    RETURN coalesce(new, old);
  END IF;

  SELECT quantity INTO current_stock
  FROM public.inventory WHERE id = target_inventory_id FOR UPDATE;
  current_stock := coalesce(current_stock, 0);

  IF tg_op = 'INSERT' THEN
    qty_needed := new.quantity;
    IF current_stock < qty_needed THEN
      RAISE EXCEPTION 'Insufficient stock for %: requested %, only % remaining.',
        display_name, qty_needed, current_stock;
    END IF;
    UPDATE public.inventory
    SET quantity = quantity - qty_needed, last_updated = now()
    WHERE id = target_inventory_id;
    IF new.inventory_id IS NULL THEN
      new.inventory_id := target_inventory_id;
    END IF;
    IF new.added_qty IS NULL OR new.added_qty = 0 THEN
      new.added_qty := new.quantity;
    END IF;
    IF new.used_qty IS NULL OR new.used_qty = 0 THEN
      new.used_qty := new.quantity;
    END IF;

  ELSIF tg_op = 'UPDATE' THEN
    -- During job completion material reconciliation,
    -- the unused difference (added_qty - used_qty) is moved to material_allotments (technician holding).
    -- Therefore, do NOT refund central inventory here; stock is credited only when returned.
    IF tg_table_name = 'job_materials' AND (
      (new.checkout_status = 'confirmed' AND old.checkout_status != 'confirmed') OR
      (new.usage_confirmed_at IS NOT NULL AND old.usage_confirmed_at IS NULL)
    ) THEN
      RETURN new;
    END IF;

    qty_delta := new.quantity - old.quantity;
    IF qty_delta > 0 AND current_stock < qty_delta THEN
      RAISE EXCEPTION 'Insufficient stock for %: additional % requested, only % remaining.',
        display_name, qty_delta, current_stock;
    END IF;
    UPDATE public.inventory
    SET quantity = quantity - qty_delta, last_updated = now()
    WHERE id = target_inventory_id;

  ELSIF tg_op = 'DELETE' THEN
    UPDATE public.inventory
    SET quantity = quantity + old.quantity, last_updated = now()
    WHERE id = target_inventory_id;
  END IF;

  RETURN coalesce(new, old);
END;
$$;


-- 5. ATOMIC RPC: complete_job_materials
-- Takes job_id and array of material reconciliation lines: [{ material_id: uuid, used_qty: numeric }]
CREATE OR REPLACE FUNCTION public.complete_job_materials(
  p_job_id uuid,
  p_materials jsonb,
  p_work_notes text DEFAULT NULL,
  p_technician_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job RECORD;
  v_tech_id uuid;
  v_item jsonb;
  v_mat_id uuid;
  v_used_qty numeric;
  v_mat RECORD;
  v_rem_qty numeric;
  v_allocated_count integer := 0;
  v_total_used numeric := 0;
BEGIN
  -- 1. Fetch & lock job
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job with ID % not found', p_job_id;
  END IF;

  -- 2. Resolve technician ID
  v_tech_id := COALESCE(p_technician_id, v_job.technician_id, auth.uid());
  IF v_tech_id IS NULL THEN
    RAISE EXCEPTION 'No technician assigned or identified for job %', p_job_id;
  END IF;

  -- 3. Process each material line if provided
  IF p_materials IS NOT NULL AND jsonb_array_length(p_materials) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_materials)
    LOOP
      v_mat_id := (v_item->>'material_id')::uuid;
      v_used_qty := (v_item->>'used_qty')::numeric;

      IF v_mat_id IS NULL OR v_used_qty IS NULL THEN
        RAISE EXCEPTION 'Invalid material payload element: missing material_id or used_qty';
      END IF;

      -- Fetch & lock material line
      SELECT * INTO v_mat FROM public.job_materials WHERE id = v_mat_id AND job_id = p_job_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Material line % not found on job %', v_mat_id, p_job_id;
      END IF;

      IF v_used_qty < 0 THEN
        RAISE EXCEPTION 'Used quantity cannot be negative for %', v_mat.material_name;
      END IF;

      IF v_used_qty > COALESCE(NULLIF(v_mat.added_qty, 0), v_mat.quantity) THEN
        RAISE EXCEPTION 'Used quantity (%) cannot exceed added quantity (%) for %',
          v_used_qty, COALESCE(NULLIF(v_mat.added_qty, 0), v_mat.quantity), v_mat.material_name;
      END IF;

      v_rem_qty := COALESCE(NULLIF(v_mat.added_qty, 0), v_mat.quantity) - v_used_qty;

      -- Update job_materials record to reflect actual consumption
      UPDATE public.job_materials
      SET
        used_qty = v_used_qty,
        remaining_qty = v_rem_qty,
        quantity = v_used_qty,
        technician_id = COALESCE(v_mat.technician_id, v_tech_id),
        checkout_status = 'confirmed',
        usage_confirmed_at = now(),
        status = CASE WHEN v_used_qty > 0 THEN 'used' ELSE 'unused' END
      WHERE id = v_mat_id;

      -- If remaining quantity > 0, move into technician's allocated materials holding
      IF v_rem_qty > 0 THEN
        INSERT INTO public.material_allotments (
          job_id,
          inventory_id,
          product_id,
          technician_id,
          allotted_by,
          quantity,
          status,
          allotted_at,
          source_job_material_id,
          notes
        ) VALUES (
          p_job_id,
          v_mat.inventory_id,
          v_mat.product_id,
          COALESCE(v_mat.technician_id, v_tech_id),
          COALESCE(auth.uid(), v_tech_id),
          v_rem_qty,
          'allotted',
          now(),
          v_mat_id,
          'Leftover from Job ' || v_job.job_code
        );
        v_allocated_count := v_allocated_count + 1;
      END IF;

      v_total_used := v_total_used + v_used_qty;
    END LOOP;
  ELSE
    -- If no explicit array provided, confirm any unconfirmed job_materials with used_qty = quantity
    UPDATE public.job_materials
    SET
      added_qty = COALESCE(NULLIF(added_qty, 0), quantity),
      used_qty = quantity,
      remaining_qty = 0,
      technician_id = COALESCE(technician_id, v_tech_id),
      checkout_status = 'confirmed',
      usage_confirmed_at = now()
    WHERE job_id = p_job_id AND checkout_status != 'confirmed';
  END IF;

  -- 4. Update Job Status to Completed
  UPDATE public.jobs
  SET
    status = 'Completed',
    completed_at = COALESCE(completed_at, now()),
    work_notes = COALESCE(p_work_notes, work_notes)
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'status', 'Completed',
    'allocated_count', v_allocated_count,
    'message', 'Job completed and materials reconciled successfully.'
  );
END;
$$;


-- 6. ATOMIC RPC: return_allocated_material
CREATE OR REPLACE FUNCTION public.return_allocated_material(
  p_allotment_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allotment RECORD;
  v_caller_id uuid;
  v_inv RECORD;
  v_job RECORD;
  v_tech RECORD;
  v_old_qty numeric;
  v_new_qty numeric;
  v_tx_id uuid;
BEGIN
  v_caller_id := COALESCE(p_user_id, auth.uid());

  -- 1. Fetch and lock allocation record
  SELECT * INTO v_allotment
  FROM public.material_allotments
  WHERE id = p_allotment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allotment record % not found', p_allotment_id;
  END IF;

  IF v_allotment.status = 'returned' THEN
    RAISE EXCEPTION 'Allotment record % has already been marked returned', p_allotment_id;
  END IF;

  -- Fetch job & technician info for audit trail
  SELECT * INTO v_job FROM public.jobs WHERE id = v_allotment.job_id;
  SELECT * INTO v_tech FROM public.users WHERE id = v_allotment.technician_id;

  -- 2. Add quantity back to central inventory
  IF v_allotment.inventory_id IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.inventory WHERE id = v_allotment.inventory_id FOR UPDATE;
    IF FOUND THEN
      v_old_qty := v_inv.quantity;
      v_new_qty := v_inv.quantity + v_allotment.quantity;

      UPDATE public.inventory
      SET 
        quantity = v_new_qty,
        last_updated = now()
      WHERE id = v_allotment.inventory_id;

      -- Write to inventory_transactions ledger
      INSERT INTO public.inventory_transactions (
        inventory_id,
        transaction_type,
        quantity,
        reference_note,
        created_by,
        created_at
      ) VALUES (
        v_allotment.inventory_id,
        'RETURN',
        v_allotment.quantity,
        'Returned from technician ' || COALESCE(v_tech.name, 'Staff') || ' (Job ' || COALESCE(v_job.job_code, 'N/A') || ')',
        v_caller_id,
        now()
      ) RETURNING id INTO v_tx_id;

      -- Write to inventory_audit_log
      INSERT INTO public.inventory_audit_log (
        inventory_id,
        changed_by,
        change_type,
        old_quantity,
        new_quantity,
        changed_at
      ) VALUES (
        v_allotment.inventory_id,
        v_caller_id,
        'RETURN_ALLOTMENT',
        v_old_qty,
        v_new_qty,
        now()
      );
    END IF;
  END IF;

  -- 3. Update material_allotments status
  UPDATE public.material_allotments
  SET
    status = 'returned',
    returned_at = now(),
    returned_by = v_caller_id
  WHERE id = p_allotment_id;

  RETURN jsonb_build_object(
    'success', true,
    'allotment_id', p_allotment_id,
    'returned_qty', v_allotment.quantity,
    'inventory_id', v_allotment.inventory_id,
    'message', 'Material returned to central inventory successfully.'
  );
END;
$$;


-- 7. ATOMIC RPC: notify_technician_allocated_material
CREATE OR REPLACE FUNCTION public.notify_technician_allocated_material(
  p_allotment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allotment RECORD;
  v_tech RECORD;
  v_job RECORD;
  v_item_name text;
  v_msg text;
  v_notif_id uuid;
BEGIN
  -- Fetch allotment details
  SELECT * INTO v_allotment FROM public.material_allotments WHERE id = p_allotment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allotment record % not found', p_allotment_id;
  END IF;

  IF v_allotment.technician_id IS NULL THEN
    RAISE EXCEPTION 'No technician assigned to allotment record %', p_allotment_id;
  END IF;

  SELECT * INTO v_tech FROM public.users WHERE id = v_allotment.technician_id;
  SELECT * INTO v_job FROM public.jobs WHERE id = v_allotment.job_id;

  SELECT item_name INTO v_item_name FROM public.inventory WHERE id = v_allotment.inventory_id;
  IF v_item_name IS NULL AND v_allotment.product_id IS NOT NULL THEN
    SELECT name INTO v_item_name FROM public.products WHERE id = v_allotment.product_id;
  END IF;
  v_item_name := COALESCE(v_item_name, 'allotted parts');

  v_msg := 'Please return leftover ' || v_allotment.quantity::text || ' unit(s) of ' || v_item_name || 
           ' from Job ' || COALESCE(v_job.job_code, 'your job') || ' to stock.';

  -- Log in notifications table
  INSERT INTO public.notifications (
    recipient_user_id,
    job_id,
    message,
    channel,
    status,
    sent_at
  ) VALUES (
    v_allotment.technician_id,
    v_allotment.job_id,
    v_msg,
    'push',
    'pending',
    now()
  ) RETURNING id INTO v_notif_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', v_notif_id,
    'technician_id', v_allotment.technician_id,
    'technician_name', v_tech.name,
    'expo_push_token', v_tech.expo_push_token,
    'message', v_msg
  );
END;
$$;


-- 8. REVISED RLS POLICIES FOR material_allotments
DROP POLICY IF EXISTS "material_allotments_admin_receptionist_all" ON public.material_allotments;
DROP POLICY IF EXISTS "material_allotments_tech_select" ON public.material_allotments;

CREATE POLICY "material_allotments_admin_receptionist_all"
  ON public.material_allotments FOR ALL TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_receptionist()))
  WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_receptionist()));

CREATE POLICY "material_allotments_tech_select"
  ON public.material_allotments FOR SELECT TO authenticated
  USING (
    technician_id = (SELECT auth.uid()) OR
    allotted_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = material_allotments.job_id
        AND jobs.technician_id = (SELECT auth.uid())
    )
  );

-- 9. PERMISSION GRANTS ON RPCs
GRANT EXECUTE ON FUNCTION public.complete_job_materials(uuid, jsonb, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_allocated_material(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_technician_allocated_material(uuid) TO authenticated;
