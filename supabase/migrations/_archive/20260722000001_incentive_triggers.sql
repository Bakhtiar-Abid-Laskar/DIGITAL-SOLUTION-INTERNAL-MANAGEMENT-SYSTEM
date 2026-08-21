-- Migration: Server-side Incentive Accrual Triggers
-- Phase 6: Incentive Accrual Logic

-- 1. Function: Accrue Job Incentives on Job Completion
create or replace function public.accrue_job_incentives()
returns trigger as $$
begin
  -- Only trigger when job status transitions to 'Completed'
  if (NEW.status = 'Completed' and (TG_OP = 'INSERT' or OLD.status is null or OLD.status != 'Completed')) then
    -- Accrue Technician Incentive
    if (coalesce(NEW.snap_technician_incentive, 0) > 0 and NEW.technician_id is not null) then
      -- Delete any existing incentive for this job & role to prevent duplicates if status is toggled
      delete from public.staff_incentives 
      where job_id = NEW.id and role_type = 'technician';

      insert into public.staff_incentives (user_id, job_id, amount, role_type, description)
      values (
        NEW.technician_id,
        NEW.id,
        NEW.snap_technician_incentive,
        'technician',
        'Job Completion Incentive (' || NEW.job_code || ')'
      );
    end if;

    -- Accrue Receptionist Incentive
    if (coalesce(NEW.snap_receptionist_incentive, 0) > 0 and NEW.receptionist_id is not null) then
      delete from public.staff_incentives 
      where job_id = NEW.id and role_type = 'receptionist';

      insert into public.staff_incentives (user_id, job_id, amount, role_type, description)
      values (
        NEW.receptionist_id,
        NEW.id,
        NEW.snap_receptionist_incentive,
        'receptionist',
        'Job Intake Incentive (' || NEW.job_code || ')'
      );
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- 2. Trigger on jobs table
drop trigger if exists trg_accrue_job_incentives on public.jobs;
create trigger trg_accrue_job_incentives
after insert or update on public.jobs
for each row execute function public.accrue_job_incentives();

-- 3. Function: Accrue Sale Incentives on Sale Payment
create or replace function public.accrue_sale_incentives()
returns trigger as $$
begin
  -- Trigger when sale status is 'Paid'
  if (NEW.status = 'Paid' and (TG_OP = 'INSERT' or OLD.status is null or OLD.status != 'Paid')) then
    if (coalesce(NEW.snap_receptionist_incentive, 0) > 0 and NEW.created_by is not null) then
      delete from public.staff_incentives 
      where sale_id = NEW.id and role_type = 'receptionist';

      insert into public.staff_incentives (user_id, sale_id, amount, role_type, description)
      values (
        NEW.created_by,
        NEW.id,
        NEW.snap_receptionist_incentive,
        'receptionist',
        'Sale Incentive (' || NEW.sale_code || ')'
      );
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- 4. Trigger on sales table
drop trigger if exists trg_accrue_sale_incentives on public.sales;
create trigger trg_accrue_sale_incentives
after insert or update on public.sales
for each row execute function public.accrue_sale_incentives();
