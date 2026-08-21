-- Add customer_gstin to jobs and sales tables
alter table public.jobs add column if not exists customer_gstin text;
alter table public.sales add column if not exists customer_gstin text;
