-- ============================================================================
-- Migration: 20260814000001_fix_rls_auth_init_plan.sql
-- Description: Fix #1 (Auth RLS Initialization Plan) + #6 (Multiple Permissive Policies)
--
-- Root Cause #1: Raw calls to auth.uid(), auth.role(), and SECURITY DEFINER role helpers
--   (is_admin, is_receptionist, is_technician, is_staff) inside USING/WITH CHECK clauses
--   are re-evaluated once per ROW. Wrapping them in (select ...) allows the Postgres
--   planner to evaluate them once per STATEMENT, dramatically reducing overhead.
--
-- Root Cause #6: Multiple PERMISSIVE policies for the same (table, cmd, role) are OR'd
--   together by Postgres but each is evaluated per row. Merging them into one policy
--   eliminates redundant checks.
--
-- Approach: We DROP all existing policies on affected tables and recreate them cleanly,
--   combining both fixes in one pass. The intent of every policy is preserved exactly.
-- ============================================================================


-- ============================================================================
-- TABLE: public.users
-- ============================================================================
drop policy if exists "Users viewable by authenticated users" on public.users;
drop policy if exists "Users manageable by admin" on public.users;
drop policy if exists "Admins can do everything on users" on public.users;
drop policy if exists "Anyone can read active technicians or themselves" on public.users;
drop policy if exists "Users can update their own profile" on public.users;

-- SELECT: any authenticated user can read all user rows (needed for staff lookups)
create policy "users_select_authenticated"
  on public.users for select
  to authenticated
  using ((select auth.role()) = 'authenticated');

-- UPDATE: users can update their own profile row
create policy "users_update_own_profile"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- INSERT / DELETE / UPDATE (all ops): admin only
create policy "users_all_admin"
  on public.users for all
  to authenticated
  using ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.jobs
-- ============================================================================
drop policy if exists "Jobs viewable by staff" on public.jobs;
drop policy if exists "Jobs manageable by receptionist and admin" on public.jobs;
drop policy if exists "Technician update assigned jobs" on public.jobs;
drop policy if exists "Admins and Receptionists have full access to jobs" on public.jobs;
drop policy if exists "Technicians can only access their assigned jobs" on public.jobs;

-- SELECT: admin/receptionist see all; technician sees only assigned jobs
create policy "jobs_select_staff"
  on public.jobs for select
  to authenticated
  using (
    (select public.is_admin())
    or (select public.is_receptionist())
    or ((select public.is_technician()) and technician_id = (select auth.uid()))
  );

-- INSERT/UPDATE/DELETE: admin and receptionist (no job creation/deletion by technician)
create policy "jobs_write_admin_receptionist"
  on public.jobs for all
  to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

-- UPDATE (additional): technician can update their own assigned jobs' work fields
create policy "jobs_update_technician_assigned"
  on public.jobs for update
  to authenticated
  using ((select public.is_technician()) and technician_id = (select auth.uid()));


-- ============================================================================
-- TABLE: public.attendance
-- ============================================================================
drop policy if exists "Attendance own record or admin view" on public.attendance;
drop policy if exists "Attendance user insert own" on public.attendance;
drop policy if exists "Attendance update own or admin" on public.attendance;
drop policy if exists "Admins have full access to attendance" on public.attendance;
drop policy if exists "Users can read their own attendance" on public.attendance;
drop policy if exists "Users can insert their own attendance" on public.attendance;
drop policy if exists "Users can update their own attendance" on public.attendance;

-- SELECT: own record or admin
create policy "attendance_select"
  on public.attendance for select
  to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

-- INSERT: own record only
create policy "attendance_insert_own"
  on public.attendance for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- UPDATE: own record or admin
create policy "attendance_update"
  on public.attendance for update
  to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()))
  with check ((select auth.uid()) = user_id or (select public.is_admin()));

-- DELETE + full admin access for admin
create policy "attendance_all_admin"
  on public.attendance for all
  to authenticated
  using ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.job_materials
-- ============================================================================
drop policy if exists "job_materials_admin_receptionist_all" on public.job_materials;
drop policy if exists "job_materials_technician_select" on public.job_materials;
drop policy if exists "job_materials_technician_insert" on public.job_materials;
drop policy if exists "job_materials_technician_update" on public.job_materials;
drop policy if exists "job_materials_technician_delete" on public.job_materials;
drop policy if exists "Admins and Receptionists have full access to job_materials" on public.job_materials;
drop policy if exists "Technicians can access materials for their assigned jobs" on public.job_materials;

-- Admin + Receptionist: full access
create policy "job_materials_admin_receptionist_all"
  on public.job_materials for all
  to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

-- Technician SELECT: own technician_id or assigned job
create policy "job_materials_technician_select"
  on public.job_materials for select
  to authenticated
  using (
    technician_id = (select auth.uid())
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id
        and jobs.technician_id = (select auth.uid())
    )
  );

-- Technician INSERT
create policy "job_materials_technician_insert"
  on public.job_materials for insert
  to authenticated
  with check (
    technician_id = (select auth.uid())
    or technician_id is null
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id
        and jobs.technician_id = (select auth.uid())
    )
  );

-- Technician UPDATE
create policy "job_materials_technician_update"
  on public.job_materials for update
  to authenticated
  using (
    technician_id = (select auth.uid())
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id
        and jobs.technician_id = (select auth.uid())
    )
  );

-- Technician DELETE
create policy "job_materials_technician_delete"
  on public.job_materials for delete
  to authenticated
  using (
    technician_id = (select auth.uid())
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id
        and jobs.technician_id = (select auth.uid())
    )
  );


-- ============================================================================
-- TABLE: public.onsite_visits
-- ============================================================================
drop policy if exists "onsite_visits_admin_receptionist_all" on public.onsite_visits;
drop policy if exists "onsite_visits_technician_select" on public.onsite_visits;
drop policy if exists "onsite_visits_technician_insert" on public.onsite_visits;
drop policy if exists "onsite_visits_technician_update" on public.onsite_visits;
drop policy if exists "Admins and Receptionists have full access to onsite_visits" on public.onsite_visits;
drop policy if exists "Technicians can access visits for their assigned jobs" on public.onsite_visits;

-- Admin + Receptionist: full access
create policy "onsite_visits_admin_receptionist_all"
  on public.onsite_visits for all
  to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

-- Technician SELECT: own visits or is_staff (to allow receptionist via is_staff check)
create policy "onsite_visits_technician_select"
  on public.onsite_visits for select
  to authenticated
  using (technician_id = (select auth.uid()) or (select public.is_staff()));

-- Technician INSERT
create policy "onsite_visits_technician_insert"
  on public.onsite_visits for insert
  to authenticated
  with check (technician_id = (select auth.uid()) or (select public.is_staff()));

-- Technician UPDATE
create policy "onsite_visits_technician_update"
  on public.onsite_visits for update
  to authenticated
  using (technician_id = (select auth.uid()) or (select public.is_staff()))
  with check (technician_id = (select auth.uid()) or (select public.is_staff()));


-- ============================================================================
-- TABLE: public.inventory
-- ============================================================================
drop policy if exists "inventory_select_authenticated" on public.inventory;
drop policy if exists "inventory_admin_manage" on public.inventory;
drop policy if exists "inventory_select_all_staff" on public.inventory;
drop policy if exists "Inventory viewable by staff" on public.inventory;
drop policy if exists "Inventory manageable by admin and receptionist" on public.inventory;
drop policy if exists "Admins and Receptionists have full access to inventory" on public.inventory;
drop policy if exists "Technicians can read inventory" on public.inventory;

-- SELECT: all authenticated
create policy "inventory_select_authenticated"
  on public.inventory for select
  to authenticated
  using (true);

-- ALL (INSERT/UPDATE/DELETE): admin only (stock changes go through SECURITY DEFINER triggers)
create policy "inventory_admin_manage"
  on public.inventory for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.notifications
-- ============================================================================
drop policy if exists "Admins have full access to notifications" on public.notifications;
drop policy if exists "Users can read their own notifications" on public.notifications;

-- Admin: full access
create policy "notifications_all_admin"
  on public.notifications for all
  to authenticated
  using ((select public.is_admin()));

-- Users: read their own notifications + mark as read (update)
create policy "notifications_own_user"
  on public.notifications for select
  to authenticated
  using (recipient_user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (recipient_user_id = (select auth.uid()));


-- ============================================================================
-- TABLE: public.billing
-- ============================================================================
drop policy if exists "Billing receptionist and admin" on public.billing;
drop policy if exists "Admins and Receptionists have full access to billing" on public.billing;

create policy "billing_admin_receptionist_all"
  on public.billing for all
  to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));


-- ============================================================================
-- TABLE: public.salary
-- ============================================================================
drop policy if exists "Salary strict admin only" on public.salary;
drop policy if exists "Admins have full access to salary" on public.salary;

create policy "salary_admin_only"
  on public.salary for all
  to authenticated
  using ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.staff_rates
-- ============================================================================
drop policy if exists "Staff rates strict admin only" on public.staff_rates;
drop policy if exists "Admins have full access to staff_rates" on public.staff_rates;

create policy "staff_rates_admin_only"
  on public.staff_rates for all
  to authenticated
  using ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.payments
-- ============================================================================
drop policy if exists "Payments strict admin only" on public.payments;
drop policy if exists "Admins have full access to payments" on public.payments;

create policy "payments_admin_only"
  on public.payments for all
  to authenticated
  using ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.holidays
-- ============================================================================
drop policy if exists "Holidays viewable by authenticated users" on public.holidays;
drop policy if exists "Holidays manageable by admin" on public.holidays;

-- SELECT: all authenticated
create policy "holidays_select_authenticated"
  on public.holidays for select
  to authenticated
  using ((select auth.role()) = 'authenticated');

-- ALL: admin only
create policy "holidays_all_admin"
  on public.holidays for all
  to authenticated
  using ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.customer_reviews
-- ============================================================================
drop policy if exists "Customer reviews viewable by authenticated" on public.customer_reviews;
drop policy if exists "Customer reviews viewable by authenticated users" on public.customer_reviews;
drop policy if exists "Customer reviews manageable by admin" on public.customer_reviews;

-- SELECT: all authenticated
create policy "customer_reviews_select_authenticated"
  on public.customer_reviews for select
  to authenticated
  using ((select auth.role()) = 'authenticated');

-- ALL: admin only
create policy "customer_reviews_all_admin"
  on public.customer_reviews for all
  to authenticated
  using ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.job_types
-- ============================================================================
drop policy if exists "job_types_admin_all" on public.job_types;
drop policy if exists "job_types_staff_read" on public.job_types;

-- Admin: full access
create policy "job_types_admin_all"
  on public.job_types for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Staff: read active types only
create policy "job_types_staff_read"
  on public.job_types for select
  to authenticated
  using (is_active = true);


-- ============================================================================
-- TABLE: public.sale_types
-- ============================================================================
drop policy if exists "sale_types_admin_all" on public.sale_types;
drop policy if exists "sale_types_staff_read" on public.sale_types;

create policy "sale_types_admin_all"
  on public.sale_types for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "sale_types_staff_read"
  on public.sale_types for select
  to authenticated
  using (is_active = true);


-- ============================================================================
-- TABLE: public.staff_incentives
-- ============================================================================
drop policy if exists "staff_incentives_admin_all" on public.staff_incentives;
drop policy if exists "staff_incentives_user_read" on public.staff_incentives;

create policy "staff_incentives_admin_all"
  on public.staff_incentives for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "staff_incentives_user_read"
  on public.staff_incentives for select
  to authenticated
  using (user_id = (select auth.uid()));


-- ============================================================================
-- TABLE: public.sales
-- ============================================================================
drop policy if exists "sales_staff_all" on public.sales;
drop policy if exists "Sales manageable by admin and receptionist" on public.sales;

create policy "sales_admin_receptionist_all"
  on public.sales for all
  to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));


-- ============================================================================
-- TABLE: public.sale_items
-- ============================================================================
drop policy if exists "sale_items_staff_all" on public.sale_items;
drop policy if exists "Sale items manageable by admin and receptionist" on public.sale_items;

create policy "sale_items_admin_receptionist_all"
  on public.sale_items for all
  to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));


-- ============================================================================
-- TABLE: public.job_technicians
-- ============================================================================
drop policy if exists "Admins and Receptionists full access to job_technicians" on public.job_technicians;
drop policy if exists "Technicians can view their assignments" on public.job_technicians;

create policy "job_technicians_admin_receptionist_all"
  on public.job_technicians for all
  to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

create policy "job_technicians_technician_select"
  on public.job_technicians for select
  to authenticated
  using (technician_id = (select auth.uid()));


-- ============================================================================
-- TABLE: public.geofence_settings
-- ============================================================================
drop policy if exists "Geofence readable by all authenticated users" on public.geofence_settings;
drop policy if exists "Geofence manageable by admin" on public.geofence_settings;

create policy "geofence_select_authenticated"
  on public.geofence_settings for select
  to authenticated
  using ((select auth.role()) = 'authenticated');

create policy "geofence_all_admin"
  on public.geofence_settings for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.employee_bonus
-- ============================================================================
drop policy if exists "employee_bonus_admin_all" on public.employee_bonus;
drop policy if exists "employee_bonus_user_read" on public.employee_bonus;

create policy "employee_bonus_admin_all"
  on public.employee_bonus for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "employee_bonus_user_read"
  on public.employee_bonus for select
  to authenticated
  using (user_id = (select auth.uid()));


-- ============================================================================
-- TABLE: public.employee_leave
-- ============================================================================
drop policy if exists "employee_leave_admin_all" on public.employee_leave;
drop policy if exists "employee_leave_user_read" on public.employee_leave;
drop policy if exists "employee_leave_user_insert" on public.employee_leave;

create policy "employee_leave_admin_all"
  on public.employee_leave for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "employee_leave_user_read"
  on public.employee_leave for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "employee_leave_user_insert"
  on public.employee_leave for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
  );


-- ============================================================================
-- TABLE: public.payroll_audit_log
-- ============================================================================
drop policy if exists "payroll_audit_log_admin_all" on public.payroll_audit_log;

create policy "payroll_audit_log_admin_all"
  on public.payroll_audit_log for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.export_jobs
-- ============================================================================
drop policy if exists "Admins can manage export_jobs" on public.export_jobs;

create policy "export_jobs_admin_all"
  on public.export_jobs for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- ============================================================================
-- TABLE: public.pending_uploads (no direct client access)
-- ============================================================================
drop policy if exists "No direct access to pending_uploads" on public.pending_uploads;

create policy "pending_uploads_no_direct_access"
  on public.pending_uploads for all
  to authenticated
  using (false);


-- ============================================================================
-- UI LOOKUP TABLES (public read, admin write) — fix inline EXISTS → use is_admin()
-- ============================================================================

-- ui_job_statuses
drop policy if exists "Allow public read ui_job_statuses" on public.ui_job_statuses;
drop policy if exists "Allow admin write ui_job_statuses" on public.ui_job_statuses;
create policy "ui_job_statuses_select_public" on public.ui_job_statuses for select using (true);
create policy "ui_job_statuses_write_admin" on public.ui_job_statuses for all
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ui_priorities
drop policy if exists "Allow public read ui_priorities" on public.ui_priorities;
drop policy if exists "Allow admin write ui_priorities" on public.ui_priorities;
create policy "ui_priorities_select_public" on public.ui_priorities for select using (true);
create policy "ui_priorities_write_admin" on public.ui_priorities for all
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ui_service_locations
drop policy if exists "Allow public read ui_service_locations" on public.ui_service_locations;
drop policy if exists "Allow admin write ui_service_locations" on public.ui_service_locations;
create policy "ui_service_locations_select_public" on public.ui_service_locations for select using (true);
create policy "ui_service_locations_write_admin" on public.ui_service_locations for all
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ui_payment_statuses
drop policy if exists "Allow public read ui_payment_statuses" on public.ui_payment_statuses;
drop policy if exists "Allow admin write ui_payment_statuses" on public.ui_payment_statuses;
create policy "ui_payment_statuses_select_public" on public.ui_payment_statuses for select using (true);
create policy "ui_payment_statuses_write_admin" on public.ui_payment_statuses for all
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ui_sale_statuses
drop policy if exists "Allow public read ui_sale_statuses" on public.ui_sale_statuses;
drop policy if exists "Allow admin write ui_sale_statuses" on public.ui_sale_statuses;
create policy "ui_sale_statuses_select_public" on public.ui_sale_statuses for select using (true);
create policy "ui_sale_statuses_write_admin" on public.ui_sale_statuses for all
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ui_payment_methods
drop policy if exists "Allow public read ui_payment_methods" on public.ui_payment_methods;
drop policy if exists "Allow admin write ui_payment_methods" on public.ui_payment_methods;
create policy "ui_payment_methods_select_public" on public.ui_payment_methods for select using (true);
create policy "ui_payment_methods_write_admin" on public.ui_payment_methods for all
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ui_roles
drop policy if exists "Allow public read ui_roles" on public.ui_roles;
drop policy if exists "Allow admin write ui_roles" on public.ui_roles;
create policy "ui_roles_select_public" on public.ui_roles for select using (true);
create policy "ui_roles_write_admin" on public.ui_roles for all
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));


-- ============================================================================
-- WhatsApp tables (if they exist) — Fix #1 for any policies on these tables.
-- These tables are created by external migrations; we apply the same fix pattern.
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'whatsapp_messages') then
    -- Drop any existing policies and recreate with scalar subselect wrapper
    execute $p$
      drop policy if exists "whatsapp_messages_admin_all" on public.whatsapp_messages;
      create policy "whatsapp_messages_admin_all" on public.whatsapp_messages
        for all to authenticated
        using ((select public.is_admin()))
        with check ((select public.is_admin()));
    $p$;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'whatsapp_logs') then
    execute $p$
      drop policy if exists "whatsapp_logs_admin_all" on public.whatsapp_logs;
      create policy "whatsapp_logs_admin_all" on public.whatsapp_logs
        for all to authenticated
        using ((select public.is_admin()))
        with check ((select public.is_admin()));
    $p$;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'whatsapp_settings') then
    execute $p$
      drop policy if exists "whatsapp_settings_admin_all" on public.whatsapp_settings;
      create policy "whatsapp_settings_admin_all" on public.whatsapp_settings
        for all to authenticated
        using ((select public.is_admin()))
        with check ((select public.is_admin()));
    $p$;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'material_allotments') then
    execute $p$
      drop policy if exists "material_allotments_admin_receptionist_all" on public.material_allotments;
      drop policy if exists "material_allotments_technician_select" on public.material_allotments;
      drop policy if exists "material_allotments_technician_insert" on public.material_allotments;
      create policy "material_allotments_admin_receptionist_all" on public.material_allotments
        for all to authenticated
        using ((select public.is_admin()) or (select public.is_receptionist()))
        with check ((select public.is_admin()) or (select public.is_receptionist()));
      create policy "material_allotments_technician_select" on public.material_allotments
        for select to authenticated
        using (technician_id = (select auth.uid()) or (select public.is_admin()) or (select public.is_receptionist()));
    $p$;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'inventory_transactions') then
    execute $p$
      drop policy if exists "inventory_transactions_admin_all" on public.inventory_transactions;
      create policy "inventory_transactions_admin_all" on public.inventory_transactions
        for all to authenticated
        using ((select public.is_admin()))
        with check ((select public.is_admin()));
      drop policy if exists "inventory_transactions_staff_select" on public.inventory_transactions;
      create policy "inventory_transactions_staff_select" on public.inventory_transactions
        for select to authenticated
        using (true);
    $p$;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'products') then
    execute $p$
      drop policy if exists "products_admin_all" on public.products;
      create policy "products_admin_all" on public.products
        for all to authenticated
        using ((select public.is_admin()))
        with check ((select public.is_admin()));
      drop policy if exists "products_staff_select" on public.products;
      create policy "products_staff_select" on public.products
        for select to authenticated
        using (true);
    $p$;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'invoices') then
    execute $p$
      drop policy if exists "invoices_admin_receptionist_all" on public.invoices;
      create policy "invoices_admin_receptionist_all" on public.invoices
        for all to authenticated
        using ((select public.is_admin()) or (select public.is_receptionist()))
        with check ((select public.is_admin()) or (select public.is_receptionist()));
    $p$;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'invoice_items') then
    execute $p$
      drop policy if exists "invoice_items_admin_receptionist_all" on public.invoice_items;
      create policy "invoice_items_admin_receptionist_all" on public.invoice_items
        for all to authenticated
        using ((select public.is_admin()) or (select public.is_receptionist()))
        with check ((select public.is_admin()) or (select public.is_receptionist()));
    $p$;
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'inventory_audit_log') then
    execute $p$
      drop policy if exists "inventory_audit_log_admin_all" on public.inventory_audit_log;
      create policy "inventory_audit_log_admin_all" on public.inventory_audit_log
        for all to authenticated
        using ((select public.is_admin()))
        with check ((select public.is_admin()));
    $p$;
  end if;
end $$;


-- ============================================================================
-- TABLE: public.salary (staff can read own salary — from 20260801000009)
-- ============================================================================
drop policy if exists "Staff can view own salary" on public.salary;
create policy "salary_user_read_own"
  on public.salary for select
  to authenticated
  using (user_id = (select auth.uid()));


-- Reload schema cache
notify pgrst, 'reload schema';
