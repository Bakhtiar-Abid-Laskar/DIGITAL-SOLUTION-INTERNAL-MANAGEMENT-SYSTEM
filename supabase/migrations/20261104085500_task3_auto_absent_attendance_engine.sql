-- ============================================================================
-- Migration: 20261104085500_task3_auto_absent_attendance_engine.sql
-- Description:
--   1. Adds `is_auto_marked boolean DEFAULT false` and `marked_at timestamptz`
--      to `public.attendance`.
--   2. Creates idempotent `public.mark_absent_for_date(target_date date)` function:
--      - Respects Sundays as weekly offs.
--      - Respects public holidays in `public.holidays`.
--      - Evaluates all active technicians and receptionists.
--      - Respects existing approved leaves in `public.employee_leave`.
--      - Enforces TitleCase 'Absent' matching `attendance_status_check`.
--   3. Adds trigger on `public.employee_leave` to overwrite auto-marked 'Absent'
--      records to 'Leave' whenever an admin retroactively approves leave.
--   4. Schedules pg_cron job at 00:05 IST daily (18:35 UTC).
-- ============================================================================

-- 1. Ensure columns exist on public.attendance
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS is_auto_marked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marked_at timestamptz;

-- 2. Create idempotent mark_absent_for_date function
CREATE OR REPLACE FUNCTION public.mark_absent_for_date(p_target_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_dow int;
  v_is_holiday boolean;
  v_staff RECORD;
  v_has_approved_leave boolean;
  v_marked_count int := 0;
  v_leave_count int := 0;
  v_already_exists boolean;
BEGIN
  -- 1. Check if Sunday (EXTRACT(DOW FROM p_target_date) = 0 where 0 = Sunday)
  v_dow := EXTRACT(DOW FROM p_target_date);
  IF v_dow = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'target_date', p_target_date,
      'status', 'skipped_sunday_weekly_off',
      'absent_marked_count', 0,
      'leave_marked_count', 0,
      'message', 'Sunday is designated as an official weekly off.'
    );
  END IF;

  -- 2. Check if Public Holiday
  SELECT EXISTS (
    SELECT 1 FROM public.holidays WHERE date = p_target_date
  ) INTO v_is_holiday;

  IF v_is_holiday THEN
    RETURN jsonb_build_object(
      'success', true,
      'target_date', p_target_date,
      'status', 'skipped_public_holiday',
      'absent_marked_count', 0,
      'leave_marked_count', 0,
      'message', 'Date matches a designated public holiday in public.holidays.'
    );
  END IF;

  -- 3. Loop through active technicians and receptionists
  FOR v_staff IN
    SELECT id, name, role
    FROM public.users
    WHERE is_active = true
      AND role IN ('technician', 'receptionist')
  LOOP
    -- Check if an attendance record already exists for this staff on target_date
    SELECT EXISTS (
      SELECT 1 FROM public.attendance
      WHERE user_id = v_staff.id AND date = p_target_date
    ) INTO v_already_exists;

    IF NOT v_already_exists THEN
      -- Check if staff had approved leave on target_date
      SELECT EXISTS (
        SELECT 1 FROM public.employee_leave
        WHERE user_id = v_staff.id
          AND leave_date = p_target_date
          AND status = 'approved'
      ) INTO v_has_approved_leave;

      IF v_has_approved_leave THEN
        INSERT INTO public.attendance (
          user_id,
          date,
          status,
          is_auto_marked,
          marked_at
        ) VALUES (
          v_staff.id,
          p_target_date,
          'Leave',
          false,
          now()
        )
        ON CONFLICT (user_id, date) DO NOTHING;

        v_leave_count := v_leave_count + 1;
      ELSE
        INSERT INTO public.attendance (
          user_id,
          date,
          status,
          is_auto_marked,
          marked_at
        ) VALUES (
          v_staff.id,
          p_target_date,
          'Absent',
          true,
          now()
        )
        ON CONFLICT (user_id, date) DO NOTHING;

        v_marked_count := v_marked_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'target_date', p_target_date,
    'status', 'completed',
    'absent_marked_count', v_marked_count,
    'leave_marked_count', v_leave_count
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.mark_absent_for_date(date) TO authenticated, service_role;

-- 3. Late-leave approval trigger to automatically overwrite auto-marked 'Absent' with 'Leave'
CREATE OR REPLACE FUNCTION public.handle_late_leave_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.attendance
    SET status = 'Leave'
    WHERE user_id = NEW.user_id
      AND date = NEW.leave_date
      AND (status = 'Absent' OR is_auto_marked = true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employee_leave_approval_overwrite ON public.employee_leave;
CREATE TRIGGER trg_employee_leave_approval_overwrite
  AFTER UPDATE OF status ON public.employee_leave
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_late_leave_approval();

-- 4. Schedule pg_cron job at 00:05 IST (18:35 UTC daily)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-auto-absent-ist') THEN
    PERFORM cron.unschedule('daily-auto-absent-ist');
  END IF;
END $$;

SELECT cron.schedule(
  'daily-auto-absent-ist',
  '35 18 * * *',
  $$SELECT public.mark_absent_for_date((now() AT TIME ZONE 'Asia/Kolkata' - interval '1 day')::date);$$
);

NOTIFY pgrst, 'reload schema';
