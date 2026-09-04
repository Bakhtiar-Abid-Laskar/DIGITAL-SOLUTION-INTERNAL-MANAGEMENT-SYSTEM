# Phase 2: Gap & Risk Assessment

**Evaluation Type:** Full-Stack Vulnerability, Test-Gap & Architecture Risk Audit  
**Classification:** HIGH / MEDIUM / LOW Severity Rankings  

---

## 1. Executive Summary of Risks

| Category | High Severity | Medium Severity | Low Severity | Total |
|---|---|---|---|---|
| **Test Coverage Gaps** | 2 | 2 | 1 | **5** |
| **Security & Auth Boundaries** | 1 | 2 | 1 | **4** |
| **Database & Concurrency** | 1 | 2 | 1 | **4** |
| **Error Handling & Resilience** | 0 | 2 | 1 | **3** |
| **Total Findings** | **4** | **8** | **4** | **16** |

---

## 2. Detailed Risk Assessment Matrix

### 🔴 HIGH SEVERITY RISKS

#### 1. Zero Automated Test Coverage on Critical Financial & Payroll Services
- **Location:** `supabase/functions/calculate-monthly-salary/index.ts`, `admin-panel/src/app/(admin)/salary/page.tsx`
- **Risk:** The monthly payroll calculation executes multi-tiered penalty math (late arrival minutes, early departure minutes, customer review deductions, daily working days formula, Sunday exclusion, holiday calendar matching, advance salary deductions, and incentive accrual). There are **no unit or integration tests** for this complex calculation engine. A minor regression could miscalculate staff paychecks or advance salary deductions.
- **Remediation:** Implement deterministic test suites covering all edge cases (leap years, holiday collision, halfday permutations, negative gross pay protection).

#### 2. Lack of Automated E2E & Integration Tests on Job Intake & POS Invoicing Flows
- **Location:** `RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx`, `admin-panel/src/app/(admin)/sales/new/page.tsx`, `supabase/functions/generate-invoice/`
- **Risk:** Creating repair jobs and POS retail sales triggers multi-table operations (sequence generation, inventory stock deduction triggers, receptionist incentive accrual, and Google Drive upload). These workflows currently have 0% automated test coverage, relying entirely on manual QA.
- **Remediation:** Add Playwright tests for web POS invoicing and unit tests for stock deduction trigger invariants.

#### 3. Unchecked `auth.uid()` in Client-Callable SECURITY DEFINER Mutating RPCs
- **Location:** `add_stock`, `create_product_with_opening_stock` in PostgreSQL
- **Risk:** `SECURITY DEFINER` functions bypass PostgreSQL Row Level Security. While `EXECUTE` grants are now restricted to `authenticated` users, the function bodies themselves must explicitly verify `public.is_admin()` inside their PL/pgSQL logic to prevent any authenticated technician or receptionist from calling `supabase.rpc('add_stock')` via browser DevTools.
- **Remediation:** Enforce internal role assertion (`IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;`) inside all mutating administrative RPC bodies.

#### 4. Concurrent Inventory Stock Depletion Race Conditions
- **Location:** `process_job_material_stock()`, `process_sale_item_stock()` triggers
- **Risk:** When two technicians or counter clerks simultaneously checkout the last remaining unit of an inventory item, row-level locks (`FOR UPDATE`) are implemented in triggers, but client apps lack optimistic concurrency handling, potentially throwing raw database exception popups to users.
- **Remediation:** Wrap stock adjustments in retry handlers with user-friendly "Item out of stock" validation alerts.

---

### 🟡 MEDIUM SEVERITY RISKS

#### 5. Email Rate-Limiting Bound to Job ID Rather Than Global/User IP
- **Location:** `supabase/functions/send-invoice-email/index.ts`
- **Risk:** The 60-second rate limiter checks `notifications` where `job_id = payload.job_id`. If an attacker or malicious user loops over multiple distinct `job_id` values, they could potentially exhaust the Resend API monthly quota.
- **Remediation:** Add per-user / per-minute rate limiting across the entire `send-invoice-email` endpoint.

#### 6. Google Drive Service Account Key Storage & Availability Dependency
- **Location:** `supabase/functions/_shared/googleAuth.ts`
- **Risk:** If Google Drive credentials expire, become rate-limited (Google Drive 429), or the service account hits quota, document generation could fail if not cleanly detached.
- **Current State:** The code implements a non-blocking queue (`pending_uploads`), which is good design, but there is no automated alert when the `pending_uploads` queue exceeds 50 items.
- **Remediation:** Add monitoring alerts when `public.stuck_uploads` count exceeds threshold.

#### 7. Front-End GPS Spoofing Possibility on Attendance Check-in
- **Location:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`
- **Risk:** GPS coordinates (`lat`, `lng`) are obtained via `expo-location` on the client device and sent to the database. A modified mobile client could send fake GPS coordinates.
- **Current State:** The system mitigates this with selfie verification (`check_in_selfie_url`) and `review_status = 'pending'` for out-of-bounds check-ins.
- **Remediation:** Ensure photos cannot be uploaded from camera roll (enforce `camera` source only in Expo ImagePicker).

#### 8. Large Memory Overhead on Monthly Excel Report Generation
- **Location:** `supabase/functions/_shared/exportWorkbook.ts`
- **Risk:** As historical jobs and sales grow into tens of thousands of records, generating all-time or large multi-sheet Excel files entirely in Deno memory can hit Edge Function RAM limits (150MB).
- **Remediation:** Stream rows or enforce strict monthly date partitioning.

#### 9. Absence of Database Connection Pool Load Testing
- **Location:** Supabase PgBouncer / Transaction pooler
- **Risk:** Real-time subscriptions from dozens of active mobile technician clients plus web admin panel charts could exhaust connection pool limits during peak morning check-in spikes.
- **Remediation:** Conduct load testing for concurrent check-ins.

#### 10. Silent Catches & Console-Only Error Logging in React Native Hooks
- **Location:** `RepairShopApp/src/hooks/usePushNotifications.ts`, `RepairShopApp/src/hooks/useRealtimeSubscription.ts`
- **Risk:** Network errors during push token registration or WebSocket disconnects are logged to `console.warn` without bubbling an actionable status to the user.
- **Remediation:** Surface a non-intrusive "Reconnecting to live updates..." toast when WebSocket disconnects.

#### 11. Missing Pagination on Historical Customer Review Queries
- **Location:** `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx`
- **Risk:** Fetches all customer reviews without `LIMIT` or pagination.
- **Remediation:** Apply `.range(0, 20)` pagination.

#### 12. Soft-Deleted / Blocked User Active Token Invalidation Lag
- **Location:** `public.users.is_active`
- **Risk:** When an admin blocks a rogue employee by setting `is_active = false`, their Supabase JWT remains technically valid until expiration (typically 1 hour).
- **Current Mitigation:** RLS checks `is_active = true` on every database query, and Edge Functions verify `is_active`, so data access is immediately blocked despite the valid JWT.
- **Remediation:** Call `supabase.auth.admin.signOut(userId)` in `admin-delete-user` Edge Function.

---

### 🟢 LOW SEVERITY RISKS

#### 13. Hardcoded Default Fallback Coordinates in Geofence Picker
- **Location:** `admin-panel/src/app/(admin)/settings/geofence/page.tsx`
- **Risk:** Fallback coordinates default to workshop center if DB row is empty.
- **Remediation:** Seed `geofence_settings` with workshop coordinates during migration setup.

#### 14. Unused Index Scans on Freshly Initialized Tables
- **Location:** PostgreSQL `idx_scan = 0` on new audit tables
- **Risk:** Minor storage overhead for unused indexes until traffic scales.
- **Remediation:** Handled in migration `20260814000005_drop_duplicate_and_unused_indexes.sql`.

#### 15. Lack of Accessibility Labels on Custom Mobile Icon Buttons
- **Location:** `RepairShopApp/src/components/`
- **Risk:** Screen readers may announce unlabelled icon touchables as generic "Button".
- **Remediation:** Add explicit `accessibilityLabel` to all `<TouchableOpacity>` icon triggers.

#### 16. Inconsistent Date String Formatting Across Admin Views
- **Location:** `admin-panel/src/app/(admin)/reports/page.tsx`
- **Risk:** Some views used `toLocaleDateString()` while others use `formatDate()`.
- **Remediation:** Standardize all timestamp rendering through `@repairshop/shared/date.ts`.
