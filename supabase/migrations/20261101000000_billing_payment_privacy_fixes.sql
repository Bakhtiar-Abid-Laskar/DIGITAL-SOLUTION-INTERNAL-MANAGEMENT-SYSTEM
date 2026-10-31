-- ============================================================================
-- Migration: 20261101000000_billing_payment_privacy_fixes.sql
-- Description:
--   1. Staff-Safe Service Catalog View and RPC:
--      Hides `technician_incentive` from all staff network queries/payloads.
--      Staff only need `id`, `title`, `customer_charge_amount`, and `is_active`.
--   2. Ensures trigger `trg_sync_job_type_incentive` is active on `public.jobs`
--      so technician incentive is ALWAYS safely populated server-side from
--      `job_types.technician_incentive` without client involvement.
-- ============================================================================

-- ─── 1. Staff-Safe Job Types Catalog View ──────────────────────────────────
CREATE OR REPLACE VIEW public.job_types_staff_catalog AS
  SELECT
    id,
    title,
    customer_charge_amount,
    is_active,
    created_at
  FROM public.job_types
  WHERE is_active = true;

GRANT SELECT ON public.job_types_staff_catalog TO authenticated;

-- ─── 2. Staff-Safe Job Types Catalog RPC ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_staff_job_types()
RETURNS TABLE (
  id uuid,
  title text,
  customer_charge_amount numeric,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id, title, customer_charge_amount, is_active
  FROM public.job_types
  WHERE is_active = true
  ORDER BY title ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_job_types() TO authenticated;

-- ─── 3. Ensure Server-Side Incentive Trigger is Robust ─────────────────────
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

