-- Migration: 20260909130001_update_admin_manage_staff_status_simplified.sql
-- Description: Update admin_manage_staff_status to use simplified delete logic.
--              Now that all FK references to users(id) are ON DELETE SET NULL
--              (see 20260909130000_fix_user_fk_for_force_delete.sql),
--              the delete action just needs to clean up job_technicians and delete the user row.

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

  -- 7. Handle ACTION: 'delete' (Force delete)
  --    All FK references to public.users(id) are now ON DELETE SET NULL
  --    (migration 20260909130000), so deleting the user row automatically
  --    nullifies those references. Only job_technicians needs explicit cleanup
  --    (it was already ON DELETE CASCADE but we ensure it here).
  ELSIF p_action = 'delete' THEN
    -- Remove technician assignment rows (junction table)
    DELETE FROM public.job_technicians WHERE technician_id = p_user_id;

    -- Hard delete from public.users — DB constraints handle all FK nullification
    DELETE FROM public.users WHERE id = p_user_id;

    -- Also attempt to delete from auth.users (Edge Function admin API does this too as backup)
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'deleted',
      'message', format('Staff member %s has been permanently deleted. All historical records are preserved with staff references cleared.', v_target_name)
    );

  ELSE
    RAISE EXCEPTION 'Invalid action: %. Expected activate, deactivate, or delete.', p_action;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_manage_staff_status(uuid, text) TO authenticated;
