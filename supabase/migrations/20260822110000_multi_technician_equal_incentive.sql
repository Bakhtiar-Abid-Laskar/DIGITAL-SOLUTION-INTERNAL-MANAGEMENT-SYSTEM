-- ============================================================================
-- REPAIRSHOP — MULTI-TECHNICIAN ASSIGNMENT & EQUAL INCENTIVE DIVISION
-- Migration: 20260822110000_multi_technician_equal_incentive.sql
-- ============================================================================

-- 1. BACKFILL: Ensure every historical job with a technician_id has a corresponding job_technicians entry
INSERT INTO public.job_technicians (job_id, technician_id, assigned_at)
SELECT id, technician_id, COALESCE(created_at, now())
FROM public.jobs
WHERE technician_id IS NOT NULL
ON CONFLICT (job_id, technician_id) DO NOTHING;


-- 2. TRIGGER FUNCTION: Accrue / Re-accrue Incentives with Equal Split
CREATE OR REPLACE FUNCTION public.accrue_incentives()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tech_count    int;
  v_total_incentive numeric := 0;
  v_split_amount  numeric := 0;
  v_tech          RECORD;
BEGIN
  IF TG_TABLE_NAME = 'jobs' THEN
    -- Check if job is completed
    IF NEW.status = 'Completed' AND (TG_OP = 'INSERT' OR COALESCE(OLD.status, '') != 'Completed' OR OLD.snap_technician_incentive IS DISTINCT FROM NEW.snap_technician_incentive) THEN
      -- Delete prior job incentive entries
      DELETE FROM public.staff_incentives WHERE job_id = NEW.id AND source_type = 'job';

      v_total_incentive := COALESCE(NEW.snap_technician_incentive, 0);

      IF v_total_incentive > 0 THEN
        -- Count active assigned technicians
        SELECT count(*) INTO v_tech_count
        FROM public.job_technicians
        WHERE job_id = NEW.id AND removed_at IS NULL;

        IF v_tech_count > 0 THEN
          v_split_amount := ROUND((v_total_incentive / v_tech_count)::numeric, 2);

          FOR v_tech IN
            SELECT technician_id FROM public.job_technicians
            WHERE job_id = NEW.id AND removed_at IS NULL
          LOOP
            INSERT INTO public.staff_incentives
              (user_id, source_type, job_id, amount, accrued_at)
            VALUES
              (v_tech.technician_id, 'job', NEW.id, v_split_amount, now());
          END LOOP;
        ELSIF NEW.technician_id IS NOT NULL THEN
          -- Fallback if job_technicians was not populated
          INSERT INTO public.staff_incentives
            (user_id, source_type, job_id, amount, accrued_at)
          VALUES
            (NEW.technician_id, 'job', NEW.id, v_total_incentive, now());
        END IF;
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'sales' THEN
    IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR COALESCE(OLD.status, '') != 'completed') THEN
      DELETE FROM public.staff_incentives WHERE sale_id = NEW.id AND source_type = 'sale';
      IF COALESCE(NEW.staff_incentive, 0) > 0 AND NEW.created_by IS NOT NULL THEN
        INSERT INTO public.staff_incentives
          (user_id, source_type, sale_id, amount, accrued_at)
        VALUES
          (NEW.created_by, 'sale', NEW.id, NEW.staff_incentive, now());
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- 3. ATOMIC RPC: assign_job_technicians
CREATE OR REPLACE FUNCTION public.assign_job_technicians(
  p_job_id uuid,
  p_technician_ids uuid[],
  p_caller_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_job RECORD;
  v_tech_id uuid;
  v_primary_tech uuid := NULL;
  v_is_admin boolean := false;
  v_is_receptionist boolean := false;
  v_tech_count int;
  v_split_amount numeric := 0;
BEGIN
  v_user_id := COALESCE(p_caller_id, auth.uid());

  -- Check permissions
  SELECT (role = 'admin') INTO v_is_admin FROM public.users WHERE id = v_user_id;
  SELECT (role = 'receptionist') INTO v_is_receptionist FROM public.users WHERE id = v_user_id;

  IF NOT (v_is_admin OR v_is_receptionist) THEN
    RAISE EXCEPTION 'Only Admin and Receptionist can assign technicians.';
  END IF;

  -- Lock job
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Mark removed technicians
  UPDATE public.job_technicians
  SET removed_at = now()
  WHERE job_id = p_job_id
    AND removed_at IS NULL
    AND NOT (technician_id = ANY(p_technician_ids));

  -- Insert or restore assigned technicians
  FOREACH v_tech_id IN ARRAY p_technician_ids
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.job_technicians
      WHERE job_id = p_job_id AND technician_id = v_tech_id
    ) THEN
      UPDATE public.job_technicians
      SET removed_at = NULL
      WHERE job_id = p_job_id AND technician_id = v_tech_id AND removed_at IS NOT NULL;
    ELSE
      INSERT INTO public.job_technicians (job_id, technician_id, assigned_at)
      VALUES (p_job_id, v_tech_id, now());
    END IF;
  END LOOP;

  -- Primary technician is first in array
  IF array_length(p_technician_ids, 1) > 0 THEN
    v_primary_tech := p_technician_ids[1];
  END IF;

  UPDATE public.jobs
  SET technician_id = v_primary_tech
  WHERE id = p_job_id;

  -- If job is already Completed, recalculate incentive split across current assigned technicians
  IF v_job.status = 'Completed' AND COALESCE(v_job.snap_technician_incentive, 0) > 0 THEN
    DELETE FROM public.staff_incentives WHERE job_id = p_job_id AND source_type = 'job';

    SELECT count(*) INTO v_tech_count
    FROM public.job_technicians
    WHERE job_id = p_job_id AND removed_at IS NULL;

    IF v_tech_count > 0 THEN
      v_split_amount := ROUND((v_job.snap_technician_incentive / v_tech_count)::numeric, 2);

      FOR v_tech_id IN
        SELECT technician_id FROM public.job_technicians
        WHERE job_id = p_job_id AND removed_at IS NULL
      LOOP
        INSERT INTO public.staff_incentives
          (user_id, source_type, job_id, amount, accrued_at)
        VALUES
          (v_tech_id, 'job', p_job_id, v_split_amount, now());
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'assigned_count', COALESCE(array_length(p_technician_ids, 1), 0),
    'primary_technician_id', v_primary_tech,
    'message', 'Technicians assigned and incentives reconciled successfully.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_job_technicians(uuid, uuid[], uuid) TO authenticated;

