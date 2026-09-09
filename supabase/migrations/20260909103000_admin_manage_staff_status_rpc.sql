-- Migration: 20260909103000_admin_manage_staff_status_rpc.sql
-- Description: Centralized RPC to manage staff status (deactivate, activate, safe delete)

CREATE OR REPLACE FUNCTION public.admin_manage_staff_status(
  p_user_id uuid,
  p_action text DEFAULT 'deactivate'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_caller_active boolean;
  v_target_name text;
  v_target_role text;
  v_has_records boolean := false;
  v_table_match text := '';
  v_temp_count bigint := 0;
BEGIN
  -- 1. Validate caller authentication
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.';
  END IF;

  -- 2. Validate caller has active admin privileges
  SELECT role, is_active INTO v_caller_role, v_caller_active
  FROM public.users
  WHERE id = v_caller_id;

  IF v_caller_role != 'admin' OR v_caller_active != true THEN
    RAISE EXCEPTION 'Forbidden: Only active administrators can manage staff status.';
  END IF;

  -- 3. Prevent self-modification for deactivation/deletion
  IF v_caller_id = p_user_id AND p_action IN ('deactivate', 'delete') THEN
    RAISE EXCEPTION 'Cannot deactivate or delete your own active admin account.';
  END IF;

  -- 4. Check target user exists
  SELECT name, role INTO v_target_name, v_target_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_target_name IS NULL THEN
    RAISE EXCEPTION 'Staff member not found.';
  END IF;

  -- 5. Handle ACTION: 'activate'
  IF p_action = 'activate' THEN
    UPDATE public.users
    SET is_active = true,
        updated_at = now()
    WHERE id = p_user_id;

    -- Unban in auth.users if previously banned
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'activated',
      'user_id', p_user_id,
      'message', format('Staff member %s has been activated and login access restored.', v_target_name)
    );

  -- 6. Handle ACTION: 'deactivate'
  ELSIF p_action = 'deactivate' THEN
    UPDATE public.users
    SET is_active = false,
        updated_at = now()
    WHERE id = p_user_id;

    -- Ban in auth.users to immediately revoke login / access
    UPDATE auth.users
    SET banned_until = '2999-12-31 23:59:59+00'
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'deactivated',
      'user_id', p_user_id,
      'message', format('Staff member %s has been deactivated and login access revoked. Historical records preserved.', v_target_name)
    );

  -- 7. Handle ACTION: 'delete' (Option A with smart hard-delete only if 0 records)
  ELSIF p_action = 'delete' THEN
    -- Check dependent tables
    -- a. jobs
    SELECT count(*) INTO v_temp_count FROM public.jobs WHERE technician_id = p_user_id OR receptionist_id = p_user_id;
    IF v_temp_count > 0 THEN v_has_records := true; v_table_match := 'jobs'; END IF;

    -- b. job_technicians
    IF NOT v_has_records THEN
      SELECT count(*) INTO v_temp_count FROM public.job_technicians WHERE technician_id = p_user_id;
      IF v_temp_count > 0 THEN v_has_records := true; v_table_match := 'job_technicians'; END IF;
    END IF;

    -- c. payments
    IF NOT v_has_records THEN
      SELECT count(*) INTO v_temp_count FROM public.payments WHERE user_id = p_user_id OR recorded_by = p_user_id;
      IF v_temp_count > 0 THEN v_has_records := true; v_table_match := 'payments'; END IF;
    END IF;

    -- d. attendance
    IF NOT v_has_records THEN
      SELECT count(*) INTO v_temp_count FROM public.attendance WHERE user_id = p_user_id OR approved_by = p_user_id;
      IF v_temp_count > 0 THEN v_has_records := true; v_table_match := 'attendance'; END IF;
    END IF;

    -- e. customer_ledger (if exists)
    IF NOT v_has_records THEN
      BEGIN
        SELECT count(*) INTO v_temp_count FROM public.customer_ledger WHERE recorded_by = p_user_id;
        IF v_temp_count > 0 THEN v_has_records := true; v_table_match := 'customer_ledger'; END IF;
      EXCEPTION WHEN undefined_table THEN
        -- table does not exist, ignore
      END;
    END IF;

    -- f. onsite_visits
    IF NOT v_has_records THEN
      BEGIN
        SELECT count(*) INTO v_temp_count FROM public.onsite_visits WHERE technician_id = p_user_id;
        IF v_temp_count > 0 THEN v_has_records := true; v_table_match := 'onsite_visits'; END IF;
      EXCEPTION WHEN undefined_table THEN
      END;
    END IF;

    -- If has records: DO NOT HARD DELETE. Perform safe deactivation (Option A).
    IF v_has_records THEN
      UPDATE public.users
      SET is_active = false,
          updated_at = now()
      WHERE id = p_user_id;

      UPDATE auth.users
      SET banned_until = '2999-12-31 23:59:59+00'
      WHERE id = p_user_id;

      RETURN jsonb_build_object(
        'success', true,
        'action', 'deactivated',
        'has_records', true,
        'reason', format('Staff member has associated records in %s.', v_table_match),
        'message', format('Staff member %s has associated historical records (such as jobs or payments). The account has been deactivated and login access revoked while preserving all financial and job history.', v_target_name)
      );
    ELSE
      -- Zero records: Hard delete is safe
      DELETE FROM public.users WHERE id = p_user_id;
      DELETE FROM auth.users WHERE id = p_user_id;

      RETURN jsonb_build_object(
        'success', true,
        'action', 'deleted',
        'has_records', false,
        'message', format('Staff member %s had zero associated records and has been permanently deleted.', v_target_name)
      );
    END IF;

  ELSE
    RAISE EXCEPTION 'Invalid action: %s. Expected deactivate, activate, or delete.', p_action;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_manage_staff_status(uuid, text) TO authenticated;
