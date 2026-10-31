-- Migration: 20261101020000_fix_accrue_incentives_trigger.sql
-- 
-- ROOT CAUSE: accrue_incentives() was an AFTER trigger but tried to write to NEW.completion_id_verified_at.
-- AFTER triggers CANNOT modify NEW. This crashed every single job completion with "Update Failed".
--
-- FIX: Replace accrue_incentives() removing the illegal NEW modification.
-- The trigger now simply accrues commission when status = 'Completed', no PIN check required.

-- Step 1: Ensure columns exist (safe if already applied from 20261101010000)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS completion_id text,
  ADD COLUMN IF NOT EXISTS completion_id_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS items_received text,
  ADD COLUMN IF NOT EXISTS other_status_reason text;

-- Step 2: Replace the broken trigger function
CREATE OR REPLACE FUNCTION public.accrue_incentives()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_tech_count      int;
  v_total_incentive numeric := 0;
  v_split_amount    numeric := 0;
  v_remainder       numeric := 0;
  v_idx             int := 0;
  v_tech            RECORD;
BEGIN
  -- =========================================================
  -- JOBS: Accrue or retract commission on status change
  -- =========================================================
  IF TG_TABLE_NAME = 'jobs' THEN
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
            SELECT technician_id FROM public.job_technicians
            WHERE job_id = NEW.id AND removed_at IS NULL
            ORDER BY created_at ASC
          LOOP
            v_idx := v_idx + 1;
            INSERT INTO public.staff_incentives (user_id, source_type, job_id, amount, accrued_at)
            VALUES (
              v_tech.technician_id, 'job', NEW.id,
              CASE WHEN v_idx = 1 THEN v_split_amount + v_remainder ELSE v_split_amount END,
              COALESCE(NEW.completed_at, now())
            );
          END LOOP;

        ELSIF NEW.technician_id IS NOT NULL THEN
          INSERT INTO public.staff_incentives (user_id, source_type, job_id, amount, accrued_at)
          VALUES (NEW.technician_id, 'job', NEW.id, v_total_incentive, COALESCE(NEW.completed_at, now()));
        END IF;
      END IF;

    ELSIF NEW.status != 'Completed' THEN
      DELETE FROM public.staff_incentives WHERE job_id = NEW.id AND source_type = 'job';
    END IF;

  -- =========================================================
  -- SALES: Accrue commission on sale completion
  -- =========================================================
  ELSIF TG_TABLE_NAME = 'sales' THEN
    IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR COALESCE(OLD.status, '') != 'completed') THEN
      DELETE FROM public.staff_incentives WHERE sale_id = NEW.id AND source_type = 'sale';
      IF COALESCE(NEW.staff_incentive, 0) > 0 AND NEW.created_by IS NOT NULL THEN
        INSERT INTO public.staff_incentives (user_id, source_type, sale_id, amount, accrued_at)
        VALUES (NEW.created_by, 'sale', NEW.id, NEW.staff_incentive, now());
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Verify the triggers still exist (they should from baseline schema, no recreate needed)
-- trg_accrue_job_incentives  → AFTER INSERT OR UPDATE ON public.jobs
-- trg_accrue_sale_incentives → AFTER INSERT OR UPDATE ON public.sales

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
