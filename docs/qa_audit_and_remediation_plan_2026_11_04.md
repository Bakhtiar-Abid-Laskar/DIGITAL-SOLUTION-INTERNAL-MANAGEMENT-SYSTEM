# Digital Solution — Full QA Audit & Remediation Roadmap
**Date**: November 4, 2026 (Asia/Kolkata IST)  
**System**: RepairShopApp (Expo React Native), Admin Panel (Next.js), Supabase PostgreSQL 17.6 (`sssdjuxbelektszepikt`, Region: `ap-southeast-1`)  
**Status**: AUDIT COMPLETE (Read-Only Phase Finished). Ready for Phase 2 Implementation upon user trigger.

---

## Executive Summary

A comprehensive read-only QA audit was conducted on the live Supabase database and the codebase. No destructive modifications or code alterations were performed.

### Key Discoveries
1. **Unapplied Remote Migrations**: 
   The live remote Supabase database stops at migration `20260909143000_rename_job_code_prefix_to_ds.sql`. Exactly **12 local migrations** (authored between Sept 17 and Nov 1, 2026) were committed locally but **never executed on the remote production database**.
2. **Task 1 ("Add Material" Error)**:
   - Root Cause: `RepairShopApp/src/components/materials/AddMaterialModal.tsx:148-163` attempts to insert `serial_number`. The column `serial_number` is missing from table `public.job_materials` on the live database because migration `20261101050000_compulsory_job_materials_serials.sql` was never applied.
3. **Task 2A ("Load More" & 4 vs 7 Jobs Discrepancy)**:
   - Root Cause 1 (RLS Defect): Tab counts use `get_job_status_counts()`, a `SECURITY DEFINER` function querying `job_technicians` directly (showing 7 Received jobs for technician Suman Das). However, the SELECT query in `MyJobsScreen.tsx` is subject to RLS policy `jobs_select_staff`, which only checks `jobs.technician_id = auth.uid()`. Because 3 of Suman's jobs are co-assignments where `jobs.technician_id` is set to Hirak Das, RLS strips them, returning only 4 jobs.
   - Root Cause 2 (UI Glitch): Because only 4 jobs return (< page size 20), `hasMore` is `false`. However, `JobList.tsx:198` renders the `Load More` button unconditionally whenever `onLoadMore` prop is provided. When tapped, `MyJobsScreen.tsx:177` evaluates `if (!hasMore) return;` and silently does nothing.
4. **Task 3 (Auto-Absent Engine)**:
   - Current state: Missing days simply have no row in `public.attendance`. Check constraint `attendance_status_check` strictly enforces TitleCase: `CHECK (status = ANY (ARRAY['Present', 'Halfday', 'Leave', 'Absent']))`.
   - Missing columns: `is_auto_marked boolean DEFAULT false` and `marked_at timestamptz`.
   - Missing cron job: `pg_cron` (1.6.4) and `pg_net` (0.20.4) are installed, but 0 jobs are scheduled.

---

## 1. Project Map & Live Infrastructure State

### Database Tables (56 Public Tables)
- **Jobs & Workflow**: `jobs`, `job_technicians`, `job_materials`, `material_allotments`, `onsite_visits`, `job_types`.
- **Inventory & Catalog**: `inventory`, `products`, `inventory_transactions`, `inventory_unit_serials`, `inventory_audit_log`.
- **Staff & HR**: `users`, `attendance`, `employee_leave`, `employee_bonus`, `staff_rates`, `staff_incentives`, `holidays`, `geofence_settings`, `payroll_audit_log`.
- **Sales & Billing**: `invoices`, `invoice_items`, `invoice_payments`, `credit_notes`, `sales`, `sale_items`, `sale_types`, `billing_legacy`, `payments`, `customer_wallet_transactions`.
- **System & Notifications**: `notifications`, `whatsapp_messages`, `whatsapp_logs`, `whatsapp_settings`, `pending_uploads`, `stuck_uploads`, `export_jobs`, `export_jobs_latest`.
- **Lookup Tables**: `ui_job_statuses`, `ui_priorities`, `ui_device_types`, `ui_roles`, `ui_payment_methods`, `ui_payment_statuses`, `ui_sale_statuses`, `ui_service_locations`.

### Active Edge Functions (18 Deployed)
`admin-create-user`, `admin-delete-user`, `calculate-monthly-salary`, `export-attendance-reports`, `export-customer-ledger`, `export-monthly-data`, `generate-invoice`, `notify-on-finance-event`, `notify-on-inventory-change`, `notify-on-job-created`, `notify-on-late-checkin`, `notify-on-leave-event`, `notify-on-material-event`, `notify-on-onsite-visit`, `notify-on-status-change`, `process-pending-uploads`, `send-invoice-email`, `send-notification`.

### Critical RLS Policies Discovered
- `public.jobs`:
  - `jobs_select_staff`: `((is_admin()) OR (is_receptionist()) OR ((is_technician()) AND (technician_id = auth.uid())))` *(Defect: Omits `job_technicians`)*.
  - `jobs_update_technician_assigned`: `((is_technician()) AND (technician_id = auth.uid()))` *(Defect: Omits `job_technicians`)*.
- `public.job_materials`:
  - `job_materials_admin_receptionist_all`: Admin & Receptionist have full access.
  - `job_materials_technician_insert`: `((technician_id = auth.uid()) OR (technician_id IS NULL) OR (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_materials.job_id AND jobs.technician_id = auth.uid())))`.
  - `job_materials_technician_select` / `update` / `delete`: Scoped to `technician_id = auth.uid()` or assigned job.
- `public.attendance`:
  - `attendance_all_admin`: Full access for Admins.
  - `attendance_insert_own` / `attendance_select` / `attendance_update`: Scoped to `user_id = auth.uid()` or Admin.
- `public.salary`:
  - `salary_admin_only`: Full access for Admins.
  - `salary_own_select`: `user_id = auth.uid()` or Admin.

---

## 2. Unapplied Migrations & Schema Mismatch Breakdown

The live database's `supabase_migrations.schema_migrations` table records the latest applied version as:
`20260909143000` (`rename_job_code_prefix_to_ds`).

The following 12 migrations exist locally in `supabase/migrations/` but were **never run on remote**:
1. `20260917120000_reconcile_payroll_leave_engine.sql`
2. `20260918000001_add_update_invoice_rpc.sql`
3. `20260918000002_consolidate_stock_columns.sql`
4. `20261024180000_attendance_salary_audit_remediation.sql`
5. `20261026050000_full_audit_remediation.sql`
6. `20261101000000_billing_payment_privacy_fixes.sql`
7. `20261101010000_service_job_management_spec_fixes.sql`
8. `20261101020000_fix_accrue_incentives_trigger.sql`
9. `20261101030000_atomic_complete_job_materials_and_rls_fix.sql`
10. `20261101040000_unified_push_and_device_tokens.sql`
11. `20261101045000_repair_mojibake_data.sql`
12. `20261101050000_compulsory_job_materials_serials.sql`

### Specific Schema Gaps Identified
- `job_materials.serial_number`: **MISSING** on remote DB.
- `job_materials.serial_id`: **MISSING** on remote DB.
- `job_material_serials` table: **MISSING** on remote DB.
- `attendance.is_auto_marked`: **MISSING** on remote DB.
- `attendance.marked_at`: **MISSING** on remote DB.
- `device_tokens` table: **MISSING** on remote DB.
- `shift_settings` table: **MISSING** on remote DB.

---

## 3. Comprehensive KPI & Metrics Mapping Table

| Screen & Surface | Card / Metric Label | Data Source (Query / RPC) | Filters Applied | Timezone Logic | Role Scoping | Finding / Risk |
|---|---|---|---|---|---|---|
| **Tech Mobile**: `TechnicianDashboard` | Total Assigned | RPC `get_job_status_counts` | `jt.technician_id = uid AND jt.removed_at IS NULL` | N/A | Scoped to tech | Accurately queries `job_technicians`. |
| **Tech Mobile**: `TechnicianDashboard` | In Progress | RPC `get_job_status_counts` | `j.status = 'In Progress'` | N/A | Scoped to tech | Matches assigned jobs. |
| **Tech Mobile**: `TechnicianDashboard` | Completed Today | `jobs` table select | `status = 'Completed' AND completed_at >= startOfToday` | IST via `getStartOfTodayIST()` | Scoped to tech | Properly aligned to Asia/Kolkata IST. |
| **Tech Mobile**: `TechnicianDashboard` | Urgent Pending | RPC `get_job_status_counts` | `priority = 'Urgent' AND status != 'Completed'` | N/A | Scoped to tech | Matches urgent assigned jobs. |
| **Tech Mobile**: `MyJobsScreen` | Tab Badges (All, Received...) | RPC `get_job_status_counts` | Group by status from `job_technicians` | N/A | Scoped to tech | **DISCREPANCY**: Counts 7 Received, but list returns 4 due to RLS filter. |
| **Reception**: `DashboardScreen` | Received | `jobs` table select count | `status = 'Received'` | N/A | Global | Counts all global Received jobs (not just today's). |
| **Reception**: `DashboardScreen` | In Progress | `jobs` table select count | `status = 'In Progress'` | N/A | Global | Accurately counts global In Progress jobs. |
| **Reception**: `DashboardScreen` | Completed | `jobs` table select count | `status = 'Completed' AND completed_at >= startOfToday` | **UTC ISO**: `new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'` | Global | **BUG**: Uses UTC midnight instead of IST midnight (5.5 hour discrepancy). |
| **Reception**: `DashboardScreen` | Urgent | `jobs` table select count | `priority = 'Urgent' AND status != 'Completed'` | N/A | Global | Matches global urgent jobs. |
| **Admin Mobile**: `OverviewScreen` | Active Jobs | `jobs` table count | `status NOT IN ('Completed','Delivered','Cancelled')` | N/A | Global | Accurately counts all open jobs. |
| **Admin Mobile**: `OverviewScreen` | Today Revenue | Sum of `invoices` + `sales` | `status != 'cancelled' AND created_at >= today + 'T00:00:00Z'` | **UTC ISO**: `new Date().toISOString().split('T')[0]` | Global | **DISCREPANCY**: Counts unpaid/draft invoices as revenue; uses UTC midnight. |
| **Admin Mobile**: `OverviewScreen` | Staff Present | `attendance` table count | `date = today AND check_in_time IS NOT NULL` | **UTC ISO** | Global | Date string can lag by 1 day between 00:00 and 05:30 IST. |
| **Admin Mobile**: `OverviewScreen` | Low Stock | `inventory` cached stock | `quantity_cached <= low_stock_threshold` | N/A | Global | Accurately reflects low stock threshold. |
| **Web Admin**: `OverviewPage` (`page.tsx`) | Pipeline Counts | Client-side filter over `jobs` | `job.status === status` | N/A | Global | **QUERY LIMIT BUG**: Limited to top 250 jobs (`.limit(250)`). |
| **Web Admin**: `OverviewPage` (`page.tsx`) | Today Sales (Revenue) | Client-side sum over `invoices` | `status === 'paid' AND sameDay(created_at, now)` | Local browser timezone | Global | Uses browser timezone instead of fixed IST; limited to top 250 invoices. |
| **Web Admin**: `OverviewPage` (`page.tsx`) | Pending Payments | Client-side sum over `invoices` | `status === 'draft'` | N/A | Global | Ignores invoices beyond the 250 row limit. |

---

## 4. Deep-Dive Root Causes & Verification Proof

### Task 1: "Add Material" Error
- **Error**: `Could not find the 'serial_number' column of 'job_materials' in the schema cache`
- **Location**: `RepairShopApp/src/components/materials/AddMaterialModal.tsx:148-163`
- **Database Query Proof**:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'job_materials' AND column_name = 'serial_number';
  -- Result: 0 rows returned
  ```
- **Cause**: Unapplied migration `20261101050000_compulsory_job_materials_serials.sql`.

### Task 2A: "Load More" Button & Count Discrepancy (4 vs 7)
- **Observed State**: Technician Suman Das (`id: 11efeba3-73a6-4f1d-8a9f-159e9185a034`) has tab count `Received (7)`, but only 4 cards display, and "Load More" does nothing.
- **Database Query Proof**:
  ```sql
  SELECT j.id, j.job_code, j.status, j.technician_id, 
         (j.technician_id = '11efeba3-73a6-4f1d-8a9f-159e9185a034') AS matches_primary
  FROM jobs j
  JOIN job_technicians jt ON jt.job_id = j.id
  WHERE jt.technician_id = '11efeba3-73a6-4f1d-8a9f-159e9185a034' 
    AND jt.removed_at IS NULL AND j.status = 'Received';
  ```
  **Results**:
  1. `DS-2026-0020` — `technician_id`: Hirak Das (`matches_primary`: **false**)
  2. `DS-2026-0044` — `technician_id`: Hirak Das (`matches_primary`: **false**)
  3. `DS-2026-0039` — `technician_id`: Hirak Das (`matches_primary`: **false**)
  4. `DS-2026-0048` — `technician_id`: Suman Das (`matches_primary`: **true**)
  5. `DS-2026-0052` — `technician_id`: Suman Das (`matches_primary`: **true**)
  6. `DS-2026-0067` — `technician_id`: Suman Das (`matches_primary`: **true**)
  7. `DS-2026-0093` — `technician_id`: Suman Das (`matches_primary`: **true**)
- **RLS Policy Defect**:
  `jobs_select_staff` on `public.jobs` allows select only where `jobs.technician_id = auth.uid()`. It does not check `job_technicians`. PostgREST strips the 3 co-assigned jobs, returning only 4.
- **UI Bug**:
  `jobsRes.data.length` is 4. Because 4 < 20, `hasMore` is set to `false`. In `JobList.tsx:198`, `ListFooterComponent` renders the button without checking `hasMore`. Tapping it triggers `onLoadMore` which immediately halts at `if (!hasMore) return;`.

### Task 3: Auto-Absent Architecture
- **Constraints**:
  - `attendance_status_check` enforces `CHECK (status = ANY (ARRAY['Present', 'Halfday', 'Leave', 'Absent']))`. TitleCase `'Absent'` is required.
  - Unique constraint `attendance_user_id_date_key` on `(user_id, date)` guarantees idempotency.
- **Required Columns**: `is_auto_marked boolean DEFAULT false`, `marked_at timestamptz`.

---

## 5. Phase 2 Implementation Blueprint (Ready to Execute)

### Task 1 Execution Plan
1. Apply migration:
   ```sql
   ALTER TABLE public.job_materials 
     ADD COLUMN IF NOT EXISTS serial_number text,
     ADD COLUMN IF NOT EXISTS serial_id uuid;

   CREATE INDEX IF NOT EXISTS idx_job_materials_serial_number 
     ON public.job_materials(serial_number) 
     WHERE serial_number IS NOT NULL;

   CREATE TABLE IF NOT EXISTS public.job_material_serials (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     job_material_id uuid REFERENCES public.job_materials(id) ON DELETE CASCADE,
     serial_number text NOT NULL,
     created_at timestamptz DEFAULT now()
   );

   NOTIFY pgrst, 'reload schema';
   ```
2. Verify frontend material add, allotment stock deduction, deletion restoration, and friendly error toasts.

### Task 2 Execution Plan
1. Update `jobs_select_staff` RLS policy:
   ```sql
   DROP POLICY IF EXISTS "jobs_select_staff" ON public.jobs;
   CREATE POLICY "jobs_select_staff" ON public.jobs FOR SELECT TO authenticated
   USING (
     (SELECT public.is_admin()) OR
     (SELECT public.is_receptionist()) OR
     (
       (SELECT public.is_technician()) AND (
         technician_id = (SELECT auth.uid()) OR
         EXISTS (
           SELECT 1 FROM public.job_technicians jt
           WHERE jt.job_id = jobs.id
             AND jt.technician_id = (SELECT auth.uid())
             AND jt.removed_at IS NULL
         )
       )
     )
   );
   ```
2. In `JobList.tsx`: Accept `hasMore: boolean` prop; conditionally render footer only when `hasMore === true`.
3. Align KPI calculations and timezone logic:
   - Receptionist `startOfToday`: Replace UTC ISO string with `getStartOfTodayIST()`.
   - Admin Revenue: Only include `status = 'paid'` invoices as realized revenue.
   - Replace Next.js web overview client-side filters with a dedicated RPC or remove the arbitrary `.limit(250)`.

### Task 3 Execution Plan
1. Add columns to `public.attendance`:
   ```sql
   ALTER TABLE public.attendance 
     ADD COLUMN IF NOT EXISTS is_auto_marked boolean DEFAULT false,
     ADD COLUMN IF NOT EXISTS marked_at timestamptz;
   ```
2. Create idempotent function `public.mark_absent_for_date(target_date date)`:
   - Queries active staff (`users.is_active = true` AND `role IN ('technician', 'receptionist')`).
   - Filters out staff hired after `target_date` or terminated before `target_date`.
   - Checks if `target_date` is a Sunday (weekly off) or in `public.holidays`.
   - Excludes staff who already have a record in `public.attendance` for `target_date`.
   - If user has approved leave in `public.employee_leave`, inserts status `'Leave'`; otherwise inserts status `'Absent'`.
3. Add trigger on `employee_leave`:
   - When leave status changes to `'approved'`, updates any existing `is_auto_marked = true` row on `public.attendance` from `'Absent'` to `'Leave'`.
4. Schedule `pg_cron` job:
   - Schedule at 00:05 IST daily (`18:35 UTC` daily: `35 18 * * *`):
     ```sql
     SELECT cron.schedule(
       'daily-auto-absent-ist',
       '35 18 * * *',
       $$SELECT public.mark_absent_for_date((now() AT TIME ZONE 'Asia/Kolkata' - interval '1 day')::date);$$
     );
     ```

---

## 6. Business Rule Confirmations Needed Before Phase 2
1. **Weekly Offs**: Are Sundays designated as non-working days where staff should **not** be marked absent?
2. **Public Holidays**: Should dates listed in `public.holidays` be excluded from auto-absence?
3. **Hire Date Boundary**: Should auto-absence strictly apply only on or after an employee's `hire_date`?
4. **Full Migration Synchronization**: Would you like to run the entire batch of 12 unapplied migrations, or apply targeted migrations first?

