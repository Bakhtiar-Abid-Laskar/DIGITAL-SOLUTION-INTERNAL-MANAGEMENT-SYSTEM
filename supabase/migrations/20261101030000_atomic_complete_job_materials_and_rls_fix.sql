-- ============================================================================
-- Migration: 20261101030000_atomic_complete_job_materials_and_rls_fix.sql
-- Description:
--   1. Updates `complete_job_materials` RPC to atomically mark the job Completed
--      and set completed_at in a single transaction (SECURITY DEFINER).
--   2. Updates `jobs_update_technician_assigned` RLS policy to support both
--      direct assignment (jobs.technician_id) and multi-tech onsite assignment (job_technicians).
--   3. Ensures `accrue_incentives()` has no illegal NEW modifications.
--   4. Cleans up any legacy webhook triggers that could fail job status updates.
-- ============================================================================

-- ─── 1. Ensure columns exist on public.jobs ─────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS completion_id text,
  ADD COLUMN IF NOT EXISTS completion_id_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS items_received text,
  ADD COLUMN IF NOT EXISTS other_status_reason text;

-- ─── 2. Update RLS Policy for Technicians on public.jobs ─────────────────────
DROP POLICY IF EXISTS "jobs_update_technician_assigned" ON public.jobs;
CREATE POLICY "jobs_update_technician_assigned"
  ON public.jobs FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin()) OR
    (SELECT public.is_receptionist()) OR
    (
      (SELECT public.is_technician()) AND (
        technician_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.job_technicians jt
          WHERE jt.job_id = jobs.id
            AND jt.technician_id = (SELECT auth.uid())
            AND jt.removed_at IS NULL
        )
      )
    )
  )
  WITH CHECK (
    (SELECT public.is_admin()) OR
    (SELECT public.is_receptionist()) OR
    (
      (SELECT public.is_technician()) AND (
        technician_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.job_technicians jt
          WHERE jt.job_id = jobs.id
            AND jt.technician_id = (SELECT auth.uid())
            AND jt.removed_at IS NULL
        )
      )
    )
  );

-- ─── 3. Atomic `complete_job_materials` Function ───────────────────────────
CREATE OR REPLACE FUNCTION public.complete_job_materials(
  p_job_id        uuid,
  p_materials     jsonb,
  p_work_notes    text DEFAULT NULL,
  p_technician_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_job             RECORD;
  v_tech_id         uuid;
  v_item            jsonb;
  v_mat_id          uuid;
  v_used_qty        numeric;
  v_mat             RECORD;
  v_rem_qty         numeric;
  v_allocated_count integer := 0;
  v_total_used      numeric := 0;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job with ID % not found', p_job_id;
  END IF;

  -- Caller check: admin, receptionist, or the assigned technician
  IF auth.uid() IS NOT NULL AND NOT (public.is_admin() OR public.is_receptionist()) THEN
    IF auth.uid() <> COALESCE(v_job.technician_id, '00000000-0000-0000-0000-000000000000'::uuid) AND NOT EXISTS (
      SELECT 1 FROM public.job_technicians jt WHERE jt.job_id = p_job_id AND jt.technician_id = auth.uid() AND jt.removed_at IS NULL
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: You can only complete materials on jobs assigned to you.';
    END IF;
  END IF;

  v_tech_id := COALESCE(p_technician_id, v_job.technician_id, auth.uid());
  IF v_tech_id IS NULL THEN
    RAISE EXCEPTION 'No technician assigned or identified for job %', p_job_id;
  END IF;

  IF p_materials IS NOT NULL AND jsonb_array_length(p_materials) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_materials)
    LOOP
      v_mat_id := (v_item->>'material_id')::uuid;
      v_used_qty := (v_item->>'used_qty')::numeric;

      IF v_mat_id IS NULL OR v_used_qty IS NULL THEN
        RAISE EXCEPTION 'Invalid material payload element: missing material_id or used_qty';
      END IF;

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

      IF v_rem_qty > 0 THEN
        INSERT INTO public.material_allotments (
          job_id, inventory_id, product_id, technician_id, allotted_by, quantity, notes
        ) VALUES (
          p_job_id, v_mat.inventory_id,
          (SELECT product_id FROM public.inventory WHERE id = v_mat.inventory_id),
          v_tech_id, auth.uid(), v_rem_qty,
          'Unused leftover from Job ' || COALESCE(v_job.job_code, 'N/A')
        );
        v_allocated_count := v_allocated_count + 1;
      END IF;

      v_total_used := v_total_used + v_used_qty;
    END LOOP;
  END IF;

  -- Atomically mark job Completed and append work notes
  UPDATE public.jobs
  SET
    status = 'Completed',
    completed_at = COALESCE(completed_at, now()),
    completion_id_verified_at = COALESCE(completion_id_verified_at, now()),
    work_notes = CASE
      WHEN p_work_notes IS NOT NULL AND trim(p_work_notes) <> '' THEN
        CASE
          WHEN work_notes IS NULL OR trim(work_notes) = '' THEN trim(p_work_notes)
          ELSE work_notes || E'\n' || trim(p_work_notes)
        END
      ELSE work_notes
    END,
    updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'total_used', v_total_used,
    'leftover_allocations_created', v_allocated_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_job_materials(uuid, jsonb, text, uuid) TO authenticated;

-- ─── 4. Robust `accrue_incentives` Trigger Function ────────────────────────
CREATE OR REPLACE FUNCTION public.accrue_incentives()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_tech_count      int;
  v_total_incentive numeric := 0;
  v_split_amount    numeric := 0;
  v_remainder       numeric := 0;
  v_idx             int := 0;
  v_tech            RECORD;
BEGIN
  IF TG_TABLE_NAME = 'jobs' THEN
    IF NEW.status = 'Completed' AND (
      TG_OP = 'INSERT'
      OR COALESCE(OLD.status, '') != 'Completed'
      OR OLD.snap_technician_incentive IS DISTINCT FROM NEW.snap_technician_incentive
    ) THEN
      DELETE FROM public.staff_incentives WHERE job_id = NEW.id AND source_type = 'job';

      v_total_incentive := COALESCE(NEW.snap_technician_incentive, 0);

      IF v_total_incentive > 0 THEN
        SELECT count(*) INTO v_tech_count
        FROM public.job_technicians
        WHERE job_id = NEW.id AND removed_at IS NULL;

        IF v_tech_count > 0 THEN
          v_split_amount := floor((v_total_incentive / v_tech_count) * 100) / 100;
          v_remainder    := v_total_incentive - (v_split_amount * v_tech_count);

          FOR v_tech IN
            SELECT technician_id FROM public.job_technicians
            WHERE job_id = NEW.id AND removed_at IS NULL
            ORDER BY created_at ASC
          LOOP
            v_idx := v_idx + 1;
            INSERT INTO public.staff_incentives (user_id, source_type, job_id, amount, accrued_at)
            VALUES (
              v_tech.technician_id, 'job', NEW.id,
              CASE WHEN v_idx = 1 THEN v_split_amount + v_remainder ELSE v_split_amount END,
              COALESCE(NEW.completed_at, now())
            );
          END LOOP;

        ELSIF NEW.technician_id IS NOT NULL THEN
          INSERT INTO public.staff_incentives (user_id, source_type, job_id, amount, accrued_at)
          VALUES (NEW.technician_id, 'job', NEW.id, v_total_incentive, COALESCE(NEW.completed_at, now()));
        END IF;
      END IF;

    ELSIF NEW.status != 'Completed' THEN
      DELETE FROM public.staff_incentives WHERE job_id = NEW.id AND source_type = 'job';
    END IF;

  ELSIF TG_TABLE_NAME = 'sales' THEN
    IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR COALESCE(OLD.status, '') != 'completed') THEN
      DELETE FROM public.staff_incentives WHERE sale_id = NEW.id AND source_type = 'sale';
      IF COALESCE(NEW.staff_incentive, 0) > 0 AND NEW.created_by IS NOT NULL THEN
        INSERT INTO public.staff_incentives (user_id, source_type, sale_id, amount, accrued_at)
        VALUES (NEW.created_by, 'sale', NEW.id, NEW.staff_incentive, now());
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 5. Cleanup Legacy Webhook Triggers That Can Abort Transactions ────────
DROP TRIGGER IF EXISTS trigger_whatsapp_job_updated ON public.jobs;
DROP TRIGGER IF EXISTS trigger_whatsapp_job_created ON public.jobs;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

