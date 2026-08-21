-- Migration: 20260801000001_add_missing_billing_columns.sql
-- Adds discount, tax_percent, and other columns that the master schema defines
-- but may not have been applied to the live billing table.

alter table public.billing
  add column if not exists discount numeric default 0,
  add column if not exists tax_percent numeric default 0,
  add column if not exists notes text,
  add column if not exists payment_method text default 'Cash',
  add column if not exists payment_status text check (payment_status in ('Unpaid', 'Paid', 'Partial')) default 'Unpaid';

-- Back-fill grand_total for any existing rows that have null
update public.billing
set grand_total = coalesce(parts_total, 0) + coalesce(labour_charge, 0)
where grand_total is null;
