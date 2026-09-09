-- Migration: 20260909103000_admin_manage_staff_status_rpc.sql
-- Description: Centralized RPC to manage staff status (deactivate, activate, force delete)

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

  -- 7. Handle ACTION: 'delete' (Force delete — nullify FK references, then hard delete)
  ELSIF p_action = 'delete' THEN
    -- Step 1: Nullify nullable FK references so the user row can be deleted
    -- without violating foreign key constraints, while keeping all audit records intact.

    -- a. jobs — clear technician/receptionist assignments
    UPDATE public.jobs
    SET technician_id  = NULL WHERE technician_id  = p_user_id;
    UPDATE public.jobs
    SET receptionist_id = NULL WHERE receptionist_id = p_user_id;

    -- b. job_technicians — remove assignment rows (junction table, safe to delete)
    DELETE FROM public.job_technicians WHERE technician_id = p_user_id;

    -- c. payments — clear user_id and recorded_by (keep payment rows for audit)
    UPDATE public.payments
    SET user_id = NULL WHERE user_id = p_user_id;
    UPDATE public.payments
    SET recorded_by = NULL WHERE recorded_by = p_user_id;

    -- d. attendance — clear user_id and approved_by
    UPDATE public.attendance
    SET user_id = NULL WHERE user_id = p_user_id;
    UPDATE public.attendance
    SET approved_by = NULL WHERE approved_by = p_user_id;

    -- e. customer_ledger — clear recorded_by (table may not exist on all deployments)
    BEGIN
      UPDATE public.customer_ledger
      SET recorded_by = NULL WHERE recorded_by = p_user_id;
    EXCEPTION WHEN undefined_table THEN
      -- table does not exist, skip
    END;

    -- f. onsite_visits — clear technician_id (table may not exist on all deployments)
    BEGIN
      UPDATE public.onsite_visits
      SET technician_id = NULL WHERE technician_id = p_user_id;
    EXCEPTION WHEN undefined_table THEN
      -- table does not exist, skip
    END;

    -- g. salary — clear user_id if table exists
    BEGIN
      UPDATE public.salary
      SET user_id = NULL WHERE user_id = p_user_id;
    EXCEPTION WHEN undefined_table THEN
    END;

    -- Step 2: Hard delete from public.users and auth.users
    DELETE FROM public.users WHERE id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'deleted',
      'message', format('Staff member %s has been permanently deleted. All associated records have been preserved with their references cleared.', v_target_name)
    );

  ELSE
    RAISE EXCEPTION 'Invalid action: %. Expected deactivate, activate, or delete.', p_action;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_manage_staff_status(uuid, text) TO authenticated;
