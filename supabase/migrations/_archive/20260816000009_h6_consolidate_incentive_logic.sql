-- H6. Consolidate duplicated incentive logic
-- Combines `accrue_job_incentives` and `accrue_sale_incentives` into a single 
-- function `accrue_incentives` using TG_TABLE_NAME to prevent logic drift.

CREATE OR REPLACE FUNCTION public.accrue_incentives()
RETURNS trigger AS $$
DECLARE
  v_tech_count int;
  v_split_amount numeric;
  v_tech record;
BEGIN
  IF TG_TABLE_NAME = 'jobs' THEN
    -- Job Incentive Logic
    IF NEW.status = 'Completed' AND (TG_OP = 'INSERT' OR coalesce(OLD.status, '') != 'Completed') THEN
      
      -- Ensure idempotency by clearing existing incentives if re-triggered
      DELETE FROM public.staff_incentives WHERE job_id = NEW.id AND source_type = 'job';
      
      IF coalesce(NEW.snap_technician_incentive, 0) > 0 THEN
        SELECT count(*) INTO v_tech_count FROM public.job_technicians WHERE job_id = NEW.id AND removed_at IS NULL;
        IF v_tech_count > 0 THEN
          v_split_amount := NEW.snap_technician_incentive / v_tech_count;
          FOR v_tech IN SELECT technician_id FROM public.job_technicians WHERE job_id = NEW.id AND removed_at IS NULL LOOP
            INSERT INTO public.staff_incentives (
              user_id,
              source_type,
              job_id,
              amount,
              accrued_at
            ) VALUES (
              v_tech.technician_id,
              'job',
              NEW.id,
              v_split_amount,
              now()
            );
          END LOOP;
        END IF;
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'sales' THEN
    -- Sale Incentive Logic
    IF coalesce(NEW.status, 'Paid') = 'Paid' AND (TG_OP = 'INSERT' OR coalesce(OLD.status, '') != 'Paid') THEN
      IF coalesce(NEW.snap_receptionist_incentive, 0) > 0 AND NEW.created_by IS NOT NULL THEN
        
        -- Idempotency check
        DELETE FROM public.staff_incentives WHERE sale_id = NEW.id AND role_type = 'receptionist';

        INSERT INTO public.staff_incentives (
          user_id, 
          sale_id, 
          amount, 
          role_type, 
          description
        ) VALUES (
          NEW.created_by,
          NEW.id,
          NEW.snap_receptionist_incentive,
          'receptionist',
          'Sale Incentive (' || coalesce(NEW.sale_code, NEW.invoice_number, 'SALE') || ')'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind jobs trigger
DROP TRIGGER IF EXISTS trg_accrue_job_incentives ON public.jobs;
CREATE TRIGGER trg_accrue_job_incentives
AFTER INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.accrue_incentives();

-- Rebind sales trigger
DROP TRIGGER IF EXISTS trg_accrue_sale_incentives ON public.sales;
CREATE TRIGGER trg_accrue_sale_incentives
AFTER INSERT OR UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.accrue_incentives();

-- Drop the old duplicated functions
DROP FUNCTION IF EXISTS public.accrue_job_incentives() CASCADE;
DROP FUNCTION IF EXISTS public.accrue_sale_incentives() CASCADE;
