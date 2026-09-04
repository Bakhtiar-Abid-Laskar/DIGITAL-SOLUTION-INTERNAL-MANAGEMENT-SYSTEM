-- ============================================================================
-- REPAIRSHOP — MOVE JOB TYPE SELECTION TO TECHNICIAN WORKFLOW
-- Migration: 20260822100000_job_type_technician_flow.sql
-- ============================================================================

-- 1. TRIGGER FUNCTION: Automatically snapshot technician incentive when job_type_ref_id is updated
CREATE OR REPLACE FUNCTION public.sync_job_type_incentive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_incentive numeric := 0;
BEGIN
  IF NEW.job_type_ref_id IS NOT NULL AND (
    TG_OP = 'INSERT' OR
    OLD.job_type_ref_id IS DISTINCT FROM NEW.job_type_ref_id OR
    NEW.snap_technician_incentive IS NULL OR
    NEW.snap_technician_incentive = 0
  ) THEN
    SELECT COALESCE(technician_incentive, 0)
    INTO v_incentive
    FROM public.job_types
    WHERE id = NEW.job_type_ref_id;

    NEW.snap_technician_incentive := v_incentive;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_job_type_incentive ON public.jobs;
CREATE TRIGGER trg_sync_job_type_incentive
BEFORE INSERT OR UPDATE OF job_type_ref_id ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_job_type_incentive();


-- 2. ATOMIC RPC: set_job_service_type (used by technician when opening job)
CREATE OR REPLACE FUNCTION public.set_job_service_type(
  p_job_id uuid,
  p_job_type_ref_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_job RECORD;
  v_job_type RECORD;
  v_is_assigned boolean := false;
  v_is_admin boolean := false;
  v_is_receptionist boolean := false;
BEGIN
  v_caller_id := COALESCE(p_user_id, auth.uid());

  -- 1. Fetch & lock job
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- 2. Fetch service type catalog entry
  SELECT * INTO v_job_type FROM public.job_types WHERE id = p_job_type_ref_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service catalog item % not found', p_job_type_ref_id;
  END IF;

  -- 3. Check authorization (Admin, Receptionist, or Assigned Technician)
  SELECT (role = 'admin') INTO v_is_admin FROM public.users WHERE id = v_caller_id;
  SELECT (role = 'receptionist') INTO v_is_receptionist FROM public.users WHERE id = v_caller_id;

  IF v_job.technician_id = v_caller_id THEN
    v_is_assigned := true;
  ELSIF EXISTS (
    SELECT 1 FROM public.job_technicians
    WHERE job_id = p_job_id AND technician_id = v_caller_id AND removed_at IS NULL
  ) THEN
    v_is_assigned := true;
  END IF;

  IF NOT (v_is_admin OR v_is_receptionist OR v_is_assigned) THEN
    RAISE EXCEPTION 'Not authorized to set service type for job %', p_job_id;
  END IF;

  -- 4. Check lock rule: cannot change job type if already Completed/Delivered unless admin
  IF v_job.status IN ('Completed', 'Delivered') AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Cannot modify job service type once job is % without admin privileges', v_job.status;
  END IF;

  -- 5. Update job: set service type, snapshot incentive, transition status from 'Received' to 'In Progress'
  UPDATE public.jobs
  SET
    job_type_ref_id = p_job_type_ref_id,
    snap_technician_incentive = COALESCE(v_job_type.technician_incentive, 0),
    status = CASE WHEN status = 'Received' THEN 'In Progress' ELSE status END,
    status_changed_at = CASE WHEN status = 'Received' THEN now() ELSE status_changed_at END
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'job_type_ref_id', p_job_type_ref_id,
    'title', v_job_type.title,
    'customer_charge_amount', v_job_type.customer_charge_amount,
    'snap_technician_incentive', v_job_type.technician_incentive,
    'status', CASE WHEN v_job.status = 'Received' THEN 'In Progress' ELSE v_job.status END,
    'message', 'Job service type assigned successfully.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_job_service_type(uuid, uuid, uuid) TO authenticated;

