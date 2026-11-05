-- ============================================================================
-- Migration: 20261104084500_task1_fix_job_materials_serial_number.sql
-- Description:
--   1. Adds nullable `serial_number text` and `serial_id uuid` to `public.job_materials`.
--   2. Adds index on `serial_number`.
--   3. Creates `public.job_material_serials` child table with RLS for multi-unit serial tracking.
--   4. Reloads PostgREST schema cache.
-- ============================================================================

-- 1. Add columns to job_materials
ALTER TABLE public.job_materials 
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS serial_id uuid;

-- 2. Index for serial lookups
CREATE INDEX IF NOT EXISTS idx_job_materials_serial_number 
  ON public.job_materials(serial_number) 
  WHERE serial_number IS NOT NULL;

-- 3. Child table for individual serials
CREATE TABLE IF NOT EXISTS public.job_material_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_material_id uuid REFERENCES public.job_materials(id) ON DELETE CASCADE,
  serial_number text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_material_serials_job_mat_id 
  ON public.job_material_serials(job_material_id);

ALTER TABLE public.job_material_serials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_material_serials_admin_receptionist_all" ON public.job_material_serials;
CREATE POLICY "job_material_serials_admin_receptionist_all"
  ON public.job_material_serials FOR ALL TO authenticated
  USING ((SELECT public.is_admin()) OR (SELECT public.is_receptionist()))
  WITH CHECK ((SELECT public.is_admin()) OR (SELECT public.is_receptionist()));

DROP POLICY IF EXISTS "job_material_serials_technician_select" ON public.job_material_serials;
CREATE POLICY "job_material_serials_technician_select"
  ON public.job_material_serials FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin()) OR 
    (SELECT public.is_receptionist()) OR
    EXISTS (
      SELECT 1 FROM public.job_materials jm
      JOIN public.jobs j ON j.id = jm.job_id
      WHERE jm.id = job_material_serials.job_material_id
        AND (
          jm.technician_id = (SELECT auth.uid()) OR
          j.technician_id = (SELECT auth.uid()) OR
          EXISTS (
            SELECT 1 FROM public.job_technicians jt
            WHERE jt.job_id = j.id AND jt.technician_id = (SELECT auth.uid()) AND jt.removed_at IS NULL
          )
        )
    )
  );

DROP POLICY IF EXISTS "job_material_serials_technician_insert" ON public.job_material_serials;
CREATE POLICY "job_material_serials_technician_insert"
  ON public.job_material_serials FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin()) OR 
    (SELECT public.is_receptionist()) OR
    EXISTS (
      SELECT 1 FROM public.job_materials jm
      JOIN public.jobs j ON j.id = jm.job_id
      WHERE jm.id = job_material_serials.job_material_id
        AND (
          jm.technician_id = (SELECT auth.uid()) OR
          j.technician_id = (SELECT auth.uid()) OR
          EXISTS (
            SELECT 1 FROM public.job_technicians jt
            WHERE jt.job_id = j.id AND jt.technician_id = (SELECT auth.uid()) AND jt.removed_at IS NULL
          )
        )
    )
  );

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
