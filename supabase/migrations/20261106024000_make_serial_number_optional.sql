-- ============================================================================
-- Migration: 20261106024000_make_serial_number_optional.sql
-- Description: Make serial numbers purely optional across all modules
--
-- Requirements:
--   1. Serial number is purely optional everywhere: when adding materials,
--      when completing jobs, and when billing or generating invoices.
--   2. Labour and service lines must NEVER require a serial number.
--   3. Remove/relax DB triggers and constraints that enforced serial numbers.
-- ============================================================================

-- ─── 1. Relax enforce_job_material_serial trigger function ──────────────────
CREATE OR REPLACE FUNCTION public.enforce_job_material_serial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trim whitespace if present, but serial numbers are completely optional
  IF NEW.serial_number IS NOT NULL THEN
    NEW.serial_number := trim(NEW.serial_number);
    IF NEW.serial_number = '' THEN
      NEW.serial_number := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Keep trigger to normalize whitespace, but never throws exceptions
DROP TRIGGER IF EXISTS trg_enforce_job_material_serial ON public.job_materials;
CREATE TRIGGER trg_enforce_job_material_serial
  BEFORE INSERT OR UPDATE ON public.job_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_job_material_serial();


-- ─── 2. Relax check_job_completion_materials trigger on public.jobs ─────────
CREATE OR REPLACE FUNCTION public.check_job_completion_materials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') THEN
    -- Mark any reserved inventory unit serials as sold, without blocking completion
    UPDATE public.inventory_unit_serials
    SET status = 'sold',
        sold_at = now()
    WHERE reserved_job_id = NEW.id
      AND status = 'reserved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_job_completion_materials ON public.jobs;
CREATE TRIGGER trg_check_job_completion_materials
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_job_completion_materials();


-- ─── 3. Remove compulsory invoice serial trigger on public.invoices ─────────
DROP TRIGGER IF EXISTS trg_check_invoice_job_materials_serial ON public.invoices;
DROP FUNCTION IF EXISTS public.check_invoice_job_materials_serial();


-- ─── 4. Update complete_job_materials RPC to make serial optional ───────────
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
  v_serial_number   text;
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
      v_serial_number := trim(COALESCE(v_item->>'serial_number', ''));

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

      -- Serial number is now purely optional: store if provided, leave unchanged/null otherwise

      v_rem_qty := COALESCE(NULLIF(v_mat.added_qty, 0), v_mat.quantity) - v_used_qty;

      UPDATE public.job_materials
      SET
        used_qty = v_used_qty,
        remaining_qty = v_rem_qty,
        quantity = v_used_qty,
        serial_number = CASE 
          WHEN v_serial_number <> '' THEN v_serial_number 
          ELSE v_mat.serial_number 
        END,
        technician_id = COALESCE(v_mat.technician_id, v_tech_id),
        checkout_status = 'confirmed',
        usage_confirmed_at = now(),
        status = CASE WHEN v_used_qty > 0 THEN 'used' ELSE 'unused' END
      WHERE id = v_mat_id;

      IF v_rem_qty > 0 THEN
        IF v_mat.product_id IS NOT NULL THEN
          UPDATE public.inventory
          SET quantity = quantity + v_rem_qty
          WHERE product_id = v_mat.product_id;

          INSERT INTO public.inventory_transactions (
            inventory_id,
            transaction_type,
            quantity,
            reference_note,
            created_by
          )
          SELECT
            id,
            'IN',
            v_rem_qty,
            'Job completion unused material returned (' || v_job.job_code || ')',
            auth.uid()
          FROM public.inventory
          WHERE product_id = v_mat.product_id
          LIMIT 1;
        END IF;

        IF v_mat.allotment_id IS NOT NULL THEN
          UPDATE public.material_allotments
          SET
            used_quantity = COALESCE(used_quantity, 0) + v_used_qty,
            status = CASE
              WHEN (COALESCE(used_quantity, 0) + v_used_qty) >= quantity THEN 'consumed'
              ELSE 'partially_consumed'
            END
          WHERE id = v_mat.allotment_id;
        END IF;
      ELSE
        IF v_mat.allotment_id IS NOT NULL THEN
          UPDATE public.material_allotments
          SET
            used_quantity = COALESCE(used_quantity, 0) + v_used_qty,
            status = 'consumed'
          WHERE id = v_mat.allotment_id;
        END IF;
      END IF;

      v_total_used := v_total_used + v_used_qty;
      v_allocated_count := v_allocated_count + 1;
    END LOOP;
  END IF;

  IF p_work_notes IS NOT NULL AND trim(p_work_notes) <> '' THEN
    UPDATE public.jobs
    SET work_notes = CASE
      WHEN work_notes IS NULL OR trim(work_notes) = '' THEN trim(p_work_notes)
      ELSE work_notes || E'\n' || trim(p_work_notes)
    END
    WHERE id = p_job_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'materials_updated', v_allocated_count,
    'total_used_quantity', v_total_used
  );
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

