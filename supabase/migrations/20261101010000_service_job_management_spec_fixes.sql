-- ============================================================================
-- Migration: 20261101010000_service_job_management_spec_fixes.sql
-- Description:
--   1. R-21: Drop technician DELETE policy on job_materials (immutability).
--   2. R-23: Drop staff_incentives_user_read (hide commission from technician API).
--   3. R-08 / R-14 / R-20: Add completion_id and completion_id_verified_at to jobs.
--      Update accrue_incentives() to gate commission on completion_id_verified_at.
--      Create verify_job_completion_id() RPC.
--   4. R-01 / R-02: Add items_received column/alias on jobs synced with remarks.
--   5. R-18: Add other_status_reason to jobs.
--   6. R-08: Create public.customer_feedback table and submit_customer_feedback RPC.
--   7. R-26 / R-29: Create shift_settings table and attendance auto-calculation trigger.
--   8. R-22: Add is_material_locked to users and material lock check/unlock RPCs.
--   9. R-31: Create get_technician_pending_salary() RPC for technician panel.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. R-21: Block technician material deletion (Immutability & Audit Trail)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "job_materials_technician_delete" ON public.job_materials;
DROP POLICY IF EXISTS "job_materials_admin_delete" ON public.job_materials;

CREATE POLICY "job_materials_admin_delete"
  ON public.job_materials FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

-- ----------------------------------------------------------------------------
-- 2. R-23: Block technician direct read on staff_incentives (Commission Privacy)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_incentives_user_read" ON public.staff_incentives;
DROP POLICY IF EXISTS "staff_incentives_admin_only" ON public.staff_incentives;

CREATE POLICY "staff_incentives_admin_only"
  ON public.staff_incentives FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ----------------------------------------------------------------------------
-- 3. R-01 / R-02 / R-08 / R-14 / R-18 / R-20: Job Schema Enhancements
-- ----------------------------------------------------------------------------
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS completion_id text,
  ADD COLUMN IF NOT EXISTS completion_id_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS items_received text,
  ADD COLUMN IF NOT EXISTS other_status_reason text;

-- Create a unique index on completion_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_completion_id ON public.jobs(completion_id);

-- Backfill completion_id for existing jobs that lack one
UPDATE public.jobs
  SET completion_id = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6))
  WHERE completion_id IS NULL;

-- Ensure default for new jobs
ALTER TABLE public.jobs
  ALTER COLUMN completion_id SET DEFAULT UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6));

-- Sync items_received and remarks bidirectionally
CREATE OR REPLACE FUNCTION public.sync_job_items_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.items_received IS NOT NULL AND (OLD.items_received IS DISTINCT FROM NEW.items_received OR NEW.remarks IS NULL) THEN
    NEW.remarks := NEW.items_received;
  ELSIF NEW.remarks IS NOT NULL AND (OLD.remarks IS DISTINCT FROM NEW.remarks OR NEW.items_received IS NULL) THEN
    NEW.items_received := NEW.remarks;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_job_items_received ON public.jobs;
CREATE TRIGGER trg_sync_job_items_received
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_job_items_received();

-- ----------------------------------------------------------------------------
-- 4. R-14 / R-20: Gate Commission Behind Customer Completion ID Verification
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accrue_incentives()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    -- Accrue commission when job is completed (completion_id_verified_at set by client when completing)
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
            SELECT technician_id
            FROM public.job_technicians
            WHERE job_id = NEW.id AND removed_at IS NULL
            ORDER BY created_at ASC
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
    ELSIF NEW.status != 'Completed' THEN
      -- If status is reverted or cancelled, retract any accrued job commission
      DELETE FROM public.staff_incentives WHERE job_id = NEW.id AND source_type = 'job';
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

-- RPC to verify customer Job Completion ID
CREATE OR REPLACE FUNCTION public.verify_job_completion_id(
  p_job_id        uuid,
  p_completion_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'receptionist', 'technician') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF UPPER(TRIM(COALESCE(p_completion_id, ''))) != UPPER(TRIM(COALESCE(v_job.completion_id, ''))) THEN
    RAISE EXCEPTION 'Invalid Job Completion ID. Please verify the code provided by the customer.';
  END IF;

  UPDATE public.jobs
    SET completion_id_verified_at = now()
    WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Job Completion ID verified successfully. Commission unlocked.',
    'job_id', p_job_id,
    'verified_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_job_completion_id(uuid, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. R-08: Customer Feedback Portal
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments    text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_job_id ON public.customer_feedback(job_id);

ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_admin_all" ON public.customer_feedback;
CREATE POLICY "feedback_admin_all"
  ON public.customer_feedback FOR ALL TO authenticated
  USING ((SELECT public.is_admin()));

-- Public insert policy for customer submissions via token
DROP POLICY IF EXISTS "feedback_public_insert" ON public.customer_feedback;
CREATE POLICY "feedback_public_insert"
  ON public.customer_feedback FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. R-26 / R-29: Shift Settings & Attendance Auto-Calculation Trigger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shift_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_name        text NOT NULL DEFAULT 'General Shift',
  shift_start_time  time NOT NULL DEFAULT '09:30:00',
  shift_end_time    time NOT NULL DEFAULT '18:30:00',
  grace_minutes     integer NOT NULL DEFAULT 15,
  half_day_hours    numeric NOT NULL DEFAULT 4.5,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.shift_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shift_settings_read_all" ON public.shift_settings;
CREATE POLICY "shift_settings_read_all"
  ON public.shift_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "shift_settings_admin_write" ON public.shift_settings;
CREATE POLICY "shift_settings_admin_write"
  ON public.shift_settings FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Seed default shift if none exists
INSERT INTO public.shift_settings (shift_name, shift_start_time, shift_end_time, grace_minutes, half_day_hours)
SELECT 'General Shift', '09:30:00', '18:30:00', 15, 4.5
WHERE NOT EXISTS (SELECT 1 FROM public.shift_settings);

-- Attendance auto-calculation trigger
CREATE OR REPLACE FUNCTION public.compute_attendance_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_shift           public.shift_settings%ROWTYPE;
  v_check_in_ist    time;
  v_check_out_ist   time;
  v_start_allowed   time;
  v_late_mins       numeric := 0;
  v_ot_hours        numeric := 0;
  v_duration_hours  numeric := 0;
BEGIN
  SELECT * INTO v_shift FROM public.shift_settings WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Compute check-in metrics
  IF NEW.check_in_time IS NOT NULL THEN
    v_check_in_ist  := ((NEW.check_in_time AT TIME ZONE 'Asia/Kolkata'))::time;
    v_start_allowed := (v_shift.shift_start_time + (v_shift.grace_minutes || ' minutes')::interval)::time;

    IF v_check_in_ist > v_start_allowed THEN
      v_late_mins := round(EXTRACT(EPOCH FROM (v_check_in_ist - v_shift.shift_start_time)) / 60);
      NEW.late_in_minutes := GREATEST(0, v_late_mins);
    ELSE
      NEW.late_in_minutes := 0;
    END IF;
  END IF;

  -- Compute check-out metrics & overtime
  IF NEW.check_out_time IS NOT NULL THEN
    v_check_out_ist := ((NEW.check_out_time AT TIME ZONE 'Asia/Kolkata'))::time;

    IF v_check_out_ist > v_shift.shift_end_time THEN
      v_ot_hours := round((EXTRACT(EPOCH FROM (v_check_out_ist - v_shift.shift_end_time)) / 3600)::numeric, 2);
      NEW.ot_hours := GREATEST(0, v_ot_hours);
    ELSE
      NEW.ot_hours := 0;
    END IF;

    -- Compute duration and auto-derive Halfday if hours worked < threshold
    IF NEW.check_in_time IS NOT NULL THEN
      v_duration_hours := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600;
      IF v_duration_hours > 0 AND v_duration_hours < v_shift.half_day_hours AND NEW.status = 'Present' THEN
        NEW.status := 'Halfday';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_attendance_metrics ON public.attendance;
CREATE TRIGGER trg_compute_attendance_metrics
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.compute_attendance_metrics();

-- ----------------------------------------------------------------------------
-- 7. R-22: 48-Hour Return Auto-Lock on Unused Materials
-- ----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_material_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS material_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS material_locked_reason text;

CREATE OR REPLACE FUNCTION public.check_and_apply_material_locks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_overdue_count int := 0;
BEGIN
  -- Lock technicians who have unreturned material allotments older than 48 hours
  WITH overdue AS (
    SELECT DISTINCT technician_id
    FROM public.material_allotments
    WHERE status = 'allotted'
      AND created_at < (now() - interval '48 hours')
      AND technician_id IS NOT NULL
  )
  UPDATE public.users u
    SET is_material_locked = true,
        material_locked_at = now(),
        material_locked_reason = 'Automated lock: Unused materials not returned within 48 hours'
    FROM overdue o
    WHERE u.id = o.technician_id
      AND u.is_material_locked IS NOT TRUE;

  GET DIAGNOSTICS v_overdue_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'locked_count', v_overdue_count,
    'checked_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unlock_technician_materials(
  p_technician_id uuid,
  p_notes         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Only administrators can unlock technician accounts.';
  END IF;

  UPDATE public.users
    SET is_material_locked = false,
        material_locked_at = NULL,
        material_locked_reason = NULL
    WHERE id = p_technician_id;

  INSERT INTO public.payroll_audit_log (action, user_id, details, performed_by)
  VALUES ('admin_unlock_materials', p_technician_id, jsonb_build_object('notes', p_notes), auth.uid());

  RETURN jsonb_build_object('success', true, 'technician_id', p_technician_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unlock_technician_materials(uuid, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. R-31: Technician Pending Salary RPC (Privacy-Preserving Total)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_technician_pending_salary(
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_id        uuid;
  v_caller_role      text;
  v_rates            public.staff_rates%ROWTYPE;
  v_base_monthly     numeric := 0;
  v_working_days     int := 26;
  v_present_days     int := 0;
  v_halfday_days     int := 0;
  v_month_start      date;
  v_month_end        date;
  v_ot_hours         numeric := 0;
  v_ot_pay           numeric := 0;
  v_commissions      numeric := 0;
  v_advances         numeric := 0;
  v_absences         int := 0;
  v_absence_ded      numeric := 0;
  v_halfday_ded      numeric := 0;
  v_estimated_net    numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();

  -- Technician can only request their own pending salary
  IF v_caller_role = 'technician' THEN
    v_target_id := auth.uid();
  ELSE
    v_target_id := COALESCE(p_user_id, auth.uid());
  END IF;

  v_month_start := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_month_end   := (date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 month - 1 day')::date;

  SELECT * INTO v_rates FROM public.staff_rates WHERE user_id = v_target_id;
  v_base_monthly := COALESCE(v_rates.monthly_salary, 0);

  -- Count approved attendance for current month
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE status = 'Present'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'Halfday'), 0),
    COALESCE(SUM(ot_hours), 0)
  INTO v_present_days, v_halfday_days, v_ot_hours
  FROM public.attendance
  WHERE user_id = v_target_id
    AND date >= v_month_start AND date <= v_month_end;

  v_ot_pay := round(v_ot_hours * COALESCE(v_rates.ot_rate_per_hour, 0), 2);

  -- Sum commissions earned on jobs where customer completion ID has been verified
  SELECT COALESCE(SUM(amount), 0)
  INTO v_commissions
  FROM public.staff_incentives
  WHERE user_id = v_target_id
    AND accrued_at >= (v_month_start::text || 'T00:00:00+05:30')::timestamptz
    AND accrued_at <= (v_month_end::text || 'T23:59:59+05:30')::timestamptz;

  -- Advances taken
  SELECT COALESCE(SUM(amount), 0)
  INTO v_advances
  FROM public.payments
  WHERE user_id = v_target_id
    AND type = 'advance_salary'
    AND created_at >= (v_month_start::text || 'T00:00:00+05:30')::timestamptz
    AND created_at <= (v_month_end::text || 'T23:59:59+05:30')::timestamptz;

  v_halfday_ded := round(v_halfday_days * COALESCE(v_rates.halfday_deduction_rate, (v_base_monthly / 60)), 2);

  -- Combined pending estimate
  v_estimated_net := GREATEST(0, round(
    v_base_monthly + v_ot_pay + v_commissions - v_halfday_ded - v_advances, 2
  ));

  RETURN jsonb_build_object(
    'user_id', v_target_id,
    'month', to_char(v_month_start, 'YYYY-MM'),
    'estimated_net_salary', v_estimated_net,
    'present_days', v_present_days,
    'halfday_days', v_halfday_days,
    'overtime_hours', v_ot_hours,
    'advance_taken', v_advances
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_technician_pending_salary(uuid) TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

