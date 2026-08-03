-- Migration: Remove Receptionist Incentive columns and triggers

alter table public.job_types drop column if exists receptionist_incentive;
alter table public.sale_types drop column if exists receptionist_incentive;
alter table public.jobs drop column if exists snap_receptionist_incentive;
alter table public.sales drop column if exists snap_receptionist_incentive;

-- Update accrue_job_incentives function to remove receptionist incentive accrual
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
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Update accrue_sale_incentives function to remove receptionist incentive accrual
create or replace function public.accrue_sale_incentives()
returns trigger as $$
begin
  -- Sales no longer accrue receptionist incentives
  return NEW;
end;
$$ language plpgsql security definer;
