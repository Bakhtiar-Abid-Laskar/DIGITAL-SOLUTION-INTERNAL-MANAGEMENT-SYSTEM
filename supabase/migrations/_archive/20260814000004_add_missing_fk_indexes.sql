-- ============================================================================
-- Migration: 20260814000004_add_missing_fk_indexes.sql
-- Description: Fix #10 — Add missing indexes on foreign key columns.
--
-- Root Cause: Foreign key columns without indexes cause sequential scans on the
--   referencing table when Postgres checks constraint integrity on INSERT/UPDATE/DELETE
--   in the parent table, and when JOIN queries traverse the FK relationship.
--
-- Note: CONCURRENTLY is NOT used here because the Supabase Dashboard SQL Editor
--   and supabase db push both run inside a transaction block, which forbids CONCURRENTLY.
--   The brief table lock from a non-concurrent index build is acceptable during migration.
--
-- Naming convention: idx_<table>_<column(s)>
-- ============================================================================


-- ============================================================================
-- public.attendance
-- ============================================================================
create index if not exists idx_attendance_user_id
  on public.attendance (user_id);

create index if not exists idx_attendance_approved_by
  on public.attendance (approved_by);


-- ============================================================================
-- public.billing (job_id is unique/FK — should already be indexed, but ensure it)
-- ============================================================================
create index if not exists idx_billing_job_id
  on public.billing (job_id);


-- ============================================================================
-- public.customer_reviews
-- ============================================================================
create index if not exists idx_customer_reviews_user_id
  on public.customer_reviews (user_id);

create index if not exists idx_customer_reviews_job_id
  on public.customer_reviews (job_id);


-- ============================================================================
-- public.employee_bonus
-- ============================================================================
create index if not exists idx_employee_bonus_user_id
  on public.employee_bonus (user_id);

create index if not exists idx_employee_bonus_created_by
  on public.employee_bonus (created_by);


-- ============================================================================
-- public.employee_leave
-- ============================================================================
create index if not exists idx_employee_leave_user_id
  on public.employee_leave (user_id);

create index if not exists idx_employee_leave_approved_by
  on public.employee_leave (approved_by);


-- ============================================================================
-- public.geofence_settings
-- ============================================================================
create index if not exists idx_geofence_settings_updated_by
  on public.geofence_settings (updated_by);


-- ============================================================================
-- public.job_materials
-- ============================================================================
create index if not exists idx_job_materials_job_id
  on public.job_materials (job_id);

create index if not exists idx_job_materials_technician_id
  on public.job_materials (technician_id);

create index if not exists idx_job_materials_inventory_id
  on public.job_materials (inventory_id);


-- ============================================================================
-- public.job_technicians
-- ============================================================================
create index if not exists idx_job_technicians_technician_id
  on public.job_technicians (technician_id);

-- job_id is part of the unique constraint (job_id, technician_id), already indexed by PK/UK.


-- ============================================================================
-- public.jobs (receptionist_id is indexed; add any missing ones)
-- ============================================================================
create index if not exists idx_jobs_job_type_ref_id
  on public.jobs (job_type_ref_id);


-- ============================================================================
-- public.material_allotments (if the table exists)
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'material_allotments') then
    execute $i$
      create index if not exists idx_material_allotments_technician_id
        on public.material_allotments (technician_id)
    $i$;
    execute $i$
      create index if not exists idx_material_allotments_product_id
        on public.material_allotments (product_id)
    $i$;
    execute $i$
      create index if not exists idx_material_allotments_source_job_material_id
        on public.material_allotments (source_job_material_id)
    $i$;
  end if;
end $$;


-- ============================================================================
-- public.notifications
-- ============================================================================
create index if not exists idx_notifications_job_id
  on public.notifications (job_id);

-- recipient_user_id already indexed as idx_notifications_recipient in master schema.


-- ============================================================================
-- public.onsite_visits
-- ============================================================================
create index if not exists idx_onsite_visits_job_id
  on public.onsite_visits (job_id);

create index if not exists idx_onsite_visits_technician_id
  on public.onsite_visits (technician_id);


-- ============================================================================
-- public.payments
-- ============================================================================
create index if not exists idx_payments_created_by
  on public.payments (created_by);

-- user_id already indexed as idx_payments_user_id.


-- ============================================================================
-- public.payroll_audit_log
-- ============================================================================
create index if not exists idx_payroll_audit_log_user_id
  on public.payroll_audit_log (user_id);

create index if not exists idx_payroll_audit_log_performed_by
  on public.payroll_audit_log (performed_by);


-- ============================================================================
-- public.salary (user_id+month indexed; add generated_by)
-- ============================================================================
create index if not exists idx_salary_generated_by
  on public.salary (generated_by);


-- ============================================================================
-- public.sale_items
-- ============================================================================
create index if not exists idx_sale_items_sale_id
  on public.sale_items (sale_id);

create index if not exists idx_sale_items_inventory_id
  on public.sale_items (inventory_id);


-- ============================================================================
-- public.sales
-- ============================================================================
create index if not exists idx_sales_created_by
  on public.sales (created_by);

create index if not exists idx_sales_sale_type_id
  on public.sales (sale_type_id);


-- ============================================================================
-- public.staff_incentives
-- ============================================================================
create index if not exists idx_staff_incentives_user_id
  on public.staff_incentives (user_id);

create index if not exists idx_staff_incentives_job_id
  on public.staff_incentives (job_id);

create index if not exists idx_staff_incentives_sale_id
  on public.staff_incentives (sale_id);


-- ============================================================================
-- public.users (no FK columns needing indexes — id is PK)
-- ============================================================================
-- users.id is the PK; no additional FK index needed.


-- ============================================================================
-- WhatsApp tables (conditionally — check each column exists before indexing)
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'whatsapp_logs') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'whatsapp_logs' and column_name = 'job_id') then
      execute $i$create index if not exists idx_whatsapp_logs_job_id on public.whatsapp_logs (job_id)$i$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'whatsapp_logs' and column_name = 'user_id') then
      execute $i$create index if not exists idx_whatsapp_logs_user_id on public.whatsapp_logs (user_id)$i$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'whatsapp_logs' and column_name = 'message_id') then
      execute $i$create index if not exists idx_whatsapp_logs_message_id on public.whatsapp_logs (message_id)$i$;
    end if;
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'whatsapp_messages') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'whatsapp_messages' and column_name = 'job_id') then
      execute $i$create index if not exists idx_whatsapp_messages_job_id on public.whatsapp_messages (job_id)$i$;
    end if;
  end if;
end $$;


-- ============================================================================
-- public.inventory_audit_log (conditionally — check each column exists)
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'inventory_audit_log') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inventory_audit_log' and column_name = 'product_id') then
      execute $i$create index if not exists idx_inventory_audit_log_product_id on public.inventory_audit_log (product_id)$i$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inventory_audit_log' and column_name = 'performed_by') then
      execute $i$create index if not exists idx_inventory_audit_log_performed_by on public.inventory_audit_log (performed_by)$i$;
    end if;
  end if;
end $$;
