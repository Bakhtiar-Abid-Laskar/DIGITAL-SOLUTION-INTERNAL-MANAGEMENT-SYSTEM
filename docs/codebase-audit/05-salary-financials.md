# Module 05: Payroll, Advance Salary & Financial Management

**Module:** Monthly Payroll Computation, Staff Compensation Rates, Advance Salary Deductions, Leave Approvals, Performance Bonuses & Operating Expenditures  
**Surfaces Covered:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Tier (`packages/shared`), Database & Edge Functions (`supabase`)  
**Status:** Audit Complete — Read-and-Document Only

---

## 1. Module Overview & Lifecycle Map

The **Salary & Financials** module governs workforce compensation, advance disbursement, attendance-linked penalties/deductions, performance incentives, and workshop operating expenditures. It isolates staff financial records from unauthorized access, executes all compensation calculations within a secure server-side Edge Function (`calculate-monthly-salary`), tracks advance loans against monthly earnings, logs operating expenses into distinct accounting categories, and provides printable salary payslips.

```text
[Compensation Configuration]
        │
        ├── [StaffRateForm] ──────► [public.staff_rates]
        │                           (monthly_salary, allowed_leave_days, absent_day_deduction,
        │                            penalty_tier1_amount, penalty_tier2_amount, ot_rate_per_hour)
        ├── [AdvanceSalaryForm] ──► [public.payments (type = 'advance_salary')]
        ├── [BonusForm] ──────────► [public.payments (type = 'bonus')]
        └── [HolidayCalendarForm] ─► [public.holidays] (Excluded from working day counts)
        │
        ▼
[Monthly Payroll Calculation]
        │ (Initiated via PayrollRunPanel or SalaryCalculatorForm)
        ▼
[Supabase Edge Function: calculate-monthly-salary]
        │ (Service Role Security)
        ├── 1. Role Guard: Admin executes 'calculate'/'mark_paid'; Staff can only 'preview' own ID
        ├── 2. Fetches [public.staff_rates] for targeted staff member
        ├── 3. Fetches Approved Leaves from [public.employee_leave]
        ├── 4. Fetches Calendar Holidays from [public.holidays] to calculate net working days
        ├── 5. Aggregates [public.attendance] (Present days, halfdays, late minutes, early minutes)
        ├── 6. Aggregates [public.job_types] completed by technician for technician incentives
        ├── 7. Deducts unapproved absences, late arrivals (>15m tier 1, >45m tier 2), and halfdays
        ├── 8. Deducts disbursed advance payments from [public.payments] for month
        ▼
[Payroll Commit & Ledger]
        │
        ├── Upserts into [public.salary] (status = 'draft' | 'paid', net_salary, breakdown JSON)
        └── Writes to [public.salary_audit_log] (Immutable record of who computed/modified)
        │
        ▼
[Disbursement & Payslips]
        │
        ├── Admin marks paid ──► updates salary.status = 'paid', logs payment in [public.payments]
        ├── Staff Payslip ─────► HTML slip rendered in Web / Mobile Expo Print (PDF download)
        └── Push Alert ────────► Dispatched to employee device upon salary mark_paid
```

---

## 2. Web Admin Panel (`admin-panel`)

### `admin-panel/src/app/(admin)/salary/page.tsx`
- **Purpose:** Primary administrative workspace for workforce compensation management. Houses tabs for monthly payroll runs, single-staff salary calculators, compensation rate settings, advance salary disbursements, performance bonuses, leave request management, and holiday calendars.
- **Key Exports:**
  - `default function SalaryPage()`: Salary management console.
- **Inputs & Outputs:**
  - Props: None (App Router Page).
  - Output: Tabbed interface (`payroll`, `calculate`, `rates`, `advance`, `bonus`, `leaves`, `holidays`). Includes full-page access denial guard for non-administrators.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/components/common/*` (`PageHeader`, `Tabs`, `EmptyState`, `TableSkeleton`, `CardSkeleton`), `@/components/salary/*` (`PayrollRunPanel`, `SalaryCalculatorForm`, `SalaryBreakdownCard`, `StaffRateForm`, `AdvanceSalaryForm`, `BonusForm`, `LeaveManagement`, `HolidayCalendarForm`).
  - External: `@repairshop/shared` (`User`), `lucide-react`.
  - Database: Queries `users` where `role = 'admin'` is required to access data.
- **Side Effects:**
  - Subscribes to Supabase Realtime channel `salary-users-realtime` on table `users`.
- **Callers:**
  - Next.js route: `/salary`.
- **Observations / Debt:**
  - Strict Role Enforcement: Hardcoded boundary prevents Receptionists or Technicians from viewing salary tabs even if URL is typed directly into the browser.

---

### `admin-panel/src/components/salary/PayrollRunPanel.tsx`
- **Purpose:** Batch payroll run console allowing administrators to review, generate, and mark paid monthly compensation for the entire workshop team in one unified screen.
- **Key Exports:**
  - `default function PayrollRunPanel({ staff }: Props)`: Payroll batch run component.
- **Inputs & Outputs:**
  - Props: `staff: User[]`: List of active workshop employees.
  - Output: Month picker, aggregate batch statistics, and staff list with status tags (`Not Generated`, `Draft`, `Paid`), net salary amounts, individual generate buttons, and "Mark Paid" actions.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/styles/salary.module.css`.
  - External: `@repairshop/shared` (`formatCurrency`, `User`), `lucide-react`.
  - Database: Calls Edge Function `calculate-monthly-salary` with `{ action: 'calculate' | 'mark_paid', user_id, month }`.
- **Side Effects:**
  - Triggers asynchronous Edge Function invocations for each staff member.
  - Updates `public.salary` rows to status `'paid'`.
- **Callers:**
  - Embedded inside `admin-panel/src/app/(admin)/salary/page.tsx`.
- **Observations / Debt:**
  - Individual Execution Loops: When generating payroll for all staff, the component fires sequential or individual HTTP requests to `calculate-monthly-salary` rather than calling a bulk payroll RPC, which increases processing time as staff size grows.

---

### `admin-panel/src/app/(admin)/expenditure/page.tsx`
- **Purpose:** Central operational expenditure tracking dashboard. Logs workshop operating expenses (`materials_purchase`, `daily_expenditure`, `office_development`, `staff_salary`), computes monthly totals, and exports accounting reports.
- **Key Exports:**
  - `default function ExpenditurePage()`: Operational expenditure dashboard.
- **Inputs & Outputs:**
  - Props: None.
  - Output: Month selector, type filter, expense summary cards, expense registration form modal, paginated expense table, and Excel XLSX export button.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/components/common/*` (`PageHeader`, `SearchFilterBar`, `Button`, `DataTableSkeleton`, `EmptyState`), `@/components/expenditure/*` (`ExpenditureForm`, `ExpenditureTable`, `ExpenditureSummaryCards`), `@/utils/formatDate`.
  - External: `lucide-react`, `exceljs` (via dynamic export helper).
  - Database: Queries and mutates `public.payments` where `type` is in operational expenditure categories.
- **Callers:**
  - Next.js route: `/expenditure`.
- **Observations / Debt:**
  - Polymorphic Payments Table: Expenditures are stored within `public.payments` alongside customer invoice payments and advance staff salaries, differentiated by the `type` column.

---

## 3. Mobile Application (`RepairShopApp`)

### `RepairShopApp/src/screens/admin/SalaryScreen.tsx`
- **Purpose:** Mobile administrative salary dashboard allowing workshop owners to calculate and view staff monthly salaries, review compensation breakdowns, and mark salaries paid from mobile devices.
- **Key Exports:**
  - `default function SalaryScreen()`: Admin salary screen.
- **Inputs & Outputs:**
  - Props: None (Admin Stack).
  - Output: Month selector bottom sheet, staff selector list, detailed compensation card with itemized earnings and deductions, and "Mark Paid" trigger.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/tokens`, `@/components/common/*` (`AppHeader`, `AppPressable`, `BottomSheet`, `Button`, `EmptyState`, `SkeletonList`), `@/context/ToastContext`.
  - External: `@repairshop/shared` (`formatCurrency`), `lucide-react-native`.
  - Database: Calls Edge Function `calculate-monthly-salary`. Queries `users`.
- **Callers:**
  - Admin Navigation: Accessible via Admin Overview financial widgets.

---

### `RepairShopApp/src/screens/shared/SalaryScreen.tsx`
- **Purpose:** Staff-facing personal compensation portal (shared across Technicians and Receptionists). Allows employees to preview their own monthly earnings simulation, view attendance statistics, apply for leaves, and export/print their salary payslip.
- **Key Exports:**
  - `default function SalaryScreen()`: Personal staff salary portal.
- **Inputs & Outputs:**
  - Props: None (Shared Stack).
  - Output: Month selector, Salary Hero Card (Net Pay display), Itemized Earnings & Deductions breakdown card, Attendance summary (Present, Halfday, Absent, OT hours), Leave Application card, and Print Slip button.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/tokens`, `@/components/common/*` (`AppHeader`, `AppPressable`), `@/components/salary/*` (`SalaryRatesCard`, `SalaryHeroCard`, `SalaryBreakdownCard`, `SalaryAttendanceSummary`, `LeaveApplicationCard`, `LeaveHistoryList`, `SalaryHistoryList`).
  - External: `expo-print`, `expo-file-system/legacy`, `lucide-react-native`.
  - Database: Calls Edge Function `calculate-monthly-salary` with `{ action: 'preview', user_id: auth.uid() }`. Inserts leave requests into `public.employee_leave`.
- **Side Effects:**
  - Generates PDF payslip via `expo-print` and saves to local file system.
- **Callers:**
  - Shared Tab Navigation: Bottom navigation tab for Technicians and Receptionists.
- **Observations / Debt:**
  - Zero Sensitive Data Leakage: Staff member can only pass their own `user.id`. The Edge Function verifies caller JWT and rejects attempts by non-admins to preview another employee's salary.

---

### `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx`
- **Purpose:** Mobile administrative expense logging screen. Allows shop owners to record quick out-of-pocket expenses (tea/coffee, tool repairs, delivery courier fees, shop rent) with photo receipt capture.
- **Key Exports:**
  - `default function ExpenditureScreen()`: Screen component.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/tokens`, `@/components/common/*` (`AppHeader`, `AppPressable`, `Button`, `EmptyState`), `@/utils/compressImage`.
  - Database: Inserts into `public.payments` with `type = 'daily_expenditure'` or related categories.

---

## 4. Shared Utilities & Domain Tier (`packages/shared`)

### `packages/shared/src/incentive.ts`
- **Purpose:** Mathematical helper computing technician repair incentives based on catalog job types completed during the billing month.
- **Key Exports:**
  - `export function calculateTechnicianIncentive(completedJobs)`: Iterates over jobs and job types to calculate total accrued commission.
- **Callers:**
  - `calculate-monthly-salary` Edge Function and web compensation breakdown cards.

---

## 5. Database Schema, RPCs & Edge Functions (`supabase`)

### Database Tables (`public`)

| Table Name | Key Columns & Types | Referenced By | Permitted Operations |
|---|---|---|---|
| `public.salary` | `id` (uuid, PK), `user_id` (uuid, FK users), `month` (date), `monthly_salary_base` (numeric), `bonus_amount` (numeric), `incentive_amount` (numeric), `overtime_pay` (numeric), `gross_salary` (numeric), `late_deduction` (numeric), `early_deduction` (numeric), `leave_deduction` (numeric), `halfday_deduction_total` (numeric), `absence_deduction_total` (numeric), `advance_deducted` (numeric), `net_salary` (numeric), `status` (text: 'draft'/'paid'), `paid_at` (timestamptz), `breakdown` (jsonb). | `PayrollRunPanel.tsx`, `SalaryScreen.tsx`, `calculate-monthly-salary`. | SELECT, INSERT, UPDATE (Admin & Service Role only) |
| `public.staff_rates` | `id` (uuid, PK), `user_id` (uuid, FK users, UNIQUE), `monthly_salary` (numeric), `base_pay` (numeric), `allowed_leave_days` (numeric), `absent_day_deduction` (numeric), `halfday_deduction` (numeric), `penalty_tier1_amount` (numeric), `penalty_tier2_amount` (numeric), `ot_rate_per_hour` (numeric), `early_deduction_per_hour` (numeric). | `StaffRateForm.tsx`, `calculate-monthly-salary`. | SELECT, INSERT, UPDATE (Admin only) |
| `public.payments` | `id` (uuid, PK), `user_id` (uuid, FK users, nullable), `invoice_id` (uuid, FK invoices, nullable), `type` (text: 'advance_salary'/'staff_salary'/'bonus'/'materials_purchase'/'daily_expenditure'/'office_development'/'customer_payment'), `amount` (numeric), `payment_method` (text), `description` (text), `month` (date), `created_by` (uuid, FK users). | `AdvanceSalaryForm.tsx`, `BonusForm.tsx`, `ExpenditurePage.tsx`, `calculate-monthly-salary`. | SELECT, INSERT, UPDATE, DELETE (Admin & Receptionist according to type) |
| `public.salary_audit_log` | `id` (uuid, PK), `salary_id` (uuid, FK salary), `action` (text: 'payroll_calculated'/'payroll_marked_paid'), `user_id` (uuid, FK users), `performed_by` (uuid, FK users), `details` (jsonb), `created_at` (timestamptz). | `calculate-monthly-salary`. | SELECT, INSERT |

---

### Supabase Edge Functions

1. `supabase/functions/calculate-monthly-salary/index.ts`
   - **Trigger:** Authenticated HTTP POST request from Web Admin or Mobile clients.
   - **Purpose:** Master payroll calculation and disbursement engine. Resolves staff compensation rates, calculates working days (excluding holidays), tallies attendance records, applies absence and late arrival penalties, calculates technician incentives from completed repair jobs, computes overtime, deducts advance loans, and persists the final compensation record to `public.salary`.
   - **Authentication:** Enforces role-based permissions:
     - `caller.role === 'admin'`: Permitted to execute `action = 'calculate'` and `action = 'mark_paid'` for any staff member.
     - `caller.role !== 'admin'`: Strictly restricted to `action = 'preview'` where `user_id === callerUser.id`. Rejects any attempt to mutate records or inspect other employees' payroll.
   - **Auditability:** Writes execution metadata to `public.salary_audit_log` for every calculation and payment status change.

2. `supabase/functions/notify-on-finance-event/index.ts`
   - **Trigger:** Webhook on `INSERT` to table `payments`.
   - **Purpose:** Dispatches push notifications to staff devices when advance salaries, bonuses, or monthly salary payouts are logged.

---

## 6. Module Findings & Technical Debt Log (Salary & Financials)

| ID | File / Location | Severity | Category | Description |
|---|---|---|---|---|
| **F-SAL-01** | `supabase/functions/calculate-monthly-salary/index.ts:213-229` | **HIGH** | Attendance Status Disconnect | Payroll engine fetches all attendance records where `status = 'Present'` without inspecting `review_status = 'approved'`. If an administrator rejects an out-of-bounds or weak-GPS check-in on the Attendance page, the employee still receives full working-day pay for that day. |
| **F-SAL-02** | `admin-panel/src/components/salary/PayrollRunPanel.tsx:135-150` | **MEDIUM** | Sequential Processing | Generating monthly payroll for all staff executes client-side iterative HTTP requests to the Edge Function. For workshops with larger teams, this introduces network latency and risks partial batch generation if the user navigates away. |
| **F-SAL-03** | `supabase/migrations/20260821000000_salary_engine_schema_fixes.sql` | **LOW** | Legacy Column Vestige | `staff_rates` contains both `monthly_salary` and `base_pay`. The Edge Function falls back from `monthly_salary` to `base_pay`, reflecting historical transition from daily wage to fixed monthly compensation. |
| **F-SAL-04** | `admin-panel/src/app/(admin)/expenditure/page.tsx:51` | **LOW** | Polymorphic Schema Debt | `public.payments` acts as an overloaded polymorphic table storing customer invoice payments, advance loans, bonuses, and operational expenditures. High transaction volume could benefit from separating customer cash receipts from internal expense records. |
| **F-SAL-05** | `RepairShopApp/src/screens/shared/SalaryScreen.tsx:70-85` | **LOW** | Static Styling | Mobile salary payslip generation uses hardcoded inline CSS inside an HTML template string rather than sharing the company CSS design system tokens. |
