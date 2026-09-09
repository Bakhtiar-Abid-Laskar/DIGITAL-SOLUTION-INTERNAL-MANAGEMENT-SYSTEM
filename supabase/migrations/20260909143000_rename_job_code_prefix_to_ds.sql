-- Migration: 20260909143000_rename_job_code_prefix_to_ds.sql
-- Description: Updates job code format to DS-YYYY-XXXX (where count starts from 1) and resets job_code_seq.

-- 1. Reset sequence to 1
create sequence if not exists public.job_code_seq start with 1 increment by 1;
alter sequence public.job_code_seq restart with 1;

-- 2. Update existing jobs if any with RS- prefix to DS- prefix
update public.jobs
set job_code = regexp_replace(job_code, '^RS-', 'DS-')
where job_code like 'RS-%';

-- 3. Replace generate_job_code() function to generate DS-YYYY-XXXX format
create or replace function public.generate_job_code()
returns text
language plpgsql volatile security definer
set search_path = public
as $$
declare
  next_val bigint;
  yr text := to_char(now(), 'YYYY');
begin
  next_val := nextval('public.job_code_seq');
  return 'DS-' || yr || '-' || lpad(next_val::text, 4, '0');
end;
$$;

-- 4. Ensure execute grants
grant execute on function public.generate_job_code() to authenticated;
grant execute on function public.generate_job_code() to service_role;
