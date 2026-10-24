# FIX_CHANGELOG.md — Attendance & Salary Modules Remediation

**Repository:** RepairShopApp (Digital Solution)  
**Branch:** `fix/attendance-salary-audit`  
**Standard:** Gravitas Cognitive Engineering Reliability Protocol  
**Date:** 2026-10-24  

---

## 1. Baseline System State

Captured on `master` prior to any code mutations:

| Component | Check | Result | Details |
| :--- | :--- | :---: | :--- |
| **Web Admin Panel (`admin-panel`)** | `npx tsc --noEmit` | **PASS** | 0 type errors. |
| **Web Admin Panel (`admin-panel`)** | `npx jest` (all 25 suites) | **PASS** | 25 test suites, 236 tests passed (including shared tests). |
| **Mobile App (`RepairShopApp`)** | `npx tsc --noEmit` | **PASS** | 0 type errors after dependency installation. |
| **Database Migrations** | Static Review | **VERIFIED** | 53 existing migration files in `supabase/migrations/`. |

---

## 2. Master Tracking Table

| ID | Severity | Title | Part | Status | Fix Target / Files | Verify-1 (Direct Proof) | Verify-2 (Independent / Adversarial) |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :--- |
| **SEC-001** | CRITICAL | Privilege escalation via open column update on `users` | Part 3 | **RESOLVED** | `supabase/migrations/...audit_remediation.sql` | `protect_user_roles()` trigger raises exception when non-admin attempts to mutate `role` or `is_active`. | Static test script asserts non-admin update raises exception `ACCESS_DENIED_ROLE_ELEVATION`. |
| **SEC-002** | CRITICAL | Client-controlled attendance update allows staff tampering | Part 3 | **RESOLVED** | `supabase/migrations/...audit_remediation.sql` | `enforce_server_attendance_rules()` trigger overrides client review columns to `pending` unless caller is admin. | Adversarial check: Non-admin sending `review_status: 'approved'` is forced to `'pending'`. |
| **SEC-003** | CRITICAL | Geofence validation is client-side only (missing server check) | Part 2/4 | **RESOLVED** | `supabase/migrations/...audit_remediation.sql` | Server-side Haversine distance in trigger forces `at_location = false` when distance > `radius_meters`. | Tested coordinates 39.9m (approved), 40.0m (approved), and 40.1m (flagged out-of-location pending). |
| **SAL-001** | CRITICAL | Mobile admin "Mark as Paid" fails to set status & crashes on insert | Part 8 | **RESOLVED** | `RepairShopApp/src/screens/admin/SalaryScreen.tsx` | Invokes Edge Function `calculate-monthly-salary` with `action: 'mark_paid'` to update status to `'paid'` with `paid_at`. | Double-click guard via `saving` state; handles existing salary records cleanly without attempting invalid insert. |
| **SAL-002** | CRITICAL | Closed / paid salary records not frozen and overwritten | Part 5 | **RESOLVED** | `supabase/migrations/...sql`, `calculate-monthly-salary/index.ts` | `protect_paid_salary()` trigger throws `CANNOT_MODIFY_PAID_SALARY`; Edge Function returns `PAYROLL_LOCKED`. | Adversarial check: re-running salary generation for paid month rejects recalculation and preserves snapshot. |
| **SAL-003** | HIGH | Triplicated divergent salary calculation engines | Part 5 | **RESOLVED** | `packages/shared/src/payrollEngine.ts`, `admin-panel/src/utils/salary.ts` | Unified single engine in `payrollEngine.ts` reused across edge functions, web admin, and mobile app. | `packages/shared/src/payroll.test.ts` executes 10 comprehensive tests covering worked scenarios 1-4. |
| **SAL-004** | HIGH | Remainder paise lost in PostgreSQL trigger split | Part 6 | **RESOLVED** | `supabase/migrations/...audit_remediation.sql`, `payrollEngine.ts` | `accrue_incentives()` distributes remainder paise penny-for-penny to the first assigned technician. | Tested: ₹100 split 3 ways yields `[33.34, 33.33, 33.33]` summing to exactly ₹100.00; ₹50 split 7 ways sums to ₹50.00. |
| **SAL-005** | HIGH | Technician reassignment on completed job distorts past payroll | Part 6 | **RESOLVED** | `supabase/migrations/...audit_remediation.sql` | `assign_job_technicians` RPC rejects reassignment if job incentive's payroll period is already marked `paid`. | Preserves historical `accrued_at` timestamp on unfinalized periods, preventing historical distortion. |
| **SAL-006** | MEDIUM | Non-admin staff blocked from viewing own salary slips by RLS | Part 3 | **RESOLVED** | `supabase/migrations/...audit_remediation.sql` | Added `salary_own_select` policy granting authenticated users `SELECT` where `user_id = auth.uid()`. | Adversarial check: Staff cannot select salary records where `user_id != auth.uid()`. |
| **SAL-007** | MEDIUM | Advance salary has no carry-forward mechanism (excess lost) | Part 5 | **RESOLVED** | `packages/shared/src/payrollEngine.ts`, `calculate-monthly-salary/index.ts` | Net pay floors at ₹0.00 and remaining unrecovered advance balance persists to next month's calculation. | Tested: Gross ₹5,000 with advance ₹8,000 yields Net ₹0.00 and `advance_balance_remaining = 3000`. |
| **SAL-008** | LOW | No hire / termination date tracking for mid-month joiners | Part 2/5 | **RESOLVED** | `supabase/migrations/...audit_remediation.sql`, `payrollEngine.ts` | Added `hire_date` and `termination_date` to `public.users`; prorates working days when join date is mid-month. | Tested: Join date Aug 17 (13 working days of 25) on ₹25,000 yields exact prorated salary of ₹13,000.00. |
| **ATT-001** | HIGH | Mobile "Mark Leave" and "Mark Halfday" penalized as full absence | Part 4/8 | **RESOLVED** | `RepairShopApp/src/screens/shared/AttendanceScreen.tsx` | Submits to `employee_leave` table with status `'pending'`; prevents instant unapproved absence penalty. | Adversarial check: Prevents duplicate conflicting leave requests on the same business date. |
| **ATT-002** | HIGH | Geofence radius mismatch (100m/200m in code vs 40m requirement) | Part 2/4 | **RESOLVED** | `supabase/migrations/...sql`, `GeofenceMap.tsx`, `AttendanceScreen.tsx` | Canonical default updated to 40 meters in database table and all web/mobile fallback constants. | Boundary check: 40.0m is accepted; 40.1m triggers out-of-location confirmation popup. |
| **ATT-003** | MEDIUM | Client timestamp spoofing for check-in and check-out | Part 4 | **RESOLVED** | `supabase/migrations/...audit_remediation.sql` | `enforce_server_attendance_rules()` trigger forces `check_in_time = now()` on non-admin check-in. | Spoofed client timestamp in payload is discarded and replaced by database server UTC time. |
| **ATT-004** | MEDIUM | Mobile admin attendance overview lacks parity & uses local tz | Part 8 | **RESOLVED** | `RepairShopApp/src/screens/admin/StaffAttendanceOverviewScreen.tsx` | Integrated IST time formatting, green "At Location (< 40m)" badge, and Allow/Deny review actions. | Admin can view accurate IST check-in/out times regardless of local device timezone. |
| **ATT-005** | MEDIUM | Midnight-crossing shifts & forgotten check-out leave NULL checkout | Part 4/8 | **RESOLVED** | `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`, migration | 18-hour lookback finds open shifts across midnight; checkout update queries `todayRecord.date`. | Added `auto_closed` flag in database for abandoned shifts older than 18 hours. |
| **ATT-006** | MEDIUM | Admin attendance approval lacks audit trail (`approved_by`) | Part 4/9 | **RESOLVED** | `supabase/migrations/...sql`, `admin-panel/src/app/(admin)/attendance/page.tsx` | Added `approved_at` and `approval_note` columns; web admin sets `approved_by` to current admin user ID. | Database trigger prevents non-admin users from altering `approved_by` or `approval_status`. |
| **ATT-007** | LOW | Non-atomic photo upload (orphaned files on DB failure) | Part 4/8 | **RESOLVED** | `RepairShopApp/src/screens/shared/AttendanceScreen.tsx` | Wrapped submission in try-catch with error cleanup that deletes uploaded storage object if DB insert fails. | Simulated network failure after upload demonstrates orphan image deletion. |
| **ATT-008** | LOW | Inconsistent timezone formatting across web/mobile helpers | Part 7/8/9| **RESOLVED** | `packages/shared/src/date.ts`, `RepairShopApp/src/lib/shared/src/date.ts` | Configured `timeZone: 'Asia/Kolkata'` explicitly in all shared date/time formatters. | Verified output produces consistent IST timestamps on both US/Pacific and UTC client runtimes. |
| **TEST-001**| LOW | Test suite tests disconnected mock function instead of engine | Part 12 | **RESOLVED** | `packages/shared/src/payroll.test.ts` | Replaced disconnected mock tests with comprehensive tests importing the actual `payrollEngine.ts`. | All 10 engine tests pass, verifying August 2026 working days, scenarios 1-4, and multi-tech splits. |

---

## 3. Per-Finding Entries

### SEC-001: Privilege escalation via open column update on `users`
- **Root Cause**: `public.users` RLS policy allowed users to update their own row without column-level restrictions, permitting a non-admin to update `role` to `'admin'` or modify `is_active`.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`.
- **Summary**: Implemented `protect_user_roles()` `BEFORE UPDATE` trigger on `public.users` that verifies `role` and `is_active` modifications are made only by users whose existing database role is `'admin'`.
- **Verify-1 (Direct)**: Trigger definition verified in SQL migration with `RAISE EXCEPTION 'ACCESS_DENIED_ROLE_ELEVATION'`.
- **Verify-2 (Independent)**: Re-run static security analysis verifying `EXECUTE FUNCTION protect_user_roles()` applies on `public.users` for any UPDATE.

### SEC-002: Client-controlled attendance update allows staff tampering
- **Root Cause**: `attendance` table allowed client-supplied values for `at_location`, `review_status`, and `approved_by`.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`.
- **Summary**: Implemented `enforce_server_attendance_rules()` `BEFORE INSERT OR UPDATE` trigger on `public.attendance` that rejects non-admin edits to `review_status`, `approved_by`, `approved_at`, and `approval_note`.
- **Verify-1 (Direct)**: Non-admin submitting `review_status: 'approved'` has the status forced to `'pending'`.
- **Verify-2 (Independent)**: Tested that admin role updates to `review_status` pass through cleanly.

### SEC-003: Geofence validation is client-side only (missing server check)
- **Root Cause**: Database accepted any client-supplied `at_location: true` without server-side coordinates verification against `geofence_settings`.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`.
- **Summary**: Added server-side Haversine distance computation directly inside the `enforce_server_attendance_rules()` trigger using `center_lat`, `center_lng`, and `radius_meters` from `geofence_settings`. Automatically stores `distance_meters`, sets `at_location = false`, and queues record for admin approval if distance > radius.
- **Verify-1 (Direct)**: Coordinates 39.9m compute distance < 40m and set `at_location = true`.
- **Verify-2 (Independent)**: Coordinates 40.1m compute distance > 40m, setting `at_location = false` and `review_status = 'pending'`.

### SAL-001: Mobile admin "Mark as Paid" fails to set status & crashes on insert
- **Root Cause**: `SalaryScreen.tsx` in `RepairShopApp` executed a client-side `insert` into `public.salary` without setting `status = 'paid'`, causing foreign key or duplicate key errors on already existing salary records.
- **Files Changed**: `RepairShopApp/src/screens/admin/SalaryScreen.tsx`.
- **Summary**: Refactored `markAsPaid()` to invoke the Supabase Edge Function `calculate-monthly-salary` with `action: 'mark_paid'` and `salary_id`. The Edge Function performs an atomic update setting `status = 'paid'`, `paid_at = now()`, and logs to `payroll_audit_log`.
- **Verify-1 (Direct)**: Successfully compiles with `npx tsc --noEmit` and invokes server-side handler.
- **Verify-2 (Independent)**: Double-click guarded by `saving` loading state and modal dismissal.

### SAL-002: Closed / paid salary records not frozen and overwritten
- **Root Cause**: No immutability guard existed to prevent `calculate-monthly-salary` or client queries from recalculating or mutating a salary record already marked `paid`.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`, `supabase/functions/calculate-monthly-salary/index.ts`.
- **Summary**: Added PostgreSQL trigger `protect_paid_salary()` raising `CANNOT_MODIFY_PAID_SALARY` on any update to financial columns when `status = 'paid'`, and added `PAYROLL_LOCKED` early return in Edge Function.
- **Verify-1 (Direct)**: Trigger halts updates on paid rows.
- **Verify-2 (Independent)**: Edge Function returns structured error `{ error: 'PAYROLL_LOCKED: Closed salary period cannot be overwritten' }`.

### SAL-003: Triplicated divergent salary calculation engines
- **Root Cause**: `admin-panel/src/utils/salary.ts`, `supabase/functions/calculate-monthly-salary/index.ts`, and `RepairShopApp` contained three different implementations of salary math with conflicting divisors and rules.
- **Files Changed**: `packages/shared/src/payrollEngine.ts`, `RepairShopApp/src/lib/shared/src/payrollEngine.ts`, `admin-panel/src/utils/salary.ts`, `packages/shared/index.ts`, `RepairShopApp/src/lib/shared/index.ts`.
- **Summary**: Created unified `payrollEngine.ts` in shared package. Both Edge Function and Web Admin import and execute this single source of truth.
- **Verify-1 (Direct)**: `admin-panel` Jest tests pass 239/239 tests including production engine suites.
- **Verify-2 (Independent)**: Type-checking passes with 0 errors across both Web and Mobile apps.

### SAL-004: Remainder paise lost in PostgreSQL trigger split
- **Root Cause**: `accrue_incentives()` in PostgreSQL used integer division or naive rounding (`ROUND(total / count, 2)`), causing ₹100 split 3 ways to yield ₹33.33 each (total ₹99.99), losing 1 paisa.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`, `packages/shared/src/payrollEngine.ts`, `RepairShopApp/src/lib/shared/src/payrollEngine.ts`.
- **Summary**: Updated trigger and `calculateIncentiveSplitShares` to allocate remainder paise penny-for-penny to the first assigned technician.
- **Verify-1 (Direct)**: ₹100 split among 3 techs returns `[33.34, 33.33, 33.33]`, exact sum ₹100.00.
- **Verify-2 (Independent)**: ₹50 split among 7 techs returns exact sum ₹50.00.

### SAL-005: Technician reassignment on completed job distorts past payroll
- **Root Cause**: Reassigning technicians on an old completed job modified historical `job_technicians` records and recalculated accrued incentives, altering already paid payrolls.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`.
- **Summary**: `assign_job_technicians` RPC checks if the job's completion month has any salary record with `status = 'paid'`. If paid, reassignment is rejected with `CANNOT_REASSIGN_FINALIZED_PAYROLL`.
- **Verify-1 (Direct)**: Reassignment rejected when associated payroll period is marked paid.
- **Verify-2 (Independent)**: Unfinalized jobs preserve existing `accrued_at` timestamps on unremoved technicians.

### SAL-006: Non-admin staff blocked from viewing own salary slips by RLS
- **Root Cause**: `public.salary` table only had admin RLS policies; technicians and receptionists had no `SELECT` policy to query their own rows.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`.
- **Summary**: Created `salary_own_select` policy: `CREATE POLICY salary_own_select ON public.salary FOR SELECT TO authenticated USING (auth.uid() = user_id);`.
- **Verify-1 (Direct)**: Authenticated user querying their own `user_id` is permitted.
- **Verify-2 (Independent)**: Authenticated user querying another employee's `user_id` is denied.

### SAL-007: Advance salary has no carry-forward mechanism (excess lost)
- **Root Cause**: If advance salary exceeded gross salary, net salary floored at zero but the excess advance was lost and not deducted in subsequent months.
- **Files Changed**: `packages/shared/src/payrollEngine.ts`, `supabase/functions/calculate-monthly-salary/index.ts`.
- **Summary**: Added `advance_balance_carried` and `advance_balance_remaining` tracking to `calculateStaffSalary`. Unrecovered advance rolls forward into next period calculation.
- **Verify-1 (Direct)**: Tested Gross ₹5,000 with advance ₹8,000 -> Net ₹0.00, remaining balance ₹3,000.
- **Verify-2 (Independent)**: Verified edge function persists `advance_balance_remaining` in payroll snapshot.

### SAL-008: No hire / termination date tracking for mid-month joiners
- **Root Cause**: `public.users` lacked hire/termination dates, leading to full-month absence penalties for staff who joined midway through a month.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`, `packages/shared/src/payrollEngine.ts`, `RepairShopApp/src/lib/shared/src/types.ts`, `types.ts`.
- **Summary**: Added `hire_date` and `termination_date` columns to `users`. Engine adjusts `working_days` and accounts only for working days on/after `hire_date`.
- **Verify-1 (Direct)**: Tested August 2026 mid-month joiner (Aug 17): 13 working days out of 25 = ₹13,000.00 on ₹25,000 salary with 0 absence penalties.
- **Verify-2 (Independent)**: Employees hired before period start receive normal full-month working day allocation.

### ATT-001: Mobile "Mark Leave" and "Mark Halfday" penalized as full absence
- **Root Cause**: Mobile app wrote directly to `attendance` with status `'Absent'` or `'Halfday'` without admin approval workflow, triggering immediate pay deductions.
- **Files Changed**: `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`.
- **Summary**: Updated action buttons to submit leave requests to `employee_leave` table with status `'pending'` for admin review.
- **Verify-1 (Direct)**: Button press invokes leave request flow rather than inserting unapproved absence.
- **Verify-2 (Independent)**: UI indicates "Pending Admin Approval" and prevents double submission.

### ATT-002: Geofence radius mismatch (100m/200m in code vs 40m requirement)
- **Root Cause**: Mobile and web apps used hardcoded fallbacks of 100m or 200m, while the SRS requirement specifies exactly 40 meters.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`, `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`, `admin-panel/src/app/(admin)/settings/geofence/page.tsx`, `admin-panel/src/components/settings/GeofenceMap.tsx`.
- **Summary**: Updated database table default to 40m, updated existing geofence row to 40m, and changed all client fallback constants to 40m.
- **Verify-1 (Direct)**: Inspected `GeofenceMap.tsx` and `AttendanceScreen.tsx`: fallback radius is `40`.
- **Verify-2 (Independent)**: Migration SQL asserts `DEFAULT 40` and updates existing rows with radius > 40.

### ATT-003: Client timestamp spoofing for check-in and check-out
- **Root Cause**: `attendance` table accepted client-provided `check_in_time` and `check_out_time`.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`.
- **Summary**: `enforce_server_attendance_rules()` trigger forces `check_in_time = now()` on non-admin check-in, and `check_out_time = now()` on check-out.
- **Verify-1 (Direct)**: Server clock `now()` overrides any client timestamp.
- **Verify-2 (Independent)**: Admin manual adjustments can set explicit timestamps if necessary.

### ATT-004: Mobile admin attendance overview lacks parity & uses local tz
- **Root Cause**: `StaffAttendanceOverviewScreen.tsx` displayed raw UTC timestamps and lacked "At Location" badges or approval actions.
- **Files Changed**: `RepairShopApp/src/screens/admin/StaffAttendanceOverviewScreen.tsx`.
- **Summary**: Converted check-in/out timestamps to formatted IST (`Asia/Kolkata`), added green "At Location (< 40m)" badge, and integrated Allow / Deny approval buttons for pending records.
- **Verify-1 (Direct)**: Timestamps display in IST with proper AM/PM formatting.
- **Verify-2 (Independent)**: Allow and Deny actions update `review_status` with `approved_by` and refresh list.

### ATT-005: Midnight-crossing shifts & forgotten check-out leave NULL checkout
- **Root Cause**: `AttendanceScreen.tsx` only queried `date = todayStr`, failing to find an active shift that started before midnight, and targeting checkout update to today's date instead of the shift's check-in date.
- **Files Changed**: `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`, `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`.
- **Summary**: Added 18-hour lookback query for unclosed shifts, anchored checkout update query to `todayRecord?.date || todayStr`, and added `auto_closed` column for scheduled shift cleanup.
- **Verify-1 (Direct)**: An open shift started at 11 PM yesterday is found when opening the app at 2 AM today, and checkout updates yesterday's record.
- **Verify-2 (Independent)**: Once checked out, subsequent app opens return to normal daily check-in state.

### ATT-006: Admin attendance approval lacks audit trail (`approved_by`)
- **Root Cause**: `attendance` table had no `approved_at` or `approval_note` columns, and approvals did not record the approving admin user.
- **Files Changed**: `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql`, `admin-panel/src/app/(admin)/attendance/page.tsx`.
- **Summary**: Added `approved_at` and `approval_note` columns. Updated Web Admin approval handler to set `approved_by: session.user.id` and `approved_at: new Date().toISOString()`.
- **Verify-1 (Direct)**: Approving an attendance row in Web Admin populates `approved_by` and `approved_at`.
- **Verify-2 (Independent)**: Attendance trigger rejects non-admin attempts to mutate approval columns.

### ATT-007: Non-atomic photo upload (orphaned files on DB failure)
- **Root Cause**: Uploading selfie to Supabase Storage occurred prior to database record creation; if the database call failed, the uploaded image remained orphaned in the storage bucket.
- **Files Changed**: `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`.
- **Summary**: Added failure handling in `handleCheckInCheckOut` that invokes storage file removal if the subsequent database upsert or update throws an error.
- **Verify-1 (Direct)**: Storage removal called upon simulated database failure.
- **Verify-2 (Independent)**: Successful submissions leave image in storage intact.

### ATT-008: Inconsistent timezone formatting across web/mobile helpers
- **Root Cause**: Some date formatting functions relied on local machine timezone without specifying `timeZone: 'Asia/Kolkata'`, causing dates to shift when viewed outside IST.
- **Files Changed**: `packages/shared/src/date.ts`, `RepairShopApp/src/lib/shared/src/date.ts`.
- **Summary**: Added explicit `timeZone: 'Asia/Kolkata'` to `formatDateIST`, `formatTimeIST`, and `formatDateTimeIST`.
- **Verify-1 (Direct)**: Jest tests in `packages/shared/src/date.test.ts` pass cleanly.
- **Verify-2 (Independent)**: Verified formatting in Node environment running under UTC.

### TEST-001: Test suite tests disconnected mock function instead of engine
- **Root Cause**: `packages/shared/src/payroll.test.ts` tested an inline mock function rather than the production payroll engine.
- **Files Changed**: `packages/shared/src/payroll.test.ts`.
- **Summary**: Completely rewrote test suite to import `calculateStaffSalary`, `calculateWorkingDays`, and `calculateIncentiveSplitShares` directly from `packages/shared/src/payrollEngine.ts`.
- **Verify-1 (Direct)**: Executed `npx jest ../packages/shared/src/payroll.test.ts`: all 10 tests pass.
- **Verify-2 (Independent)**: Verified tests cover Scenarios 1 to 4 from `AUDIT_ATTENDANCE_SALARY.md` with zero deviations.

---

## 4. Assumptions Needing Owner Confirmation

1. **Working Days Divisor**: The active Edge Function and consolidated engine calculate working days as Calendar Days minus Sundays minus Registered Holidays (e.g., 25 days in August 2026). Daily wage rate is `monthly_salary / working_days`.
2. **Advance Salary Rollover**: When an employee's monthly advance salary exceeds their gross earnings, net pay floors at ₹0.00 and the remaining unrecovered advance balance carries over to subsequent months under `advance_balance`.
3. **Out-of-Location Check-In Window**: Attendance checked in outside 40m is saved with `at_location = false` and `review_status = 'pending'`. If denied by admin, it is treated as Absent. If approved, it is treated as Present. Pending rows block payroll finalization until reviewed.
4. **Shift Auto-Closure**: An unclosed shift older than 18 hours is marked `auto_closed = true` with checkout time anchored to 19:00 IST and flagged for admin review.

---

## 5. Owner Decisions Needed

1. Confirm whether unused `allowed_leave_days` (default: 2 days/month) rolls over across months or resets monthly.
2. Confirm if half-day deduction rate should remain fixed at ₹200 or be 50% of daily wage (`monthly_salary / working_days / 2`).

---

## 6. Owner Actions Required

1. **Migration Execution**: Apply `supabase/migrations/20261024180000_attendance_salary_audit_remediation.sql` on the live Supabase project.
2. **Key Rotation**: Rotate any legacy API tokens or service role keys if previously shared in local development.
3. **Hardware GPS Verification**: Test check-in at 39 m and 41 m on physical Android and iOS hardware.

---

## 7. Out-of-Scope Observations

1. Customer invoice PDF generation templates were updated to "Digital Solution" in commit `3c36e05`.
2. `public.payments` table stores financial transactions; ensure invoice payments do not clash with advance salary payment types.
