-- ============================================================================
-- Migration: 20261106022500_phase2_issue1_staff_edit_and_safe_delete.sql
-- Description: Phase 2 Issue 1 — Staff Edit and Safe Delete RPCs
--
-- 1. Updates admin_manage_staff_status() to:
--    - Intelligently check for linked records (jobs, attendance, invoices, payments).
--    - Perform safe deactivation (soft delete) when linked records exist to protect
--      financial and operational audit history.
--    - Perform hard deletion only when no linked records exist.
-- 2. Adds admin_update_staff_details() RPC to allow administrators to edit
--    staff name, phone, and role with input validation and auth metadata sync.
-- ============================================================================

-- 0. Update protect_user_roles to allow service_role and transaction bypass
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If role or is_active is being changed, ensure caller is an admin or service_role
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    IF NOT (
      public.is_admin() 
      OR current_setting('role', true) = 'service_role' 
      OR current_setting('app.bypass_role_protection', true) = 'true'
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Only administrators can modify roles or active status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 1. Update admin_manage_staff_status with smart soft/hard delete
CREATE OR REPLACE FUNCTION public.admin_manage_staff_status(
  p_user_id uuid,
  p_action text DEFAULT 'deactivate'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id     uuid := auth.uid();
  v_caller_role   text;
  v_caller_active boolean;
  v_target_name   text;
  v_target_role   text;
  v_has_records   boolean := false;
BEGIN
  -- 1. Validate caller authentication
  IF v_caller_id IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.';
  END IF;

  -- 2. Validate caller has active admin privileges
  IF v_caller_id IS NOT NULL THEN
    SELECT role, is_active INTO v_caller_role, v_caller_active
    FROM public.users
    WHERE id = v_caller_id;

    IF v_caller_role <> 'admin' OR v_caller_active <> true THEN
      RAISE EXCEPTION 'Forbidden: Only active administrators can manage staff status.';
    END IF;
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

  PERFORM set_config('app.bypass_role_protection', 'true', true);

  -- 5. Handle ACTION: 'activate'
  IF p_action = 'activate' THEN
    UPDATE public.users
    SET is_active = true,
        updated_at = now()
    WHERE id = p_user_id;

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

    UPDATE auth.users
    SET banned_until = '2999-12-31 23:59:59+00'
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'deactivated',
      'user_id', p_user_id,
      'message', format('Staff member %s has been deactivated and login access revoked. Historical records preserved.', v_target_name)
    );

  -- 7. Handle ACTION: 'delete' (Smart delete: soft-delete if records exist, hard-delete if clean)
  ELSIF p_action = 'delete' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.jobs WHERE technician_id = p_user_id OR receptionist_id = p_user_id
      UNION ALL
      SELECT 1 FROM public.job_technicians WHERE technician_id = p_user_id
      UNION ALL
      SELECT 1 FROM public.attendance WHERE user_id = p_user_id OR approved_by = p_user_id
      UNION ALL
      SELECT 1 FROM public.invoices WHERE created_by = p_user_id
      UNION ALL
      SELECT 1 FROM public.payments WHERE user_id = p_user_id OR created_by = p_user_id
    ) INTO v_has_records;

    IF v_has_records THEN
      -- Safe deactivation to preserve financial & operational audit history
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
        'is_soft_deleted', true,
        'message', format('Staff member %s has associated history (jobs/attendance/payments). Their account was safely deactivated to preserve accounting records.', v_target_name)
      );
    ELSE
      -- Hard deletion (no records attached)
      DELETE FROM public.job_technicians WHERE technician_id = p_user_id;
      DELETE FROM public.users WHERE id = p_user_id;
      DELETE FROM auth.users WHERE id = p_user_id;

      RETURN jsonb_build_object(
        'success', true,
        'action', 'deleted',
        'is_soft_deleted', false,
        'message', format('Staff member %s had no linked records and has been permanently deleted.', v_target_name)
      );
    END IF;

  ELSE
    RAISE EXCEPTION 'Invalid action "%". Supported actions are activate, deactivate, delete.', p_action;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_manage_staff_status(uuid, text) TO authenticated;

-- 2. Create admin_update_staff_details RPC
CREATE OR REPLACE FUNCTION public.admin_update_staff_details(
  p_user_id uuid,
  p_name    text,
  p_phone   text DEFAULT NULL,
  p_role    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_caller_act  boolean;
  v_norm_role   text;
  v_clean_phone text;
  v_clean_name  text;
  v_old_role    text;
BEGIN
  IF v_caller_id IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.';
  END IF;

  IF v_caller_id IS NOT NULL THEN
    SELECT role, is_active INTO v_caller_role, v_caller_act
    FROM public.users
    WHERE id = v_caller_id;

    IF v_caller_role <> 'admin' OR v_caller_act <> true THEN
      RAISE EXCEPTION 'Forbidden: Only active administrators can modify staff details.';
    END IF;
  END IF;

  v_clean_name := trim(COALESCE(p_name, ''));
  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Staff name cannot be empty.';
  END IF;

  IF p_role IS NOT NULL THEN
    v_norm_role := lower(trim(p_role));
    IF v_norm_role NOT IN ('admin', 'receptionist', 'technician') THEN
      RAISE EXCEPTION 'Invalid role "%". Allowed roles are admin, receptionist, technician.', p_role;
    END IF;
  END IF;

  v_clean_phone := NULLIF(trim(COALESCE(p_phone, '')), '');

  SELECT role INTO v_old_role FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff member with ID % not found.', p_user_id;
  END IF;

  PERFORM set_config('app.bypass_role_protection', 'true', true);

  UPDATE public.users
  SET name       = v_clean_name,
      phone      = v_clean_phone,
      role       = COALESCE(v_norm_role, role),
      updated_at = now()
  WHERE id = p_user_id;

  -- Synchronize role metadata in auth.users
  IF v_norm_role IS NOT NULL THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(v_norm_role)
    )
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Staff member %s updated successfully.', v_clean_name),
    'user_id', p_user_id,
    'name', v_clean_name,
    'phone', v_clean_phone,
    'role', COALESCE(v_norm_role, v_old_role)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_staff_details(uuid, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
