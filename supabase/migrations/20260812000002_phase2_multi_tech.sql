-- Migration: Phase 2 Multi-Technician Job Assignment
-- Description: Create job_technicians table, migrate data, and update incentive triggers.

create table if not exists public.job_technicians (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  technician_id uuid not null references public.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  unique(job_id, technician_id)
);

alter table public.job_technicians enable row level security;

-- Policies for job_technicians
drop policy if exists "Admins and Receptionists full access to job_technicians" on public.job_technicians;
create policy "Admins and Receptionists full access to job_technicians"
  on public.job_technicians for all
  using (public.is_admin() or public.is_receptionist())
  with check (public.is_admin() or public.is_receptionist());

drop policy if exists "Technicians can view their assignments" on public.job_technicians;
create policy "Technicians can view their assignments"
  on public.job_technicians for select
  using (technician_id = auth.uid());

-- Migrate existing assignments
insert into public.job_technicians (job_id, technician_id)
select id, technician_id from public.jobs where technician_id is not null;

-- Now update the incentive function
create or replace function public.accrue_job_incentives()
returns trigger as $$
declare
  v_tech_count int;
  v_split_amount numeric;
  v_tech record;
begin
  if new.status = 'Completed' and old.status != 'Completed' then
    if new.snap_technician_incentive > 0 then
      select count(*) into v_tech_count from public.job_technicians where job_id = new.id and removed_at is null;
      if v_tech_count > 0 then
        v_split_amount := new.snap_technician_incentive / v_tech_count;
        for v_tech in select technician_id from public.job_technicians where job_id = new.id and removed_at is null loop
          insert into public.staff_incentives (
            user_id,
            source_type,
            job_id,
            amount,
            accrued_at
          ) values (
            v_tech.technician_id,
            'job',
            new.id,
            v_split_amount,
            now()
          );
        end loop;
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;


-- Sync legacy technician_id to job_technicians automatically
create or replace function public.sync_initial_technician()
returns trigger as $$
begin
  if new.technician_id is not null and (tg_op = 'INSERT' or old.technician_id is distinct from new.technician_id) then
    if not exists (select 1 from public.job_technicians where job_id = new.id and technician_id = new.technician_id and removed_at is null) then
      insert into public.job_technicians (job_id, technician_id) values (new.id, new.technician_id) on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger sync_initial_technician_trigger
after insert or update of technician_id on public.jobs
for each row execute function public.sync_initial_technician();



