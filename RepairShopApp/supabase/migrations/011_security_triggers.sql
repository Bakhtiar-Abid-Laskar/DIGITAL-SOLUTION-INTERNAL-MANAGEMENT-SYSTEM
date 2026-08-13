-- ============================================================================
-- Phase 9: Security Triggers — Column-Level Restrictions
-- ============================================================================
-- This migration creates triggers that enforce column-level restrictions
-- beyond what RLS policies can enforce.
--
-- RLS policies control ROW access (which rows can be read/written).
-- These triggers control COLUMN access (which columns can be changed).
--
-- Two critical triggers:
-- 1. Prevent non-admin users from escalating their own role/is_active
-- 2. Prevent technicians from modifying restricted job fields
--
-- IMPORTANT: Run this AFTER 010_final_rls_policies.sql
-- ============================================================================


-- ============================================================================
-- TRIGGER 1: Prevent non-admin user self-escalation
-- ============================================================================
-- Problem: The users_update_own policy allows users to update their own row,
-- which is needed for saving expo_push_token. But without column-level
-- restriction, a user could change their own role to 'admin' or set
-- is_active = true to bypass approval.
--
-- Solution: This trigger checks if the caller is NOT an admin. If not,
-- it prevents changes to the role and is_active columns by reverting
-- those values to OLD values.
--
-- This does NOT break admin updates because admin updates go through
-- the users_update_admin policy and the trigger checks current_user_role().

CREATE OR REPLACE FUNCTION public.fn_prevent_non_admin_user_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Get caller's role using the same helper function
  caller_role := public.current_user_role();

  -- Only restrict non-admin users
  IF caller_role IS DISTINCT FROM 'admin' THEN
    -- Prevent role change
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      NEW.role := OLD.role;
    END IF;

    -- Prevent is_active change (self-activation/deactivation)
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      NEW.is_active := OLD.is_active;
    END IF;

    -- Prevent created_at tampering
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      NEW.created_at := OLD.created_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists to make migration idempotent
DROP TRIGGER IF EXISTS trg_prevent_non_admin_user_self_escalation ON public.users;

CREATE TRIGGER trg_prevent_non_admin_user_self_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_non_admin_user_self_escalation();

COMMENT ON TRIGGER trg_prevent_non_admin_user_self_escalation ON public.users IS
  'Prevents non-admin users from changing their own role or is_active status. '
  'This is a critical security control that supplements RLS policies.';


-- ============================================================================
-- TRIGGER 2: Prevent technician from modifying restricted job fields
-- ============================================================================
-- Problem: The jobs_update_assigned_technician policy allows technicians to
-- update their assigned jobs, which is needed for status changes and work
-- notes. But without column-level restriction, a technician could:
--   - Reassign the job to another technician (change technician_id)
--   - Change customer info, priority, device type, etc.
--   - Clear the receptionist_id
--
-- Solution: This trigger checks if the caller is a technician. If so,
-- it only allows changes to: status, work_notes, completed_at.
-- All other fields are reverted to their OLD values.
--
-- This does NOT affect admin or receptionist updates.

CREATE OR REPLACE FUNCTION public.fn_prevent_technician_restricted_job_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  caller_role := public.current_user_role();

  -- Only restrict technician role
  IF caller_role = 'technician' THEN
    -- Revert all restricted fields to their original values
    -- Technician may ONLY change: status, work_notes, completed_at

    -- Prevent job_code change
    IF NEW.job_code IS DISTINCT FROM OLD.job_code THEN
      NEW.job_code := OLD.job_code;
    END IF;

    -- Prevent customer field changes
    IF NEW.customer_name IS DISTINCT FROM OLD.customer_name THEN
      NEW.customer_name := OLD.customer_name;
    END IF;

    IF NEW.customer_contact IS DISTINCT FROM OLD.customer_contact THEN
      NEW.customer_contact := OLD.customer_contact;
    END IF;

    IF NEW.customer_email IS DISTINCT FROM OLD.customer_email THEN
      NEW.customer_email := OLD.customer_email;
    END IF;

    -- Prevent device/issue changes
    IF NEW.device_type IS DISTINCT FROM OLD.device_type THEN
      NEW.device_type := OLD.device_type;
    END IF;

    IF NEW.reported_issue IS DISTINCT FROM OLD.reported_issue THEN
      NEW.reported_issue := OLD.reported_issue;
    END IF;

    IF NEW.remarks IS DISTINCT FROM OLD.remarks THEN
      NEW.remarks := OLD.remarks;
    END IF;

    -- Prevent job metadata changes
    IF NEW.job_type IS DISTINCT FROM OLD.job_type THEN
      NEW.job_type := OLD.job_type;
    END IF;

    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      NEW.priority := OLD.priority;
    END IF;

    -- Prevent assignment changes (CRITICAL)
    IF NEW.technician_id IS DISTINCT FROM OLD.technician_id THEN
      NEW.technician_id := OLD.technician_id;
    END IF;

    IF NEW.receptionist_id IS DISTINCT FROM OLD.receptionist_id THEN
      NEW.receptionist_id := OLD.receptionist_id;
    END IF;

    -- Prevent created_at tampering
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      NEW.created_at := OLD.created_at;
    END IF;

    -- ALLOWED changes for technician (not reverted):
    -- NEW.status        (status updates)
    -- NEW.work_notes    (technician work notes)
    -- NEW.completed_at  (set when marking Completed)
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists to make migration idempotent
DROP TRIGGER IF EXISTS trg_prevent_technician_restricted_job_updates ON public.jobs;

CREATE TRIGGER trg_prevent_technician_restricted_job_updates
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_technician_restricted_job_updates();

COMMENT ON TRIGGER trg_prevent_technician_restricted_job_updates ON public.jobs IS
  'Restricts technicians to only updating status, work_notes, and completed_at. '
  'All other job fields are silently reverted to prevent unauthorized modifications.';


-- ============================================================================
-- DONE. Security triggers are in place.
-- These work together with RLS policies from 010_final_rls_policies.sql.
--
-- Summary:
-- 1. Users table: Non-admin cannot change role, is_active, created_at
-- 2. Jobs table: Technician can only change status, work_notes, completed_at
--
-- Testing:
-- 1. Log in as technician → try to update technician_id on assigned job
--    → should remain unchanged
-- 2. Log in as receptionist → update expo_push_token → should work
-- 3. Log in as receptionist → try to set role='admin'
--    → should remain 'receptionist'
-- 4. Log in as admin → change any field → should work normally
-- ============================================================================
