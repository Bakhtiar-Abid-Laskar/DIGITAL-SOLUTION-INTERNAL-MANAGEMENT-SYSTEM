-- ============================================================================
-- Migration: 20261101050000_compulsory_job_materials_serials.sql
-- Description:
--   1. Adds `serial_number` (compulsory for all new materials) and `serial_id` to `public.job_materials`.
--   2. Creates `public.job_material_serials` child table for unit-level serial tracking.
--   3. Adds triggers ensuring historical rows remain valid while strictly enforcing NOT NULL
--      serial numbers on all new materials added to jobs.
--   4. Enforces business rules:
--      - Job cannot transition to 'Completed' if any attached material is missing a serial number.
--      - Invoice cannot be generated for a job if any attached material is missing a serial number.
--   5. Connects with `inventory_unit_serials` to automatically manage unit reservation & usage lifecycle.
--   6. Updates `complete_job_materials` RPC to validate serial numbers.
--   7. Adds `search_job_material_serials` helper RPC.
-- ============================================================================

-- ─── 1. Alter public.job_materials ──────────────────────────────────────────
ALTER TABLE public.job_materials
  ADD COLUMN IF NOT EXISTS serial_number TEXT,
  ADD COLUMN IF NOT EXISTS serial_id UUID REFERENCES public.inventory_unit_serials(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_materials_serial_number 
  ON public.job_materials (lower(trim(serial_number)));

CREATE INDEX IF NOT EXISTS idx_job_materials_serial_id 
  ON public.job_materials (serial_id);

-- ─── 2. Create public.job_material_serials Child Table ───────────────────────
CREATE TABLE IF NOT EXISTS public.job_material_serials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_material_id UUID NOT NULL REFERENCES public.job_materials(id) ON DELETE CASCADE,
  serial_id       UUID REFERENCES public.inventory_unit_serials(id) ON DELETE SET NULL,
  serial_number   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_job_material_serials_entry UNIQUE (job_material_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_job_material_serials_job 
  ON public.job_material_serials (job_id);

CREATE INDEX IF NOT EXISTS idx_job_material_serials_mat 
  ON public.job_material_serials (job_material_id);

CREATE INDEX IF NOT EXISTS idx_job_material_serials_serial_id 
  ON public.job_material_serials (serial_id);

CREATE INDEX IF NOT EXISTS idx_job_material_serials_search 
  ON public.job_material_serials (lower(trim(serial_number)));

-- Enable RLS on job_material_serials
ALTER TABLE public.job_material_serials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_material_serials_admin_receptionist_all" ON public.job_material_serials;
CREATE POLICY "job_material_serials_admin_receptionist_all"
  ON public.job_material_serials FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'receptionist')
        AND users.is_active = true
    )
  );

DROP POLICY IF EXISTS "job_material_serials_technician_select" ON public.job_material_serials;
CREATE POLICY "job_material_serials_technician_select"
  ON public.job_material_serials FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_material_serials.job_id
        AND (
          jobs.technician_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.job_technicians jt
            WHERE jt.job_id = jobs.id AND jt.technician_id = auth.uid() AND jt.removed_at IS NULL
          )
        )
    )
  );

DROP POLICY IF EXISTS "job_material_serials_technician_insert" ON public.job_material_serials;
CREATE POLICY "job_material_serials_technician_insert"
  ON public.job_material_serials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_material_serials.job_id
        AND (
          jobs.technician_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.job_technicians jt
            WHERE jt.job_id = jobs.id AND jt.technician_id = auth.uid() AND jt.removed_at IS NULL
          )
        )
    )
  );

-- ─── 3. Enforce Compulsory Serial Number on Job Materials ───────────────────
CREATE OR REPLACE FUNCTION public.enforce_job_material_serial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trim whitespace if present
  IF NEW.serial_number IS NOT NULL THEN
    NEW.serial_number := trim(NEW.serial_number);
  END IF;

  -- Strictly enforce on all new inserts
  IF TG_OP = 'INSERT' THEN
    IF NEW.serial_number IS NULL OR NEW.serial_number = '' THEN
      RAISE EXCEPTION 'Compulsory serial number required for material "%". Every part used on a job must have a valid serial number.',
        COALESCE(NEW.material_name, 'Material');
    END IF;
  END IF;

  -- On update: if serial_number was already present, prevent stripping it away
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.serial_number IS NOT NULL AND OLD.serial_number <> '') AND (NEW.serial_number IS NULL OR NEW.serial_number = '') THEN
      RAISE EXCEPTION 'Serial number cannot be removed from material "%".',
        COALESCE(NEW.material_name, 'Material');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_job_material_serial ON public.job_materials;
CREATE TRIGGER trg_enforce_job_material_serial
  BEFORE INSERT OR UPDATE ON public.job_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_job_material_serial();

-- ─── 4. Sync Job Material Serials & Inventory Reservation Lifecycle ─────────
CREATE OR REPLACE FUNCTION public.sync_job_material_inventory_serial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_id     UUID;
  v_unit_status TEXT;
  v_res_job_id  UUID;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- A. If explicit serial_id is provided
    IF NEW.serial_id IS NOT NULL THEN
      SELECT id, status, reserved_job_id INTO v_unit_id, v_unit_status, v_res_job_id
      FROM public.inventory_unit_serials
      WHERE id = NEW.serial_id
      FOR UPDATE;

      IF FOUND THEN
        IF v_unit_status = 'available' THEN
          UPDATE public.inventory_unit_serials
          SET status = 'reserved',
              reserved_job_id = NEW.job_id,
              reserved_at = now()
          WHERE id = NEW.serial_id;
        ELSIF v_unit_status = 'reserved' AND v_res_job_id <> NEW.job_id THEN
          RAISE EXCEPTION 'Serial number "%" is already reserved for another job.', NEW.serial_number;
        ELSIF v_unit_status IN ('sold', 'damaged') THEN
          RAISE EXCEPTION 'Serial number "%" is not available for use (currently %).', NEW.serial_number, v_unit_status;
        END IF;
      END IF;
    -- B. If serial_number string is provided, try to auto-link matching inventory unit
    ELSIF NEW.serial_number IS NOT NULL AND NEW.serial_number <> '' AND NEW.inventory_id IS NOT NULL THEN
      SELECT id INTO v_unit_id
      FROM public.inventory_unit_serials
      WHERE inventory_id = NEW.inventory_id
        AND serial_number_clean = lower(trim(NEW.serial_number))
        AND status = 'available'
      LIMIT 1
      FOR UPDATE;

      IF v_unit_id IS NOT NULL THEN
        NEW.serial_id := v_unit_id;
        UPDATE public.inventory_unit_serials
        SET status = 'reserved',
            reserved_job_id = NEW.job_id,
            reserved_at = now()
        WHERE id = v_unit_id;
      END IF;
    END IF;

    -- C. Sync to child table job_material_serials
    IF NEW.serial_number IS NOT NULL AND NEW.serial_number <> '' THEN
      INSERT INTO public.job_material_serials (
        job_id, job_material_id, serial_id, serial_number
      ) VALUES (
        NEW.job_id, NEW.id, NEW.serial_id, NEW.serial_number
      )
      ON CONFLICT (job_material_id, serial_number) DO UPDATE
      SET serial_id = EXCLUDED.serial_id;
    END IF;
  END IF;

  -- D. If material is deleted, release reserved inventory serial
  IF TG_OP = 'DELETE' THEN
    IF OLD.serial_id IS NOT NULL THEN
      UPDATE public.inventory_unit_serials
      SET status = 'available',
          reserved_job_id = NULL,
          reserved_at = NULL
      WHERE id = OLD.serial_id
        AND status = 'reserved'
        AND reserved_job_id = OLD.job_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_job_material_inventory_serial ON public.job_materials;
CREATE TRIGGER trg_sync_job_material_inventory_serial
  BEFORE INSERT OR UPDATE ON public.job_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_job_material_inventory_serial();

DROP TRIGGER IF EXISTS trg_release_job_material_inventory_serial ON public.job_materials;
CREATE TRIGGER trg_release_job_material_inventory_serial
  AFTER DELETE ON public.job_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_job_material_inventory_serial();

-- ─── 5. Enforce Business Rule: Job Completion Requires All Serials ──────────
CREATE OR REPLACE FUNCTION public.check_job_completion_materials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing_serial_item TEXT;
BEGIN
  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') THEN
    -- Check if any material on this job is missing a compulsory serial number
    SELECT material_name INTO v_missing_serial_item
    FROM public.job_materials
    WHERE job_id = NEW.id
      AND (serial_number IS NULL OR trim(serial_number) = '')
    LIMIT 1;

    IF v_missing_serial_item IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot complete Job %: Material "%" is missing a compulsory serial number.',
        COALESCE(NEW.job_code, NEW.id::text), v_missing_serial_item;
    END IF;

    -- Mark any reserved inventory unit serials as sold
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

-- ─── 6. Enforce Business Rule: Invoice Generation Requires All Serials ───────
CREATE OR REPLACE FUNCTION public.check_invoice_job_materials_serial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing_serial_item TEXT;
BEGIN
  IF NEW.job_id IS NOT NULL THEN
    SELECT material_name INTO v_missing_serial_item
    FROM public.job_materials
    WHERE job_id = NEW.job_id
      AND (serial_number IS NULL OR trim(serial_number) = '')
    LIMIT 1;

    IF v_missing_serial_item IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot generate Tax Invoice for Job: Material "%" is missing a compulsory serial number.',
        v_missing_serial_item;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_invoice_job_materials_serial ON public.invoices;
CREATE TRIGGER trg_check_invoice_job_materials_serial
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.check_invoice_job_materials_serial();

-- ─── 7. Update complete_job_materials RPC to Validate & Record Serials ───────
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

      -- Check compulsory serial number for used materials
      IF v_used_qty > 0 THEN
        IF v_serial_number = '' AND (v_mat.serial_number IS NULL OR trim(v_mat.serial_number) = '') THEN
          RAISE EXCEPTION 'Material "%" requires a compulsory serial number before completion.', v_mat.material_name;
        END IF;
      END IF;

      v_rem_qty := COALESCE(NULLIF(v_mat.added_qty, 0), v_mat.quantity) - v_used_qty;

      UPDATE public.job_materials
      SET
        used_qty = v_used_qty,
        remaining_qty = v_rem_qty,
        quantity = v_used_qty,
        serial_number = CASE WHEN v_serial_number <> '' THEN v_serial_number ELSE v_mat.serial_number END,
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

-- ─── 8. Helper RPC: search_job_material_serials ─────────────────────────────
CREATE OR REPLACE FUNCTION public.search_job_material_serials(
  p_inventory_id UUID DEFAULT NULL,
  p_product_id   UUID DEFAULT NULL,
  p_query        TEXT DEFAULT NULL,
  p_limit        INT DEFAULT 20
)
RETURNS TABLE (
  id            UUID,
  serial_number TEXT,
  unit_cost     NUMERIC,
  status        TEXT,
  inventory_id  UUID,
  product_id    UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT := lower(trim(coalesce(p_query, '')));
BEGIN
  RETURN QUERY
    SELECT 
      s.id,
      s.serial_number,
      s.unit_cost,
      s.status,
      s.inventory_id,
      s.product_id
    FROM public.inventory_unit_serials s
    WHERE (p_inventory_id IS NULL OR s.inventory_id = p_inventory_id)
      AND (p_product_id IS NULL OR s.product_id = p_product_id)
      AND s.status = 'available'
      AND (v_q = '' OR s.serial_number_clean LIKE '%' || v_q || '%')
    ORDER BY s.created_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_job_material_serials(UUID, UUID, TEXT, INT) TO authenticated;

