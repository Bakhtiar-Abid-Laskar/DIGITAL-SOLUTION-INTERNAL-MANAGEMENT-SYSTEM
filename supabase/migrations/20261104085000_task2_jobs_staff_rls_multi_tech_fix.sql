-- ============================================================================
-- Migration: 20261104085000_task2_jobs_staff_rls_multi_tech_fix.sql
-- Description:
--   Updates `jobs_select_staff` and `jobs_update_technician_assigned` RLS policies
--   on `public.jobs` so that technicians can select and update both primary-assigned jobs
--   (jobs.technician_id) and co-assigned jobs (public.job_technicians).
--   This reconciles tab counts from `get_job_status_counts` with the SELECT queries.
-- ============================================================================

-- 1. Fix SELECT policy on public.jobs
DROP POLICY IF EXISTS "jobs_select_staff" ON public.jobs;
CREATE POLICY "jobs_select_staff"
  ON public.jobs FOR SELECT TO authenticated
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
  );

-- 2. Fix UPDATE policy on public.jobs for technicians
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

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
