-- Migration: 20260816000000_allotted_materials_and_payments.sql
-- Description: Add status and returned_at to job_materials, and amount_paid to sales and billing.

-- 1. job_materials updates
alter table public.job_materials
  add column if not exists status text check (status in ('allotted', 'returned')) default 'allotted',
  add column if not exists returned_at timestamptz;

-- 2. sales updates
alter table public.sales
  add column if not exists amount_paid numeric default 0 check (amount_paid >= 0);

-- Backfill amount_paid for Paid sales
update public.sales
set amount_paid = grand_total
where status = 'Paid' and amount_paid = 0;

-- 3. billing updates
alter table public.billing
  add column if not exists amount_paid numeric default 0 check (amount_paid >= 0);

-- Backfill amount_paid for Paid billing records
update public.billing
set amount_paid = grand_total
where payment_status = 'Paid' and amount_paid = 0;

-- 4. jobs updates
alter table public.jobs
  add column if not exists advance_amount numeric default 0 check (advance_amount >= 0);

-- 5. Reload schema cache
notify pgrst, 'reload schema';
