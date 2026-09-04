# Phase 1.1: Screens, Views & Pages Inventory

This document inventories every UI surface in the mobile app (`RepairShopApp`) and the web admin panel (`admin-panel`), detailing paths, routes, data fetching, actions, authentication requirements, and state ownership.

---

## 1. Mobile App Screens (`RepairShopApp`)

### 1.1 Auth & Shared Screens

| Screen Name | File Path | Route / Stack | Data Fetched | Key Actions / Controls | Auth / Role Requirement | State Owned |
|---|---|---|---|---|---|---|
| **LoginScreen** | `src/screens/auth/LoginScreen.tsx` | `Auth` (Root) | None | Email & Password inputs, Login button, Show/Hide password toggle | Public / Unauthenticated | Form inputs, loading state, error alert |
| **LoadingScreen** | `src/screens/shared/LoadingScreen.tsx` | `Loading` (Root) | None | ActivityIndicator spinner | Public / Auth Initializing | None |
| **InactiveUserScreen** | `src/screens/shared/InactiveUserScreen.tsx` | `Inactive` (Root) | `users` profile | Account pending activation banner, Logout button | Authenticated / `is_active = false` | None |
| **ProfileScreen** | `src/screens/shared/ProfileScreen.tsx` | `ProfileScreen` (All stacks) | `users` profile, avatar from Storage | Edit phone/name, upload avatar (ImagePicker), change password, logout | Authenticated (Any active role) | Edit mode, image picker URI, upload progress |
| **NotificationsScreen** | `src/screens/shared/NotificationsScreen.tsx` | `Notifications` (All stacks) | `notifications` filtered by `recipient_user_id` | Pull-to-refresh list, mark as read, tap to navigate to Job | Authenticated (Any active role) | Notification list, unread count, refreshing |
| **AttendanceScreen** | `src/screens/shared/AttendanceScreen.tsx` | `Attendance` (Tabs/Stack) | `attendance` (30 days), `geofence_settings` | Camera selfie capture (Check-in/Check-out), GPS location acquisition, Geofence distance calculation, History list | Authenticated (Any active role) | Camera state, GPS coords, checkin/checkout status, history list |
| **InventoryScreen** | `src/screens/shared/InventoryScreen.tsx` | `Inventory` (Admin/Recept Stack) | `inventory` items, search query | Search bar, low stock filter toggle, item list with stock counts | Authenticated (`admin`, `receptionist`) | Search term, filter selection, list data |
| **SalesListScreen** | `src/screens/shared/SalesListScreen.tsx` | `SalesList` (Admin/Recept Stack) | `sales` joined with `users` | Filter by status/date, search sales, tap for detail modal | Authenticated (`admin`, `receptionist`) | Search query, sales array, selected sale |
| **AllottedMaterialsScreen** | `src/screens/shared/AllottedMaterialsScreen.tsx` | `AllottedMaterialsScreen` (Shared) | `job_materials`, `jobs`, `users` | Allotment list, return allotment RPC, use allotment RPC | Authenticated (All roles) | Allotment array, modal state, filter tabs |

---

### 1.2 Receptionist Screens

| Screen Name | File Path | Route / Stack | Data Fetched | Key Actions / Controls | Auth / Role Requirement | State Owned |
|---|---|---|---|---|---|---|
| **DashboardScreen** | `src/screens/receptionist/DashboardScreen.tsx` | `ReceptionistTabs` (Dashboard) | `jobs` counts, recent jobs, quick metrics | Quick stats cards, navigate to Intake, View Recent Jobs | Authenticated (`receptionist`, `admin`) | Metrics state, refreshing |
| **JobListScreen** | `src/screens/receptionist/JobListScreen.tsx` | `ReceptionistTabs` (Jobs) | `jobs`, `users` (technicians) | Search, filter by status, priority badge, navigate to JobDetail | Authenticated (`receptionist`, `admin`) | Status filter, search text, jobs list |
| **CustomerIntakeScreen** | `src/screens/receptionist/CustomerIntakeScreen.tsx` | `CustomerIntake` (Modal/Stack) | `job_types`, `users` (active techs), `get_unique_device_types` | Intake form (Customer Name, Phone, Email, GSTIN, Device Type, Issue, Remarks, Priority, Ref Type, Tech Assign), Submit Button, Print Receipt | Authenticated (`receptionist`, `admin`) | Full intake form state, validation errors, submission modal |
| **JobAssignmentScreen** | `src/screens/receptionist/JobAssignmentScreen.tsx` | `JobAssignment` (Stack) | `jobs` by ID, active `users` (technicians) | Select/reassign technician dropdown, submit reassignment | Authenticated (`receptionist`, `admin`) | Selected technician ID, loading state |
| **JobDetailScreen** | `src/screens/receptionist/JobDetailScreen.tsx` | `JobDetail` (Stack) | `jobs` by ID, `job_materials`, `billing`, `users` | View details, status history, materials list, open WhatsApp ready-message, navigate to Billing | Authenticated (`receptionist`, `admin`) | Job record, materials, billing record, tab index |
| **BillingScreen** | `src/screens/receptionist/BillingScreen.tsx` | `Billing` (Stack) | `jobs`, `job_materials`, `billing` | Parts total, labour charge input, tax % input, discount input, Grand Total calculation, Mark as Paid, Print/Share Invoice | Authenticated (`receptionist`, `admin`) | Form inputs, live formula preview, payment modal |
| **NewSaleScreen** | `src/screens/receptionist/NewSaleScreen.tsx` | `NewSaleScreen` (Stack) | `inventory`, `sale_types`, `generate_sale_code` | POS intake: select items, adjust quantities, discount/tax, payment method, Submit sale, generate invoice | Authenticated (`receptionist`, `admin`) | Cart items, customer info, totals, payment method |
| **CustomersScreen** | `src/screens/receptionist/CustomersScreen.tsx` | `Customers` (Stack) | `jobs` grouped by customer contact | Search customer name/phone, view customer history of jobs | Authenticated (`receptionist`, `admin`) | Search query, customer list, selected history |
| **AnalyticsScreen** | `src/screens/receptionist/AnalyticsScreen.tsx` | `AnalyticsScreen` (Stack) | `jobs`, `sales` for date ranges | Intake count, delivery count, average turnaround time | Authenticated (`receptionist`, `admin`) | Date range filter, chart data |

---

### 1.3 Technician Screens

| Screen Name | File Path | Route / Stack | Data Fetched | Key Actions / Controls | Auth / Role Requirement | State Owned |
|---|---|---|---|---|---|---|
| **TechnicianDashboardScreen** | `src/screens/technician/TechnicianDashboardScreen.tsx` | `TechnicianTabs` (Dashboard) | Assigned `jobs` counts, today's visits | Assigned jobs cards, today's schedule, quick status filters | Authenticated (`technician`) | Active tab, counts summary |
| **MyJobsScreen** | `src/screens/technician/MyJobsScreen.tsx` | `TechnicianTabs` (MyJobs) | `jobs` where `technician_id = auth.uid()` | Search assigned jobs, filter by status, tap for UpdateWork | Authenticated (`technician`) | Status filter, search text, assigned jobs |
| **UpdateWorkScreen** | `src/screens/technician/UpdateWorkScreen.tsx` | `UpdateWork` (Stack) | `jobs` by ID, `job_materials`, `inventory` | Status transition buttons (`In Progress`, `Waiting for Materials`, `Completed`), Add materials, work notes | Authenticated (`technician` assigned to job) | Status selection, material inputs, note editor |
| **OnsiteVisitScreen** | `src/screens/technician/OnsiteVisitScreen.tsx` | `OnsiteVisit` (Stack) | `onsite_visits` by `job_id` | Camera capture Arrival selfie + GPS, Camera capture Departure selfie + GPS | Authenticated (`technician` assigned to job) | Camera active mode, GPS coordinates, upload state |
| **AllottedMaterialsScreen** | `src/screens/technician/AllottedMaterialsScreen.tsx` | `AllottedMaterialsScreen` (Stack) | `job_materials` for technician | View materials in possession, use on job, return to stock | Authenticated (`technician`) | Materials list, usage modal |

---

### 1.4 Admin Mobile Screens

| Screen Name | File Path | Route / Stack | Data Fetched | Key Actions / Controls | Auth / Role Requirement | State Owned |
|---|---|---|---|---|---|---|
| **OverviewScreen** | `src/screens/admin/OverviewScreen.tsx` | `AdminTabs` (Overview) | Key metrics, revenue, active jobs, `count_low_stock_items` | High-level business overview cards, quick navigation | Authenticated (`admin`) | Refreshing, metric cards |
| **AdminJobsScreen** | `src/screens/admin/AdminJobsScreen.tsx` | `AdminTabs` (Jobs) | All `jobs`, `users` | Filter by status/tech/priority, global search, tap to AdminJobDetail | Authenticated (`admin`) | Global filter state, jobs list |
| **AdminJobDetailScreen** | `src/screens/admin/AdminJobDetailScreen.tsx` | `AdminJobDetail` (Stack) | `jobs` by ID, materials, billing, visits, reviews | Full administrative control, override tech assignment, cancel job | Authenticated (`admin`) | Complete job composite model |
| **StaffScreen** | `src/screens/admin/StaffScreen.tsx` | `AdminTabs` (Staff) | `users` list, `staff_rates` | Toggle user `is_active`, change role, navigate to CreateStaff | Authenticated (`admin`) | Staff filter, user list |
| **AdminCreateStaffScreen** | `src/screens/admin/AdminCreateStaffScreen.tsx` | `AdminCreateStaff` (Stack) | None | New staff form: Name, Email, Password, Phone, Role, Create User | Authenticated (`admin`) | Staff form inputs, submission state |
| **SalaryScreen** | `src/screens/admin/SalaryScreen.tsx` | `Salary` (Stack) | `salary`, `users`, `staff_rates`, `payments` | Monthly payroll viewer, breakdown by staff, advance deductions | Authenticated (`admin`) | Month selector, salary breakdown |
| **ExpenditureScreen** | `src/screens/admin/ExpenditureScreen.tsx` | `Expenditure` (Stack) | `payments` by category | Add new expenditure, filter by category/month, totals | Authenticated (`admin`) | Expense form, payment records |
| **ReportsScreen** | `src/screens/admin/ReportsScreen.tsx` | `AdminTabs` (Reports) | Aggregated jobs, revenue, turnaround | Generate PDF reports, date range filters, export options | Authenticated (`admin`) | Report filters, chart configurations |

---

## 2. Web Admin Panel Pages (`admin-panel`)

| Page / Route | File Path | Data Fetched | Key Actions / Controls | Auth Requirement | State Owned |
|---|---|---|---|---|---|
| **`/login`** | `src/app/login/page.tsx` | None | Email, Password form, Login action | Public / Unauthenticated | Credentials, loading, error banner |
| **`/` (Dashboard)** | `src/app/(admin)/page.tsx` | Metrics, revenue summary, low stock items, recent jobs | KPI cards, revenue charts, quick job table, low stock alerts | Authenticated (`admin`) | Timeframe selector, metric cards |
| **`/jobs`** | `src/app/(admin)/jobs/page.tsx` | `jobs`, `users` (techs) | Search, filter (status, priority, date, technician), table pagination, CSV export | Authenticated (`admin`) | Multi-filter state, page index, selection |
| **`/jobs/new`** | `src/app/(admin)/jobs/new/page.tsx` | `job_types`, `users` (active techs), `get_unique_device_types` | Full job creation form, auto job code generation, technician assignment | Authenticated (`admin`) | Form inputs, validation state |
| **`/jobs/[id]`** | `src/app/(admin)/jobs/[id]/page.tsx` | `jobs`, `job_materials`, `billing`, `onsite_visits`, `job_technicians`, `customer_reviews` | Edit job details, reassign technicians, view materials/visits, preview/generate invoice, trigger status updates | Authenticated (`admin`) | Complex state machine managed by `reducer.ts` |
| **`/staff`** | `src/app/(admin)/staff/page.tsx` | `users`, `staff_rates` | Add staff modal, edit compensation rates, toggle active/blocked, reset password | Authenticated (`admin`) | Staff list, edit rate modal, filter |
| **`/staff/leaves`** | `src/app/(admin)/staff/leaves/page.tsx` | `employee_leave`, `users` | Pending leave requests, approve/reject buttons, leave calendar | Authenticated (`admin`) | Filter by status/month, approval modals |
| **`/attendance`** | `src/app/(admin)/attendance/page.tsx` | `attendance`, `users`, `geofence_settings` | Daily/Monthly attendance grid, selfie inspection lightbox, approve/reject out-of-bounds check-ins, manual adjustment | Authenticated (`admin`) | Date picker, staff filter, selfie viewer modal |
| **`/inventory`** | `src/app/(admin)/inventory/page.tsx` | `inventory`, `products`, `inventory_transactions` | Add stock modal, create product, set threshold/prices, stock log table | Authenticated (`admin`) | Item list, restocking modal, search |
| **`/sales`** | `src/app/(admin)/sales/page.tsx` | `sales`, `sale_items`, `users` | Sales history table, filter by payment mode/status, invoice print | Authenticated (`admin`) | Sales records, date range filter |
| **`/sales/new`** | `src/app/(admin)/sales/new/page.tsx` | `inventory`, `sale_types` | POS invoice generator: add multiple items, calculate tax/discounts, create invoice RPC | Authenticated (`admin`) | Cart items, customer details, live preview |
| **`/salary`** | `src/app/(admin)/salary/page.tsx` | `salary`, `staff_rates`, `employee_bonus`, `payments` | Calculate monthly salary trigger, view itemized deductions/bonuses, mark as paid | Authenticated (`admin`) | Selected month/year, staff salary rows |
| **`/expenditure`** | `src/app/(admin)/expenditure/page.tsx` | `payments`, `users` | Itemized expenditure logger, category breakdown charts, add expense modal | Authenticated (`admin`) | Expense list, category totals |
| **`/reports`** | `src/app/(admin)/reports/page.tsx` | Multi-table aggregations (Jobs, Revenue, Turnaround, Attendance) | Interactive Recharts (turnaround, monthly sales, technician performance), export to CSV | Authenticated (`admin`) | Chart metrics, date range picker |
| **`/job-types`** | `src/app/(admin)/job-types/page.tsx` | `job_types`, `sale_types` | Create/edit service catalog items, customer charges, and staff incentive rules | Authenticated (`admin`) | Catalog lists, creation modals |
| **`/settings`** | `src/app/(admin)/settings/page.tsx` | System configurations, metadata | General system preferences | Authenticated (`admin`) | System settings |
| **`/settings/geofence`** | `src/app/(admin)/settings/geofence/page.tsx` | `geofence_settings` | Interactive Leaflet Map picker: set workshop GPS latitude/longitude and radius (meters) | Authenticated (`admin`) | Map center, marker coordinates, radius |
| **`/settings/whatsapp`** | `src/app/(admin)/settings/whatsapp/page.tsx` | `whatsapp_settings`, `whatsapp_logs` | WhatsApp message template configurations, integration logs | Authenticated (`admin`) | Template inputs, status logs |
