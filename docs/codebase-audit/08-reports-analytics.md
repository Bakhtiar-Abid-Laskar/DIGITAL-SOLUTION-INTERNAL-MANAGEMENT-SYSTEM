# Module 08: Operational Reporting & Business Analytics

**Module:** Workshop Performance Metrics, Revenue Accounting, Technician Leaderboards, Customer Repair Histories & Automated Monthly Archival  
**Surfaces Covered:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Tier (`packages/shared`), Database & Edge Functions (`supabase`)  
**Status:** Audit Complete — Read-and-Document Only

---

## 1. Module Overview & Lifecycle Map

The **Reports & Analytics** module synthesizes data across repair jobs, retail counter sales, parts consumption, and technician throughput into actionable operational insights. It drives the Web Executive Dashboard, mobile administrative KPI screens, technician performance rankings, and automated end-of-month Google Drive report exports.

```text
[Operational Source Tables]
(jobs, invoices, sales, job_materials, attendance)
        │
        ├── Realtime Event Aggregation
        │       │
        │       ├── [admin-panel: Dashboard] (/admin) ──► Total Revenue, Active Jobs, Low Stock Items
        │       ├── [admin-panel: Reports] (/reports)  ──► Monthly Parts vs Labour Margins, Tech Leaderboard
        │       ├── [RepairShopApp: Admin Reports]   ──► Month-by-month Volume & Gross Revenue
        │       └── [RepairShopApp: Tech Analytics]  ──► Individual Technician Completed Jobs & Commissions
        │
        ▼
[End-of-Month Automated Export Pipeline]
        │
        ├── Triggered by pg_cron (1st of every month) or manual Admin trigger
        │
        ▼
[Supabase Edge Functions]
        │
        ├── [export-monthly-data]       ──► Archives full operational JSON/CSV snapshot to Drive
        ├── [export-attendance-reports] ──► Generates per-staff .xlsx attendance workbooks
        └── [export-customer-ledger]    ──► Generates double-entry customer statement sheets
        │
        ▼
[Google Drive Storage Directory]
Invoices/{YYYY}/{MM}/  |  Attendance Report/{YYYY}/{Month}/  |  Monthly Backups/{YYYY}/
```

---

## 2. Web Admin Panel (`admin-panel`)

### `admin-panel/src/app/(admin)/page.tsx`
- **Purpose:** Central executive command dashboard. Renders high-level key performance indicators (Total Revenue, Active Repairs, Pending Deliveries, Low Stock Alerts), graphical revenue charts, technician workload distribution, and quick action launchpads.
- **Key Exports:**
  - `default function AdminDashboardPage()`: Executive overview page component.
- **Inputs & Outputs:**
  - Props: None (App Router Page).
  - Output: Responsive multi-card dashboard with Recharts visualizations, dynamic status breakdown, and recent activity feeds.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/components/common/*` (`PageHeader`, `StatCard`, `Card`, `Badge`), `@/components/dashboard/*` (`RevenueChart`, `TechPerformanceChart`, `JobStatusDonut`), `@/utils/formatDate`.
  - External: `@repairshop/shared` (`formatCurrency`), `lucide-react`, `recharts`.
  - Database: Queries `jobs`, `invoices`, `inventory`, `users`.
- **Side Effects:**
  - Realtime subscriptions to `jobs` and `invoices`.
- **Callers:**
  - Next.js root route for administrators: `/`.

---

### `admin-panel/src/app/(admin)/reports/page.tsx`
- **Purpose:** Comprehensive reporting console with four analytical tabs:
  1. `tech`: Technician Performance Chart (repaired unit volume per technician).
  2. `revenue`: Financial analysis breaking down revenue into parts, labor, and GST taxes.
  3. `customer`: Searchable customer repair history timeline.
  4. `drive`: Cloud backup and export status monitoring.
- **Key Exports:**
  - `default function ReportsPage()`: Reports dashboard.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`PageHeader`, `StatCard`, `Tabs`, `Pagination`, `DataTableSkeleton`), `@/components/dashboard/*` (`TechPerformanceChart`, `RevenueChart`), `@/utils/formatDate`.
  - External: `@repairshop/shared` (`formatCurrency`, `useDebounceValue`), `lucide-react`.
  - Database: Queries `jobs`, `invoices`, `sales`, `users`. Calls Edge Functions `export-monthly-data` and `export-attendance-reports`.
- **Side Effects:**
  - Triggers asynchronous Edge Function runs for Google Drive report generation.
- **Callers:**
  - Next.js route: `/reports`.

---

## 3. Mobile Application (`RepairShopApp`)

### `RepairShopApp/src/screens/admin/ReportsScreen.tsx`
- **Purpose:** Mobile reporting console for workshop owners. Displays monthly job volume counts (`Received`, `In Progress`, `Completed`), gross revenue totals, and technician performance rankings.
- **Key Exports:**
  - `default function ReportsScreen()`: Mobile reporting screen.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/tokens`, `@/components/common/*` (`AppHeader`, `BottomSheet`, `SkeletonList`).
  - External: `@repairshop/shared` (`formatCurrency`), `lucide-react-native`.
  - Database: Queries `jobs`, `invoices`, `sales`.
- **Callers:**
  - Admin Tab Navigator.

---

### `RepairShopApp/src/screens/technician/TechnicianReportsScreen.tsx`
- **Purpose:** Technician-facing performance dashboard allowing technicians to monitor their personal repair achievements, jobs completed in the active month, and earned repair commissions.
- **Key Exports:**
  - `default function TechnicianReportsScreen()`: Screen component.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/tokens`, `@/components/common/*` (`AppHeader`, `EmptyState`).
  - External: `@repairshop/shared` (`formatCurrency`), `lucide-react-native`.
  - Database: Queries `jobs` where `technician_id = auth.uid()` and status is `Completed`.
- **Callers:**
  - Technician Tab Navigator.

---

## 4. Shared Utilities & Domain Tier (`packages/shared`)

### Shared Metrics Calculations
- Currency formatting via `formatCurrency` enforcing Indian numbering grouping (`₹1,23,456.00`).
- Date interval builders converting `YYYY-MM` into strict ISO timestamp ranges (`YYYY-MM-01T00:00:00.000Z` to next month 1st).

---

## 5. Database Schema, RPCs & Edge Functions (`supabase`)

### Stored Database Views & Functions

1. Real-time Status Aggregations:
   - Evaluated dynamically across `public.jobs`, `public.invoices`, and `public.sales`.
   - Indexed via `idx_jobs_completed_at`, `idx_invoices_created_at`, `idx_invoices_pending_balance`.

---

### Supabase Edge Functions

1. `supabase/functions/export-monthly-data/index.ts`
   - **Trigger:** Scheduled monthly `pg_cron` job (1st of month at 00:01 AM) or manual admin trigger.
   - **Purpose:** Extracts monthly financial, job, and parts records, formats into structured Excel sheets, and uploads to Google Drive under `Monthly Backups/{YYYY}/`.
   - **Authentication:** Admin role or service role key.

2. `supabase/functions/export-attendance-reports/index.ts`
   - **Trigger:** Scheduled monthly `pg_cron` (1st of month at 00:30 AM).
   - **Purpose:** Generates individual attendance workbooks for every staff member and stores under `Attendance Report/{year}/{month}/`.

3. `supabase/functions/export-customer-ledger/index.ts`
   - **Trigger:** On-demand HTTP POST with `customer_id`.
   - **Purpose:** Produces customer financial statement sheets for accounts receivable dispute resolution.

---

## 6. Module Findings & Technical Debt Log (Reports & Analytics)

| ID | File / Location | Severity | Category | Description |
|---|---|---|---|---|
| **F-REP-01** | `admin-panel/src/app/(admin)/reports/page.tsx:76-82` | **MEDIUM** | Unbounded Query | Fetching technician performance retrieves all raw job rows for the month and computes counts in client JavaScript memory. For high-volume shops, this should be executed via a database aggregate query (`GROUP BY technician_id`). |
| **F-REP-02** | `RepairShopApp/src/screens/admin/ReportsScreen.tsx:88-100` | **LOW** | Dual Revenue Queries | Screen queries both `invoices` and legacy `sales` tables to compute monthly revenue totals. Since new counter sales are recorded in `invoices`, this dual query includes redundant rows. |
| **F-REP-03** | `supabase/functions/export-monthly-data/index.ts` | **LOW** | Service Account Quota | Sequential upload of multiple heavy Excel workbooks can occasionally hit Google Drive API rate limits if multiple administrators trigger simultaneous manual exports. |
