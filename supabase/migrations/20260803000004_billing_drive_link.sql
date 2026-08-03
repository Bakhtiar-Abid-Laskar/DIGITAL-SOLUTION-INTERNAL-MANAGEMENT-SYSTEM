-- Migration: 20260803000004_billing_drive_link.sql
-- Description: Add Drive link columns to the billing table for invoices and receipts.

alter table public.billing
  add column if not exists drive_link      text,
  add column if not exists drive_file_id   text,
  add column if not exists doc_type        text check (doc_type in ('invoice', 'receipt')) default 'invoice';

comment on column public.billing.drive_link    is 'Google Drive webViewLink for the generated PDF (invoice or receipt)';
comment on column public.billing.drive_file_id is 'Google Drive file ID for the generated PDF';
comment on column public.billing.doc_type      is 'Whether this billing record is an invoice (final bill) or receipt (intake)';
