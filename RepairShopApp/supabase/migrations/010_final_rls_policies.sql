-- ============================================================================
-- Phase 9: Final RLS Policies — RepairShop Production Security
-- ============================================================================
-- This migration:
-- 1. Drops ALL existing permissive policies from all tables and storage.
-- 2. Creates safe SECURITY DEFINER helper functions for role checking.
-- 3. Creates strict, role-specific policies for every table.
-- 4. Creates storage bucket policies for attendance-selfies and onsite-visits.
-- 5. Ensures RLS is enabled on all tables.
--
-- IMPORTANT: Run this in Supabase SQL Editor.
-- This replaces all earlier RLS policies (003, 004, 006, 008).
--
-- SECURITY NOTE: These policies use helper functions marked SECURITY DEFINER
-- to safely query the users table without infinite recursion. The helper
-- functions have SET search_path = public to prevent search_path hijacking.
-- ============================================================================


-- ============================================================================
-- STEP 0: Drop all existing policies to start clean
-- ============================================================================

-- users
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.users;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- jobs
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.jobs;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'jobs'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- job_materials
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.job_materials;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'job_materials'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- attendance
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.attendance;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- onsite_visits
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.onsite_visits;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'onsite_visits'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- inventory
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.inventory;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- billing
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.billing;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'billing'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- payments
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.payments;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- staff_rates
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.staff_rates;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_rates'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- salary
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.salary;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'salary'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- notifications
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.notifications;', E'\n')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop old storage policies
DO $$ BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON storage.objects;', E'\n')
    FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================================================
-- STEP 1: Create helper functions (SECURITY DEFINER to avoid recursion)
-- ============================================================================
-- These functions bypass RLS on the users table to safely check the calling
-- user's role and active status. This prevents infinite recursion when
-- policies on the users table reference the users table.
-- SET search_path = public prevents search_path hijacking attacks.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.users WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_receptionist()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'receptionist' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_technician()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'technician' AND is_active = true
  );
$$;


-- ============================================================================
-- STEP 2: Enable RLS on ALL tables
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onsite_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- TABLE: users
-- ============================================================================
-- SELECT: Any authenticated user can read their own row.
--         Admin can read all rows.
--         Receptionist can read active users (needed for technician dropdown).
-- INSERT: User can insert their own profile on signup.
-- UPDATE: Admin can update any row (approve, block, change role).
--         User can update own row (push token, name, phone).
--         CRITICAL: Non-admin self-update is column-restricted by trigger
--         in 011_security_triggers.sql to prevent role/is_active escalation.

-- Any authenticated user can read their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin can read ALL user profiles
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Receptionist can read active users (needed for technician dropdown in NewJobScreen)
CREATE POLICY "users_select_receptionist" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_receptionist() AND is_active = true);

-- User can insert their own profile row on signup (id must match auth.uid())
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User can update their own row (expo_push_token, name, phone)
-- SECURITY: Column-level restriction is enforced by trigger
-- trg_prevent_non_admin_user_self_escalation in 011_security_triggers.sql
-- which blocks non-admin from changing: role, is_active
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can update any user (approve, block, change role)
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_admin());


-- ============================================================================
-- TABLE: jobs
-- ============================================================================
-- Admin: full CRUD
-- Receptionist: SELECT all, INSERT, UPDATE all
-- Technician: SELECT + UPDATE only jobs where technician_id = auth.uid()
-- SECURITY: Technician column-level restriction enforced by trigger
-- trg_prevent_technician_job_field_restriction in 011_security_triggers.sql

-- Admin can do everything with jobs
CREATE POLICY "jobs_all_admin" ON public.jobs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Receptionist can read all jobs
CREATE POLICY "jobs_select_receptionist" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.is_receptionist());

-- Receptionist can create jobs
CREATE POLICY "jobs_insert_receptionist" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_receptionist());

-- Receptionist can update jobs (reassign technician, etc.)
CREATE POLICY "jobs_update_receptionist" ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.is_receptionist());

-- Technician can ONLY see jobs assigned to them
CREATE POLICY "jobs_select_assigned_technician" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.is_technician() AND technician_id = auth.uid());

-- Technician can ONLY update jobs assigned to them
-- Column restriction: status, work_notes, completed_at (enforced by trigger)
CREATE POLICY "jobs_update_assigned_technician" ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.is_technician() AND technician_id = auth.uid())
  WITH CHECK (public.is_technician() AND technician_id = auth.uid());


-- ============================================================================
-- TABLE: job_materials
-- ============================================================================
-- Admin: full CRUD
-- Receptionist: SELECT all (needed for billing/job detail)
-- Technician: SELECT/INSERT/UPDATE/DELETE only for assigned jobs

-- Admin full access
CREATE POLICY "job_materials_all_admin" ON public.job_materials
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Receptionist can read all materials (for billing/job detail)
CREATE POLICY "job_materials_select_receptionist" ON public.job_materials
  FOR SELECT TO authenticated
  USING (public.is_receptionist());

-- Technician can read materials for their assigned jobs only
CREATE POLICY "job_materials_select_technician" ON public.job_materials
  FOR SELECT TO authenticated
  USING (
    public.is_technician()
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_materials.job_id
      AND jobs.technician_id = auth.uid()
    )
  );

-- Technician can insert materials for their assigned jobs
CREATE POLICY "job_materials_insert_technician" ON public.job_materials
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_technician()
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_materials.job_id
      AND jobs.technician_id = auth.uid()
    )
  );

-- Technician can update materials for their assigned jobs
CREATE POLICY "job_materials_update_technician" ON public.job_materials
  FOR UPDATE TO authenticated
  USING (
    public.is_technician()
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_materials.job_id
      AND jobs.technician_id = auth.uid()
    )
  );

-- Technician can delete materials for their assigned jobs
CREATE POLICY "job_materials_delete_technician" ON public.job_materials
  FOR DELETE TO authenticated
  USING (
    public.is_technician()
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_materials.job_id
      AND jobs.technician_id = auth.uid()
    )
  );


-- ============================================================================
-- TABLE: attendance
-- ============================================================================
-- Users: SELECT/INSERT/UPDATE only their own rows
-- Admin: SELECT/UPDATE all rows (for approval, corrections)
-- No cross-user visibility for receptionist or technician

-- User can read their own attendance
CREATE POLICY "attendance_select_own" ON public.attendance
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- User can insert their own attendance
CREATE POLICY "attendance_insert_own" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User can update their own attendance (check-out flow)
CREATE POLICY "attendance_update_own" ON public.attendance
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admin can read ALL attendance
CREATE POLICY "attendance_select_admin" ON public.attendance
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admin can update ALL attendance (approvals, corrections)
CREATE POLICY "attendance_update_admin" ON public.attendance
  FOR UPDATE TO authenticated
  USING (public.is_admin());


-- ============================================================================
-- TABLE: onsite_visits
-- ============================================================================
-- Admin: full CRUD
-- Technician: SELECT/INSERT/UPDATE own visits for assigned jobs only
-- Receptionist: SELECT for job detail oversight

-- Admin full access
CREATE POLICY "onsite_visits_all_admin" ON public.onsite_visits
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Technician can read their own onsite visits
CREATE POLICY "onsite_visits_select_technician" ON public.onsite_visits
  FOR SELECT TO authenticated
  USING (public.is_technician() AND technician_id = auth.uid());

-- Technician can insert onsite visits for their assigned jobs
CREATE POLICY "onsite_visits_insert_technician" ON public.onsite_visits
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_technician()
    AND technician_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = onsite_visits.job_id
      AND jobs.technician_id = auth.uid()
    )
  );

-- Technician can update their own onsite visits (departure selfie)
CREATE POLICY "onsite_visits_update_technician" ON public.onsite_visits
  FOR UPDATE TO authenticated
  USING (public.is_technician() AND technician_id = auth.uid());

-- Receptionist can view onsite visits for job detail oversight
CREATE POLICY "onsite_visits_select_receptionist" ON public.onsite_visits
  FOR SELECT TO authenticated
  USING (public.is_receptionist());


-- ============================================================================
-- TABLE: billing (Receptionist + Admin only. NO technician access.)
-- ============================================================================

-- Admin full access
CREATE POLICY "billing_all_admin" ON public.billing
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Receptionist can read billing
CREATE POLICY "billing_select_receptionist" ON public.billing
  FOR SELECT TO authenticated
  USING (public.is_receptionist());

-- Receptionist can create billing
CREATE POLICY "billing_insert_receptionist" ON public.billing
  FOR INSERT TO authenticated
  WITH CHECK (public.is_receptionist());

-- Receptionist can update billing
CREATE POLICY "billing_update_receptionist" ON public.billing
  FOR UPDATE TO authenticated
  USING (public.is_receptionist());


-- ============================================================================
-- TABLE: inventory (Admin full CRUD + Receptionist read-only. NO technician.)
-- ============================================================================

-- Admin full access
CREATE POLICY "inventory_all_admin" ON public.inventory
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Receptionist read-only
CREATE POLICY "inventory_select_receptionist" ON public.inventory
  FOR SELECT TO authenticated
  USING (public.is_receptionist());


-- ============================================================================
-- TABLE: salary (ADMIN ONLY — no receptionist, no technician)
-- ============================================================================

CREATE POLICY "salary_all_admin" ON public.salary
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================================
-- TABLE: staff_rates (ADMIN ONLY — no receptionist, no technician)
-- ============================================================================

CREATE POLICY "staff_rates_all_admin" ON public.staff_rates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================================
-- TABLE: payments (ADMIN ONLY — no receptionist, no technician)
-- ============================================================================

CREATE POLICY "payments_all_admin" ON public.payments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================================
-- TABLE: notifications
-- ============================================================================
-- Admin: SELECT all
-- User: SELECT own notifications only
-- INSERT: Edge Functions use service_role (bypass RLS). Admin insert for manual entries.
-- Note: Edge Functions bypass RLS entirely via service_role key, so no
-- INSERT policy is needed for automated notification logging.

-- Admin can read all notifications
CREATE POLICY "notifications_select_admin" ON public.notifications
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- User can read their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

-- Admin insert allowed for manual entries
CREATE POLICY "notifications_insert_admin" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Admin update for status corrections
CREATE POLICY "notifications_update_admin" ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.is_admin());


-- ============================================================================
-- STORAGE: attendance-selfies bucket
-- ============================================================================
-- Path pattern: {user_id}/{date}-checkin.jpg or {date}-checkout.jpg
-- Users can only upload/read in their own folder.
-- Admin can read all.

-- User can upload to their own folder: attendance-selfies/{user_id}/...
CREATE POLICY "attendance_selfies_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attendance-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- User can read their own selfies
CREATE POLICY "attendance_selfies_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attendance-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin can read all attendance selfies
CREATE POLICY "attendance_selfies_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attendance-selfies'
    AND public.is_admin()
  );

-- Admin can delete attendance selfies if needed
CREATE POLICY "attendance_selfies_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'attendance-selfies'
    AND public.is_admin()
  );


-- ============================================================================
-- STORAGE: onsite-visits bucket
-- ============================================================================
-- Path pattern: {job_id}/{type}_{timestamp}.jpg
-- Technicians can upload photos for their assigned jobs.
-- Technicians can read photos for their assigned jobs only.
-- Admin can read all. Receptionist can read all (job detail oversight).
--
-- NOTE: The path uses job_id as the first folder. We extract it and check
-- against the jobs table to verify the technician is assigned to that job.
-- If storage.foldername() behavior differs in your Supabase version,
-- verify this policy manually in the Supabase dashboard.

-- Technician can upload to onsite-visits for their assigned jobs
CREATE POLICY "onsite_visits_storage_insert_technician" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'onsite-visits'
    AND public.is_technician()
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
      AND jobs.technician_id = auth.uid()
    )
  );

-- Technician can read onsite-visits photos only for their assigned jobs
CREATE POLICY "onsite_visits_storage_select_technician" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'onsite-visits'
    AND public.is_technician()
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
      AND jobs.technician_id = auth.uid()
    )
  );

-- Admin can read all onsite visit photos
CREATE POLICY "onsite_visits_storage_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'onsite-visits'
    AND public.is_admin()
  );

-- Receptionist can read onsite visit photos (job detail oversight)
CREATE POLICY "onsite_visits_storage_select_receptionist" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'onsite-visits'
    AND public.is_receptionist()
  );

-- Admin can delete onsite visit photos if needed
CREATE POLICY "onsite_visits_storage_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'onsite-visits'
    AND public.is_admin()
  );


-- ============================================================================
-- DONE. All 11 tables have strict, role-based RLS policies.
-- Storage buckets have ownership-based access policies.
-- Edge Functions using service_role bypass RLS automatically.
--
-- CRITICAL: This migration must be used together with
-- 011_security_triggers.sql which enforces column-level restrictions
-- on the users and jobs tables for non-admin roles.
-- ============================================================================
