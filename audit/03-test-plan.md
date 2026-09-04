# Phase 3: Comprehensive Test Plan & Matrix

**Matrix Scope:** All Screens, API Endpoints, Edge Functions, Business Logic Modules, and Database Operations.  
**Test Categories:** Unit (`U`), Integration (`I`), E2E / UI (`E`), Contract (`C`), Database (`DB`), Security (`S`), Performance (`P`).

---

## 1. Master Test Plan Matrix

| Item / Target | Test Type(s) | Happy Path Scenario | Edge Cases | Error Cases | Auth / Security Cases | Priority |
|---|---|---|---|---|---|---|
| **Billing Calculation Engine** (`@repairshop/shared/billing.ts`) | `U` | Calculate grand total from parts, labour, tax %, and discount | `tax_percent = 0`, `discount > subtotal` (floored to 0), decimal values, zero labour charge | Negative parts total, non-numeric strings, NaN values | Public pure function (no auth required) | **P0 (Critical)** |
| **Phone Normalization** (`@repairshop/shared/phone.ts`) | `U` | 10-digit Indian mobile `9876543210` -> `+919876543210` | Number with spaces `98765 43210`, hyphenated `98765-43210`, leading zero `09876543210`, existing `+91` | Empty string, letters in phone, < 10 digits, invalid country prefix | Public pure function (no auth required) | **P0 (Critical)** |
| **Monthly Payroll Calculation** (`calculate-monthly-salary`) | `U`, `I`, `S` | Calculates monthly salary for active staff: full present days, base daily rate, overtime pay, and advance salary deduction | 28/29/30/31-day months, leap years, collision of attendance with registered holidays, halfdays | Staff with zero attendance, missing `staff_rates` row, negative advance deduction | Calling with Technician/Receptionist JWT -> `403 Forbidden`; unauthenticated -> `401 Unauthorized` | **P0 (Critical)** |
| **Job Code Sequence Generator** (`generate_job_code()`) | `DB`, `I` | Consecutive calls generate monotonically increasing codes `RS-2026-0001`, `RS-2026-0002` | Year rollover transitions (`RS-2026-9999` to `RS-2027-0001`) | Sequence exhaust simulation, transaction rollback recovery | Non-authenticated direct SQL invocation blocked | **P0 (Critical)** |
| **Atomic Stock Deduction Trigger** (`process_job_material_stock()`) | `DB`, `I`, `S` | Adding material to repair job decreases `inventory.quantity` by exact count | Decrementing stock to exactly 0 (triggers low stock threshold alert), modifying quantity on existing material | Requesting quantity > available stock throws explicit PostgreSQL `EXCEPTION` | Direct `UPDATE` to `inventory` blocked for non-admin via RLS | **P0 (Critical)** |
| **Incentive Accrual Triggers** (`accrue_job_incentives()`) | `DB`, `I` | Job status updated to `Completed` -> splits incentive evenly across all active assigned technicians in `job_technicians` | Multi-technician split with odd numbers (decimal rounding), job status toggled `In Progress` -> `Completed` -> `In Progress` (duplicate prevention) | Job with no technician assigned does not fail transaction | Technician cannot insert rows directly into `staff_incentives` (RLS enforced) | **P1 (High)** |
| **Invoice Email Dispatch** (`send-invoice-email`) | `I`, `C`, `S` | Valid `job_id` and customer email sends branded HTML invoice via Resend API | Resending email after 65 seconds succeeds | Triggering multiple requests within 60s returns `429 Rate Limit`; missing `job_id` returns `400` | Unauthenticated invocation blocked; CORS restricts caller to `ADMIN_URL` | **P1 (High)** |
| **Google Drive Monthly Backup** (`export-monthly-data`) | `I`, `C` | Generates multi-sheet Excel file (Jobs, Sales, Inventory) and uploads to Google Drive folder hierarchy | Month with zero jobs/sales generates empty template workbook cleanly | Google Drive API network timeout / 503 triggers retry queuing in `pending_uploads` | Non-admin caller returns `401 Unauthorized` | **P1 (High)** |
| **Attendance Check-in Workflow** (`AttendanceScreen.tsx`) | `E`, `I`, `S` | User snaps selfie inside workshop geofence -> uploads to `attendance-selfies`, captures GPS, upserts `Present` | Check-in exactly at geofence radius boundary, low GPS accuracy device fallback | Denied camera permission, denied GPS location permission | User trying to submit check-in for another staff member's `user_id` -> blocked by RLS | **P0 (Critical)** |
| **Customer Intake & Job Creation** (`CustomerIntakeScreen.tsx`) | `E`, `I` | Receptionist fills customer name, phone, device, issue, selects technician -> creates job & receipt | Auto-attaches `job_type_ref_id` snapshot incentives, auto-formats phone number | Missing customer name or issue shows inline validation error | Non-staff caller blocked by RLS | **P0 (Critical)** |
| **POS Retail Sale & Invoicing** (`admin-panel/src/app/(admin)/sales/new/page.tsx`) | `E`, `I` | Admin adds inventory items, applies 10% discount, completes cash sale -> generates invoice & deducts stock | Multi-item cart with 50+ lines, mixed tax rates, zero discount | Adding item with quantity > available inventory alerts user and prevents submit | Technician JWT cannot create retail sale (RLS blocked) | **P1 (High)** |
| **Technician Work Update & Photo Log** (`UpdateWorkScreen.tsx`, `OnsiteVisitScreen.tsx`) | `E`, `I` | Technician updates job status `Received` -> `In Progress` -> `Completed`, logs used parts | Adding multiple spare parts in single session, uploading arrival + departure onsite selfies | Network disconnect during photo upload queues in local state/retry worker | Technician trying to update a job assigned to a different technician -> blocked by RLS | **P0 (Critical)** |
| **Geofence Workshop Settings** (`admin-panel/src/app/(admin)/settings/geofence/page.tsx`) | `E`, `I` | Admin drags map marker to set workshop GPS lat/lng and 50m radius -> saves to `geofence_settings` | Extreme coordinates (-90/+90 lat, -180/+180 lng), radius = 10m to 5000m | Negative radius input validation | Non-admin role blocked from writing to `geofence_settings` | **P2 (Medium)** |
| **User Activation / Deactivation** (`admin-panel/src/app/(admin)/staff/page.tsx`) | `E`, `I`, `S` | Admin toggles staff `is_active` to `false` -> staff member blocked immediately across mobile/web | Reactivating previously blocked staff member restores access seamlessly | Attempting to delete or deactivate the last remaining admin user is rejected | Only admin can toggle `is_active`; blocked user's active session is rejected by RLS | **P0 (Critical)** |
| **Multi-Technician Job Assignment** (`job_technicians`) | `I`, `DB` | Admin assigns 3 technicians to single large server repair job | Removing one technician sets `removed_at`, preserving historical audit | Assigning same technician twice fails unique constraint `(job_id, technician_id)` | Technician can only view their own assignments | **P1 (High)** |
| **Database Migrations & RLS Integrity** (`supabase/migrations/`) | `DB`, `S` | All 36+ migrations execute idempotently from clean state without syntax errors | Rollback and forward migration application | Circular dependency detection between `users` and `jobs` | RLS enabled on 100% of public tables; no security definer view leaks | **P0 (Critical)** |

---

## 2. Implementation & Execution Phases

### Phase 4.1: Database Layer & RLS Tests
- Execute `scripts/rls-smoke-test.ts` against local/staging Supabase instance.
- Verify that **Technician**, **Receptionist**, and **Admin** roles cannot read/write outside their authorized RLS boundaries.
- Verify that stock deduction triggers rollback transactions on insufficient inventory.

### Phase 4.2: Unit Test Suite Expansion
- Expand `packages/shared/src/` unit tests to achieve 100% statement coverage on:
  - `billing.ts` (all formula combinations and zero-flooring).
  - `phone.ts` (all Indian phone formats and edge cases).
  - `date.ts` (working day calculation, holiday subtraction, shift minutes parsing).

### Phase 4.3: Edge Function Integration Tests
- Test Deno Edge Functions with mocked Supabase client and secret environment variables:
  - `calculate-monthly-salary` (multi-scenario payroll matrix).
  - `generate-invoice` (HTML compilation and total calculations).
  - `send-invoice-email` (rate-limiting enforcement and input validation).

### Phase 4.4: Web Admin E2E Playwright Tests
- Automate complete user journeys:
  - Login -> Job Creation -> Assign Technician -> Add Materials -> Invoice Generation.
  - POS Counter Sale -> Add Items -> Complete Payment -> Stock Verification.
  - Leave Management -> Staff submits leave -> Admin approves -> Reflects in Attendance.

### Phase 4.5: Mobile App Manual & Automated Testing Checklist
- Real-device hardware testing (Camera, GPS Location, Push Notifications).
- Verification of offline fallback handling during selfie uploads.
