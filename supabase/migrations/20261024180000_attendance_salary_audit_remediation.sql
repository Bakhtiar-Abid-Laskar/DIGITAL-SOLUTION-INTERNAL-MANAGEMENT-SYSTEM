-- Migration: 20261024180000_attendance_salary_audit_remediation.sql
-- Description: Fixes SEC-001, SEC-002, SEC-003, ATT-002, ATT-005, ATT-006, SAL-002, SAL-004, SAL-005, SAL-006, SAL-008
-- Strategy: Additive schema evolution, security hardening triggers, server-side geofencing, penny-preserving splits, and payroll locks.

-- ============================================================================
-- 1. SEC-001: Protect User Roles & Active Status from Non-Admin Tampering
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If role or is_active is being changed, ensure caller is an admin
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    IF NOT (SELECT public.is_admin()) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Only administrators can modify roles or active status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.users;
CREATE TRIGGER trg_protect_user_roles
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_user_roles();


-- ============================================================================
-- 2. SAL-008: Add hire_date and termination_date to public.users
-- ============================================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hire_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS termination_date date;


-- ============================================================================
-- 3. ATT-002: Geofence Settings Default 40m & Distance Utility Function
-- ============================================================================
ALTER TABLE public.geofence_settings
  ALTER COLUMN radius_meters SET DEFAULT 40;

-- Update existing default rows from 100/200 to 40
UPDATE public.geofence_settings
SET radius_meters = 40
WHERE radius_meters IN (100, 200);

-- Mathematical Haversine function in meters (Earth radius = 6,371,000 m)
DROP FUNCTION IF EXISTS public.calculate_distance_meters(numeric, numeric, numeric, numeric);
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(
  lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r CONSTANT numeric := 6371000;
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat / 2.0)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2.0)^2;
  IF a > 1.0 THEN a := 1.0; ELSIF a < 0.0 THEN a := 0.0; END IF;
  c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
  RETURN ROUND(r * c, 2);
END;
$$;


-- ============================================================================
-- 4. SEC-002, SEC-003, ATT-005, ATT-006: Server-Side Attendance Rules & Columns
-- ============================================================================
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS distance_meters numeric(10, 2),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_note text,
  ADD COLUMN IF NOT EXISTS auto_closed boolean DEFAULT false;

-- Add index on attendance date for reporting & salary calculation
CREATE INDEX IF NOT EXISTS idx_attendance_date_user ON public.attendance (date, user_id);

CREATE OR REPLACE FUNCTION public.enforce_server_attendance_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_geo RECORD;
  v_dist numeric;
  v_radius integer := 40;
  v_is_admin boolean;
BEGIN
  v_is_admin := public.is_admin();

  -- Disallow non-admins from manually tampering with review_status, approved_by, approved_at, approval_note
  IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
    IF (NEW.review_status IS DISTINCT FROM OLD.review_status) OR
       (NEW.approved_by IS DISTINCT FROM OLD.approved_by) OR
       (NEW.approved_at IS DISTINCT FROM OLD.approved_at) OR
       (NEW.approval_note IS DISTINCT FROM OLD.approval_note) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Only administrators can approve or alter attendance review status.';
    END IF;
  END IF;

  -- Server-side Geofencing Enforcement
  SELECT center_lat, center_lng, COALESCE(radius_meters, 40) as radius_meters
  INTO v_geo
  FROM public.geofence_settings
  WHERE is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF FOUND AND v_geo.center_lat IS NOT NULL AND v_geo.center_lng IS NOT NULL THEN
    v_radius := v_geo.radius_meters;
    IF NEW.gps_lat IS NOT NULL AND NEW.gps_lng IS NOT NULL THEN
      v_dist := public.calculate_distance_meters(NEW.gps_lat, NEW.gps_lng, v_geo.center_lat, v_geo.center_lng);
      NEW.distance_meters := v_dist;

      -- If caller is not admin, enforce at_location and review_status strictly based on distance
      IF NOT v_is_admin THEN
        IF v_dist <= v_radius AND NOT COALESCE(NEW.low_accuracy, false) THEN
          NEW.at_location := true;
          NEW.review_status := 'approved';
        ELSE
          NEW.at_location := false;
          NEW.review_status := 'pending';
        END IF;
      END IF;
    END IF;
  END IF;

  -- ATT-003: Server-side timestamp enforcement (override client-spoofed device clock)
  IF NOT v_is_admin THEN
    IF TG_OP = 'INSERT' AND NEW.check_in_time IS NOT NULL THEN
      NEW.check_in_time := now();
    ELSIF TG_OP = 'UPDATE' AND OLD.check_in_time IS NULL AND NEW.check_in_time IS NOT NULL THEN
      NEW.check_in_time := now();
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.check_out_time IS NULL AND NEW.check_out_time IS NOT NULL THEN
      NEW.check_out_time := now();
    END IF;
  END IF;

  -- Record audit trail on admin review decision
  IF TG_OP = 'UPDATE' AND v_is_admin THEN
    IF NEW.review_status IS DISTINCT FROM OLD.review_status AND NEW.review_status IN ('approved', 'rejected') THEN
      NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
      NEW.approved_at := COALESCE(NEW.approved_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_server_attendance_rules ON public.attendance;
CREATE TRIGGER trg_enforce_server_attendance_rules
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.enforce_server_attendance_rules();


-- ============================================================================
-- 5. SAL-004 & SAL-005: Multi-Technician Incentive Split & Job Reassignment Protection
-- ============================================================================
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
  v_remainder     numeric := 0;
  v_idx           int := 0;
  v_tech          RECORD;
BEGIN
  IF TG_TABLE_NAME = 'jobs' THEN
    IF NEW.status = 'Completed' AND (TG_OP = 'INSERT' OR COALESCE(OLD.status, '') != 'Completed' OR OLD.snap_technician_incentive IS DISTINCT FROM NEW.snap_technician_incentive) THEN
      DELETE FROM public.staff_incentives WHERE job_id = NEW.id AND source_type = 'job';

      v_total_incentive := COALESCE(NEW.snap_technician_incentive, 0);

      IF v_total_incentive > 0 THEN
        SELECT count(*) INTO v_tech_count
        FROM public.job_technicians
        WHERE job_id = NEW.id AND removed_at IS NULL;

        IF v_tech_count > 0 THEN
          -- Penny-preserving equal split (no remainder paise lost)
          v_split_amount := FLOOR((v_total_incentive / v_tech_count) * 100) / 100;
          v_remainder := v_total_incentive - (v_split_amount * v_tech_count);
          v_idx := 0;

          FOR v_tech IN
            SELECT technician_id FROM public.job_technicians
            WHERE job_id = NEW.id AND removed_at IS NULL
            ORDER BY assigned_at ASC, technician_id ASC
          LOOP
            v_idx := v_idx + 1;
            INSERT INTO public.staff_incentives
              (user_id, source_type, job_id, amount, accrued_at)
            VALUES
              (v_tech.technician_id, 'job', NEW.id,
               CASE WHEN v_idx = 1 THEN v_split_amount + v_remainder ELSE v_split_amount END,
               COALESCE(NEW.completed_at, now()));
          END LOOP;
        ELSIF NEW.technician_id IS NOT NULL THEN
          INSERT INTO public.staff_incentives
            (user_id, source_type, job_id, amount, accrued_at)
          VALUES
            (NEW.technician_id, 'job', NEW.id, v_total_incentive, COALESCE(NEW.completed_at, now()));
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

DROP FUNCTION IF EXISTS public.assign_job_technicians(uuid, uuid[], uuid);

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
  v_tech_id       uuid;
  v_primary_tech  uuid := NULL;
  v_job           RECORD;
  v_tech_count    int;
  v_split_amount  numeric := 0;
  v_remainder     numeric := 0;
  v_idx           int := 0;
  v_payroll_paid  boolean := false;
  v_user_id       uuid;
  v_is_authorized boolean := false;
BEGIN
  v_user_id := COALESCE(p_caller_id, auth.uid());

  SELECT (role = 'admin' OR role = 'receptionist') INTO v_is_authorized
  FROM public.users WHERE id = v_user_id;

  IF NOT COALESCE(v_is_authorized, false) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only Admin and Receptionist can assign technicians.';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  -- SAL-005 Protection: If job is already Completed, check if payroll for its completion month is already paid
  IF v_job.status = 'Completed' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.salary s
      JOIN public.job_technicians jt ON jt.technician_id = s.user_id
      WHERE jt.job_id = p_job_id AND jt.removed_at IS NULL
        AND s.month = date_trunc('month', COALESCE(v_job.completed_at, now()))::date
        AND s.status = 'paid'
    ) INTO v_payroll_paid;

    IF v_payroll_paid THEN
      RAISE EXCEPTION 'CANNOT_REASSIGN_PAID_JOB: Cannot reassign technicians on a completed job whose payroll period is already marked as paid.';
    END IF;
  END IF;

  -- Soft-remove technicians not in the new array
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

  IF array_length(p_technician_ids, 1) > 0 THEN
    v_primary_tech := p_technician_ids[1];
  END IF;

  UPDATE public.jobs
  SET technician_id = v_primary_tech
  WHERE id = p_job_id;

  -- Reconcile incentives if job was Completed
  IF v_job.status = 'Completed' AND COALESCE(v_job.snap_technician_incentive, 0) > 0 THEN
    DELETE FROM public.staff_incentives WHERE job_id = p_job_id AND source_type = 'job';

    SELECT count(*) INTO v_tech_count
    FROM public.job_technicians
    WHERE job_id = p_job_id AND removed_at IS NULL;

    IF v_tech_count > 0 THEN
      v_split_amount := FLOOR((v_job.snap_technician_incentive / v_tech_count) * 100) / 100;
      v_remainder := v_job.snap_technician_incentive - (v_split_amount * v_tech_count);
      v_idx := 0;

      FOR v_tech_id IN
        SELECT technician_id FROM public.job_technicians
        WHERE job_id = p_job_id AND removed_at IS NULL
        ORDER BY assigned_at ASC, technician_id ASC
      LOOP
        v_idx := v_idx + 1;
        INSERT INTO public.staff_incentives
          (user_id, source_type, job_id, amount, accrued_at)
        VALUES
          (v_tech_id, 'job', p_job_id,
           CASE WHEN v_idx = 1 THEN v_split_amount + v_remainder ELSE v_split_amount END,
           COALESCE(v_job.completed_at, now()));
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


-- ============================================================================
-- 6. SAL-006: RLS Policy Allowing Staff to View Own Salary
-- ============================================================================
DROP POLICY IF EXISTS "salary_own_select" ON public.salary;
CREATE POLICY "salary_own_select"
  ON public.salary FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));


-- ============================================================================
-- 7. SAL-002: Immutability Trigger on Paid Salary Records
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_paid_salary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If OLD status is paid, disallow mutations to core financial figures
  IF OLD.status = 'paid' AND NEW.status = 'paid' THEN
    IF (OLD.net_salary IS DISTINCT FROM NEW.net_salary OR
        OLD.gross_salary IS DISTINCT FROM NEW.gross_salary OR
        OLD.monthly_salary_base IS DISTINCT FROM NEW.monthly_salary_base OR
        OLD.present_days IS DISTINCT FROM NEW.present_days OR
        OLD.advance_deducted IS DISTINCT FROM NEW.advance_deducted) THEN
      RAISE EXCEPTION 'PAYROLL_LOCKED: Closed and paid salary records cannot be modified without reopening.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_paid_salary ON public.salary;
CREATE TRIGGER trg_protect_paid_salary
BEFORE UPDATE ON public.salary
FOR EACH ROW EXECUTE FUNCTION public.protect_paid_salary();

-- ============================================================================
-- ROLLBACK SCRIPT (for documentation and safe rollback)
-- ============================================================================
-- DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.users;
-- DROP FUNCTION IF EXISTS public.protect_user_roles();
-- DROP TRIGGER IF EXISTS trg_enforce_server_attendance_rules ON public.attendance;
-- DROP FUNCTION IF EXISTS public.enforce_server_attendance_rules();
-- DROP FUNCTION IF EXISTS public.calculate_distance_meters(numeric, numeric, numeric, numeric);
-- DROP TRIGGER IF EXISTS trg_protect_paid_salary ON public.salary;
-- DROP FUNCTION IF EXISTS public.protect_paid_salary();
-- DROP POLICY IF EXISTS "salary_own_select" ON public.salary;
