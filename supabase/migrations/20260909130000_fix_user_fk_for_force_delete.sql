-- Migration: 20260909130000_fix_user_fk_for_force_delete.sql
-- Description: Alter all FK references to public.users(id) that would block hard deletion
--              to ON DELETE SET NULL. Also drops NOT NULL constraints where required.
--              This allows force-deleting a staff member while preserving all audit records.

-- ─── jobs ────────────────────────────────────────────────────────────────────
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_technician_id_fkey,
  DROP CONSTRAINT IF EXISTS jobs_receptionist_id_fkey;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_technician_id_fkey
    FOREIGN KEY (technician_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT jobs_receptionist_id_fkey
    FOREIGN KEY (receptionist_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── attendance ───────────────────────────────────────────────────────────────
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_approved_by_fkey;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── onsite_visits ────────────────────────────────────────────────────────────
ALTER TABLE public.onsite_visits
  DROP CONSTRAINT IF EXISTS onsite_visits_technician_id_fkey;

ALTER TABLE public.onsite_visits
  ADD CONSTRAINT onsite_visits_technician_id_fkey
    FOREIGN KEY (technician_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── products ─────────────────────────────────────────────────────────────────
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_created_by_fkey;

ALTER TABLE public.products
  ADD CONSTRAINT products_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── inventory_transactions ───────────────────────────────────────────────────
ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_created_by_fkey;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── inventory_audit_log ──────────────────────────────────────────────────────
ALTER TABLE public.inventory_audit_log
  DROP CONSTRAINT IF EXISTS inventory_audit_log_changed_by_fkey;

ALTER TABLE public.inventory_audit_log
  ADD CONSTRAINT inventory_audit_log_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── invoices ─────────────────────────────────────────────────────────────────
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── sales ────────────────────────────────────────────────────────────────────
ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_created_by_fkey;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── job_materials ────────────────────────────────────────────────────────────
ALTER TABLE public.job_materials
  DROP CONSTRAINT IF EXISTS job_materials_technician_id_fkey;

ALTER TABLE public.job_materials
  ADD CONSTRAINT job_materials_technician_id_fkey
    FOREIGN KEY (technician_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── material_allotments ──────────────────────────────────────────────────────
ALTER TABLE public.material_allotments
  DROP CONSTRAINT IF EXISTS material_allotments_allotted_by_fkey;

ALTER TABLE public.material_allotments
  ADD CONSTRAINT material_allotments_allotted_by_fkey
    FOREIGN KEY (allotted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── payments ─────────────────────────────────────────────────────────────────
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_user_id_fkey,
  DROP CONSTRAINT IF EXISTS payments_created_by_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT payments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── payroll_audit_log ────────────────────────────────────────────────────────
ALTER TABLE public.payroll_audit_log
  DROP CONSTRAINT IF EXISTS payroll_audit_log_user_id_fkey,
  DROP CONSTRAINT IF EXISTS payroll_audit_log_changed_by_fkey;

ALTER TABLE public.payroll_audit_log
  ADD CONSTRAINT payroll_audit_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT payroll_audit_log_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── employee_bonus ───────────────────────────────────────────────────────────
-- user_id is NOT NULL here — drop constraint + NOT NULL, then re-add as nullable SET NULL
ALTER TABLE public.employee_bonus
  DROP CONSTRAINT IF EXISTS employee_bonus_user_id_fkey,
  DROP CONSTRAINT IF EXISTS employee_bonus_created_by_fkey;

ALTER TABLE public.employee_bonus
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.employee_bonus
  ADD CONSTRAINT employee_bonus_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT employee_bonus_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── employee_leave ───────────────────────────────────────────────────────────
ALTER TABLE public.employee_leave
  DROP CONSTRAINT IF EXISTS employee_leave_approved_by_fkey;

ALTER TABLE public.employee_leave
  ADD CONSTRAINT employee_leave_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── invoice_payments (ledger) — recorded_by NOT NULL RESTRICT → nullable SET NULL ──
ALTER TABLE public.invoice_payments
  DROP CONSTRAINT IF EXISTS invoice_payments_recorded_by_fkey;

ALTER TABLE public.invoice_payments
  ALTER COLUMN recorded_by DROP NOT NULL;

ALTER TABLE public.invoice_payments
  ADD CONSTRAINT invoice_payments_recorded_by_fkey
    FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── customer_wallet_transactions — recorded_by NOT NULL RESTRICT → nullable SET NULL ─
ALTER TABLE public.customer_wallet_transactions
  DROP CONSTRAINT IF EXISTS customer_wallet_transactions_recorded_by_fkey;

ALTER TABLE public.customer_wallet_transactions
  ALTER COLUMN recorded_by DROP NOT NULL;

ALTER TABLE public.customer_wallet_transactions
  ADD CONSTRAINT customer_wallet_transactions_recorded_by_fkey
    FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── credit_notes — recorded_by NOT NULL RESTRICT → nullable SET NULL ────────
ALTER TABLE public.credit_notes
  DROP CONSTRAINT IF EXISTS credit_notes_recorded_by_fkey;

ALTER TABLE public.credit_notes
  ALTER COLUMN recorded_by DROP NOT NULL;

ALTER TABLE public.credit_notes
  ADD CONSTRAINT credit_notes_recorded_by_fkey
    FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;
