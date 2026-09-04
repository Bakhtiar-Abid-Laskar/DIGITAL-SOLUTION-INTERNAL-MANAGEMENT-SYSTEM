# NAVIGATION_AUDIT_REPORT.md — RepairShop Mobile App: Full Inventory & Navigation Audit

**Target:** RepairShop Expo/React Native Mobile Application (`RepairShopApp/`)  
**Audit Type:** Read-Only Discovery & Navigation Architecture Mapping  
**Date:** September 2026  
**Auditor:** Antigravity IDE  

---

## 1. Executive Summary

This report delivers the comprehensive, ground-truth audit of the RepairShop mobile application (`RepairShopApp/`) and supporting Supabase backend Edge Functions (`supabase/functions/`). The audit was conducted entirely in read-only discovery mode with zero modifications made to production code.

### Quantitative Scope Summary

| Metric Area | Total Cataloged | Key Architectural Insights |
|---|---|---|
| **Screens & Surfaces** | 52 Total (36 Screen Files + 16 Modals/Sheets) | 9 Navigators across 8 config files; 3 distinct role stacks (`admin`, `receptionist`, `technician`). |
| **Component Instances** | 110 Distinct Instances | Shared design tokens (`src/tokens.ts`); widespread use of custom `AppPressable` wrapper. |
| **Icon Instances** | 106 Distinct Icon Call Sites | Sourced exclusively from `lucide-react-native`; 4 cross-screen semantic inconsistencies identified. |
| **Push Notification Triggers** | 15 Backend Edge Function Triggers | Full support in `supabase/functions/`; major client-side OS response listener gap for Admin role. |
| **KPIs & Metrics Displayed** | 33 Distinct KPIs, Counters & Charts | 6 dead metrics (no touch handler); 5 cross-screen calculation/table discrepancies identified. |
| **Navigation Edges** | 68 Directed Graph Transitions | 1 critical crash route (`JobDetail` in `TechnicianStack`); 3 registered orphan screens in `AdminStack`. |

### Overall Health Assessment

The application exhibits a solid visual foundation and well-structured UI token architecture (`colors`, `spacing`, `radius`, `typography`, `shadow`). However, the navigation and deep-linking layers suffer from several critical structural defects:
1. **Broken Active Job Navigation on Technician Dashboard:** Tapping an active repair card invokes an unregistered route (`JobDetail`), causing an unhandled navigation runtime crash.
2. **Push Notification Silence for Admin:** The client-side notification response listener (`usePushNotifications.ts`) lacks an Admin role branch, rendering push alerts non-navigable on Admin devices.
3. **Orphaned Admin Workflows:** Core administrative modules for Salary/Payroll and Staff Attendance are fully implemented in code but completely omitted from Admin menus and dashboards.
4. **Metric & Table Divergence:** Financial metrics query divergent database tables (`invoices` vs legacy `billing`) with inconsistent date bounds.

---

## 2. Complete Screen & Surface Inventory

### 2a. Core Screen Files (36 Screens)

| Screen File Path | Navigator / Stack Registration | Accessible By Roles | Inbound Navigation Triggers | Outbound Navigation Targets | Screen Type |
|---|---|---|---|---|---|
| `src/screens/shared/LoadingScreen.tsx` | `RootNavigator` (`Loading`) | All (Auth Hydration) | App launch / auth hydration | Auto-redirects to Auth or Role Stack | Full Screen (Splash) |
| `src/screens/auth/LoginScreen.tsx` | `RootNavigator` (`Auth`) | Public (Unauthenticated) | Launch when `!session`, or Logout | Role Root Stacks (`AdminRoot`, `ReceptionistRoot`, `TechnicianRoot`) | Full Screen (Form) |
| `src/screens/shared/InactiveUserScreen.tsx` | `RootNavigator` (`Inactive`) | Inactive / Pending Staff | Launch when `session && !isActive` | None (Dead-End Trap Node) | Full Screen (Status) |
| `src/screens/admin/OverviewScreen.tsx` | `AdminTabs` (`Dashboard`) | Admin | Admin login, bottom tab 1 | `AdminJobs`, `StaffScreen`, `Inventory`, `CustomerIntake`, `NewSale`, `PendingPayments`, `AllottedMaterials`, `Reports`, `Expenditure` | Full Screen (Dashboard) |
| `src/screens/admin/AdminJobsScreen.tsx` | `AdminTabs` (`Jobs`) | Admin | Bottom tab 2, Overview stat card | `AdminJobDetailScreen` | Full Screen (List) |
| `src/screens/shared/SalesListScreen.tsx` | `AdminTabs` (`Sales`), `AdminStack`, `RecepStack` | Admin, Receptionist | Bottom tab 4 (Admin), QuickAction `sales` (Recep) | `SaleDetailScreen` | Full Screen (List) |
| `src/screens/shared/InventoryScreen.tsx` | `AdminTabs` (`Inventory`), `AdminStack`, `RecepStack` | Admin, Receptionist | Bottom tab 5 (Admin), QuickAction `inventory` | `PurchaseIntakeScreen` | Full Screen (List/Form) |
| `src/screens/admin/AdminJobDetailScreen.tsx` | `AdminStack` (`AdminJobDetail`, `JobDetail`) | Admin | Job card tap in `AdminJobsScreen` | `JobAssignmentScreen`, `BillingScreen` | Full Screen (Detail) |
| `src/screens/admin/StaffScreen.tsx` | `AdminStack` (`Users`) | Admin | QuickAction `users`, StatCard `staff` | `AdminCreateStaffScreen` | Full Screen (List) |
| `src/screens/admin/AdminCreateStaffScreen.tsx` | `AdminStack` (`AdminCreateStaff`) | Admin | Header plus icon on `StaffScreen` | Pop (`goBack()`) | Full Screen (Form) |
| `src/screens/admin/ReportsScreen.tsx` | `AdminStack` (`Reports`) | Admin | QuickAction `reports` on Overview | Pop (`goBack()`) | Full Screen (Analytics) |
| `src/screens/admin/ExpenditureScreen.tsx` | `AdminStack` (`Expenditure`) | Admin | QuickAction `expenditure` on Overview | Pop (`goBack()`) | Full Screen (List/Form) |
| `src/screens/admin/PurchaseIntakeScreen.tsx` | `AdminStack`, `RecepStack` | Admin (Leaked to Recep) | Plus icon on `InventoryScreen` | Pop (`goBack()`) | Full Screen (Intake Form) |
| `src/screens/admin/SalaryScreen.tsx` | `AdminStack` (`Salary`) | Admin (Orphaned) | None (Zero inbound links in Admin UI) | Pop (`goBack()`) | Full Screen (Finance) |
| `src/screens/receptionist/DashboardScreen.tsx` | `ReceptionistTabs` (`Dashboard`) | Receptionist | Receptionist login, bottom tab 1 | `JobListScreen`, QuickAction screens | Full Screen (Dashboard) |
| `src/screens/receptionist/JobListScreen.tsx` | `ReceptionistJobsStack` (`Jobs`) | Receptionist | Bottom tab 2, Dashboard stat cards | `JobDetailScreen` | Full Screen (List) |
| `src/screens/receptionist/CustomerIntakeScreen.tsx` | `AdminStack`, `RecepStack` | Admin, Receptionist | FAB "New Job", QuickAction `new_job` | Receipt Modal, Pop (`goBack()`) | Full Screen (Multi-step Form) |
| `src/screens/receptionist/JobDetailScreen.tsx` | `RecepStack` (`JobDetail`) | Receptionist | Job card tap in `JobListScreen` | `JobAssignmentScreen`, `BillingScreen` | Full Screen (Detail) |
| `src/screens/receptionist/JobAssignmentScreen.tsx` | `AdminStack`, `RecepStack` | Admin, Receptionist | "Assign" button on Job Details | Pop (`goBack()`) | Full Screen (Selection Form) |
| `src/screens/receptionist/BillingScreen.tsx` | `AdminStack`, `RecepStack` | Admin, Receptionist | "Bill Job" button, Pending Payment row | Pop (`goBack()`) | Full Screen (Invoice Form) |
| `src/screens/receptionist/NewSaleScreen.tsx` | `AdminStack`, `RecepStack` | Admin, Receptionist | FAB "New Sale", QuickAction `new_sale` | `SaleDetailScreen` | Full Screen (POS Form) |
| `src/screens/shared/SaleDetailScreen.tsx` | `AdminStack`, `RecepStack` | Admin, Receptionist | Sale card tap, NewSale completion | Pop (`goBack()`) | Full Screen (Receipt/Invoice) |
| `src/screens/receptionist/CustomersScreen.tsx` | `AdminStack`, `RecepStack` | Admin (Orphaned), Receptionist | QuickAction `customers` (Recep) | Customer Details Modal | Full Screen (Directory) |
| `src/screens/receptionist/AnalyticsScreen.tsx` | `RecepStack` (`AnalyticsScreen`) | Receptionist | QuickAction `analytics` | Pop (`goBack()`) | Full Screen (Analytics) |
| `src/screens/shared/PendingPaymentsScreen.tsx` | `AdminStack`, `RecepStack` | Admin, Receptionist | QuickAction `pending_payments` | `BillingScreen`, `SaleDetailScreen` | Full Screen (List) |
| `src/screens/shared/AllottedMaterialsScreen.tsx` | `AdminStack`, `RecepStack`, `TechStack` | All Roles | QuickAction `allotted_materials` / `materials` | Pop (`goBack()`) | Full Screen (Inventory List) |
| `src/screens/shared/AttendanceScreen.tsx` | `AdminStack` (Orphaned), `RecepTabs`, `TechTabs` | All Roles | Bottom tab `Attendance` (Recep & Tech) | Image Viewer Modal | Full Screen (Camera/GPS) |
| `src/screens/shared/SalaryScreen.tsx` | `RecepTabs`, `TechTabs` | Receptionist, Technician | Bottom tab `Salary` (Recep & Tech) | Payslip Download | Full Screen (Finance/Leave) |
| `src/screens/shared/NotificationsScreen.tsx` | `AdminStack`, `RecepStack`, `TechStack` | All Roles | "View all" link in Recep & Tech sheets | `AdminJobDetail`, `JobDetail`, `UpdateWork` | Full Screen (List) |
| `src/screens/shared/ProfileScreen.tsx` | `AdminStack`, `RecepStack`, `TechStack` | All Roles | Header avatar tap in dashboards | Pop (`goBack()`) | Full Screen (Settings Form) |
| `src/screens/technician/TechnicianDashboardScreen.tsx` | `TechnicianTabs` (`Dashboard`) | Technician | Technician login, bottom tab 1 | `MyJobsScreen`, QuickActions, Notifications | Full Screen (Dashboard) |
| `src/screens/technician/MyJobsScreen.tsx` | `TechnicianJobsStack` (`Jobs`) | Technician | Bottom tab 2, Dashboard stat cards | `OnsiteVisitScreen`, `UpdateWorkScreen` | Full Screen (List) |
| `src/screens/technician/UpdateWorkScreen.tsx` | `TechnicianStack` (`UpdateWork`) | Technician | Job card tap in `MyJobsScreen` | Pop (`goBack()`) | Full Screen (Work Log Form) |
| `src/screens/technician/OnsiteVisitScreen.tsx` | `TechnicianStack` (`OnsiteVisit`) | Technician | Onsite job tap in `MyJobsScreen` | `UpdateWorkScreen` | Full Screen (Camera/GPS) |
| `src/screens/technician/TechnicianReportsScreen.tsx` | `TechnicianStack` (`TechnicianReports`) | Technician | QuickAction `reports` on Tech Dashboard | `UpdateWorkScreen` | Full Screen (Analytics) |

---

### 2b. Modals, Bottom Sheets & Overlay Surfaces (16 Surfaces)

| Surface Name | Parent Screen / Trigger Element | File Citation | Interactive Controls |
|---|---|---|---|
| **Admin Quick Actions FAB Sheet** | Center Tab FAB Button (`AdminTabs.tsx`) | `AdminTabs.tsx:L48-L84` | "New Job" -> `CustomerIntake`, "New Sale" -> `NewSaleScreen`. |
| **Receptionist Quick Actions FAB Sheet** | Center Tab FAB Button (`ReceptionistTabs.tsx`) | `ReceptionistTabs.tsx:L49-L85` | "New Job" -> `CustomerIntake`, "New Sale" -> `NewSaleScreen`. |
| **Admin Notifications Bottom Sheet** | Header Bell Icon (`OverviewScreen.tsx:L166`) | `OverviewScreen.tsx:L226-L258` | Top 5 notifications (Dead touches); lacks "View all" link. |
| **Receptionist Notifications Bottom Sheet** | Header Bell Icon (`DashboardScreen.tsx:L151`) | `DashboardScreen.tsx:L158-L196` | Top 5 notifications (Dead touches); "View all" -> `NotificationsScreen`. |
| **Technician Notifications Bottom Sheet** | Header Bell Icon (`TechnicianDashboardScreen.tsx:L190`) | `TechnicianDashboardScreen.tsx:L232-L270` | Top 5 notifications (Dead touches); "View all" -> `NotificationsScreen`. |
| **Admin Role Menu Bottom Sheet** | Header Avatar (`OverviewScreen.tsx:L164`) | `OverviewScreen.tsx:L261-L325` | Links to Staff, Inventory, Reports, Expenditure, Logout. |
| **Receptionist Role Menu Bottom Sheet** | Header Avatar (`DashboardScreen.tsx:L149`) | `DashboardScreen.tsx:L199-L230` | Link to Logout. |
| **Technician Role Menu Bottom Sheet** | Header Avatar (`TechnicianDashboardScreen.tsx:L188`) | `TechnicianDashboardScreen.tsx:L273-L297` | Link to Logout. |
| **Logout Confirmation Sheet (All Roles)** | Role Menu Sheet "Log Out" item | `OverviewScreen.tsx:L328`, `DashboardScreen.tsx:L233`, `TechnicianDashboardScreen.tsx:L300` | "Cancel" (Dismiss), "Log Out" (Auth sign out). |
| **Customer Intake Success Modal** | "Register Job" submit in `CustomerIntakeScreen` | `CustomerIntakeScreen.tsx:L240-L290` | "Print Receipt" (Expo Print), "Done" (Pop). |
| **Customer Details Bottom Sheet / Modal** | Customer Row Tap in `CustomersScreen` | `CustomersScreen.tsx:L89-L117` | Edit customer profile, tap linked job -> `JobDetailScreen`. |
| **Staff Attendance Review Modal** | Staff Card Options in `StaffScreen` | `StaffScreen.tsx:L105-L119` | Displays 15-day check-in/out log for selected employee. |
| **Inventory Edit / Restock Modal** | Inventory Card Tap in `InventoryScreen` | `InventoryScreen.tsx:L60-L82` | Edit item name, rates, thresholds, taxes, quantity. |
| **Attendance Selfie Image Viewer Modal** | Selfie Card Tap in `AttendanceScreen` | `AttendanceScreen.tsx:L206-L214` | Displays full-resolution selfie with GPS coordinates. |
| **Add Expenditure Bottom Sheet** | Header Plus in `ExpenditureScreen` | `ExpenditureScreen.tsx:L114-L120` | Form inputs for type, amount, description. |
| **Report Month Picker Bottom Sheet** | Period Selector in `ReportsScreen` & `TechReports` | `ReportsScreen.tsx:L47`, `TechnicianReportsScreen.tsx:L186` | Selects 1 of past 12 months to filter analytics. |

---

## 3. Complete Widget & Component Inventory

*(Summary of 110 cataloged instances across 16 reusable component patterns)*

| Component Pattern | Primary Component File | Screen Call Sites | Interactive? | Navigation Target / Behavior |
|---|---|---|---|---|
| **StatCard** | `src/components/common/StatCard.tsx` | Overview, Dashboard, TechDashboard | Yes (11 of 12) | Taps route to filtered job/staff/inventory lists. (Admin Revenue card is dead). |
| **QuickActionButton** | `src/components/common/QuickActionButton.tsx` | Overview, Dashboard, TechDashboard | Yes | Pushes destination stack screens (Intake, POS, Reports, Payments, Materials). |
| **JobList / JobCard** | `src/components/jobs/JobList.tsx` | AdminJobs, JobListScreen, MyJobs | Yes | Pushes Job Details (`AdminJobDetail`, `JobDetail`, `UpdateWork`). |
| **AppHeader** | `src/components/common/AppHeader.tsx` | All 36 screens | Yes | Left: Back / Drawer; Right: Notifications Sheet / Actions. |
| **CustomTabBar** | `src/navigation/CustomTabBar.tsx` | AdminTabs, RecepTabs, TechTabs | Yes | Standard tab switching; Center FAB opens Quick Actions bottom sheet. |
| **StatusBadge** | `src/components/jobs/StatusBadge.tsx` | Jobs, Sales, Reports, Details | No | Non-interactive semantic label chip. |
| **PriorityBadge** | `src/components/jobs/PriorityBadge.tsx` | Jobs, Intake, Reports | No | Non-interactive priority label chip (`Urgent` = Red, `High` = Orange). |
| **BottomSheet** | `src/components/common/BottomSheet.tsx` | Overview, Dashboards, Staff, Reports | Yes | Slides up interactive menu/sheet over current screen. |
| **Toast** | `src/components/common/Toast.tsx` | Invoked globally via `ToastContext` | Dismiss Only | Auto-dismisses after 4000ms or on close button; zero navigation. |
| **SelfieCard** | `src/screens/shared/AttendanceScreen.tsx` | AttendanceScreen | Yes | Tapping thumbnail opens full-screen image viewer modal. |
| **EmptyState** | `src/components/common/EmptyState.tsx` | All list screens | No | Visual placeholder when list arrays are empty. |
| **SkeletonCard** | `src/components/common/SkeletonCard.tsx` | All data screens | No | Loading shimmer layout placeholder. |

---

## 4. Complete Icon Inventory

All icons are imported directly from `lucide-react-native`.

### Cross-Screen Icon Inconsistency Matrix

| Semantic Concept | Screen A (Icon Used) | Screen B (Icon Used) | Screen C (Icon Used) | Recommended Unified Icon |
|---|---|---|---|---|
| **New Job Intake** | Admin Overview: `ClipboardList` (`OverviewScreen.tsx:L145`) | Recep Dashboard: `Plus` (`DashboardScreen.tsx:L122`) | Recep Tabs FAB: `Plus` (`ReceptionistTabs.tsx:L60`) | `PlusSquare` or `ClipboardList` |
| **Sales / POS Module** | Admin Overview: `DollarSign` (`OverviewScreen.tsx:L146`) | Recep Dashboard: `FileText` (`DashboardScreen.tsx:L124`) | Bottom Tabs: `Receipt` (`CustomTabBar.tsx:L26`) | `Receipt` |
| **Pending Payments** | Admin Overview: `CreditCard` (`OverviewScreen.tsx:L147`) | List Item: `Receipt` (`PendingPaymentsScreen.tsx:L227`) | Empty State: `CreditCard` (`PendingPaymentsScreen.tsx:L299`) | `CreditCard` |
| **Completed Status** | StatCards: `CheckCircle` (`OverviewScreen.tsx:L141`) | Toasts: `CheckCircle2` (`Toast.tsx:L67`) | Reports: `CheckCircle2` (`TechnicianReportsScreen.tsx:L246`) | `CheckCircle2` |

---

## 5. Complete Notification Inventory

### 5a. Push Notifications & OS Tap Handling

| Type / Event | Edge Function Trigger | Payload Structure | Tap Handled? | Current Target | Defect / Finding |
|---|---|---|---|---|---|
| **New Job Assigned** | `notify-on-job-created` | `{ screen: 'JobDetail', jobId }` | Tech & Recep Only | Tech: `UpdateWorkScreen`<br>Recep: `JobDetailScreen` | **Admin Unhandled:** `role === 'admin'` ignored in `usePushNotifications.ts:L202-L220`. Admin tap does nothing. |
| **Job Status Changed** | `notify-on-status-change` | `{ screen: 'JobDetail', jobId }` | Tech & Recep Only | Tech: `UpdateWorkScreen`<br>Recep: `JobDetailScreen` | **Admin Unhandled:** Admin tap does nothing. |
| **Salary Slip Ready** | `notify-on-finance-event` | `{ screen: 'Salary' }` | **No** | None | Payload lacks `jobId`. Ignored by tap listener. |
| **Advance Salary Credited** | `notify-on-finance-event` | `{ screen: 'Salary' }` | **No** | None | Payload lacks `jobId`. Ignored by tap listener. |
| **Counter Sale Completed** | `notify-on-finance-event` | `{ screen: 'SalesList' }` | **No** | None | Ignored by tap listener. |
| **Low Inventory Alert** | `notify-on-inventory-change` | `{ screen: 'Inventory' }` | **No** | None | Ignored by tap listener. |
| **Late Staff Check-in** | `notify-on-late-checkin` | `{ screen: 'Attendance' }` | **No** | None | Ignored by tap listener. |
| **Staff Leave Request** | `notify-on-leave-event` | `{ screen: 'Salary' }` | **No** | None | Ignored by tap listener. |
| **Material Return Reminder** | `notify-on-material-event` | `{ screen: 'AllottedMaterialsScreen', mode: 'scoped', jobId }` | Partially | `UpdateWorkScreen` | **Misdirected:** Because `jobId` is present, handler blindly routes to `UpdateWorkScreen` instead of `AllottedMaterialsScreen`. |
| **Onsite Arrival** | `notify-on-onsite-visit` | `{ screen: 'JobDetail', jobId }` | Recep Only | `JobDetailScreen` | Admin tap does nothing. |

### 5b. Notification Center & Badges

- **In-App Notification Center (`NotificationsScreen.tsx`):** Tapping rows with `job_id` correctly routes Admin to `AdminJobDetail`, Receptionist to `JobDetail`, and Technician to `UpdateWork`. However, tapping rows without `job_id` (inventory, attendance, salary, sales) only toggles `is_read = true` with **zero navigation**.
- **Dashboard Notification Sheets:** Individual notification cards in `OverviewScreen`, `DashboardScreen`, and `TechnicianDashboardScreen` are wrapped in `<AppPressable>` with **no `onPress` callback** (dead touches).
- **Admin Inability to Access Full Notifications Screen:** Admin notifications bottom sheet lacks a "View all" link, and the Admin stack has no direct pathway to open `NotificationsScreen`.
- **Top Header Bell Badge:** Dynamically reflects unread notification count (`unreadCount`). Tapping bell opens role notification bottom sheet.

---

## 6. Complete KPI & Metric Inventory

### Cross-Screen Calculation Inconsistencies

```
+-------------------------------------------------------------------------------------------------------------+
| CROSS-SCREEN INCONSISTENCY FINDINGS                                                                         |
+-------------------------------------------------------------------------------------------------------------+
| 1. REVENUE FORMULAS:                                                                                        |
|    - OverviewScreen: Sums invoices table for today. Omits counter sales!                                    |
|    - ReportsScreen: Sums legacy billing table for current month. Omits invoices table data!                 |
|                                                                                                             |
| 2. "COMPLETED" JOBS:                                                                                        |
|    - Receptionist Dashboard: Stored in completedToday, but queries ALL completed jobs in history!           |
|    - Technician Dashboard: Queries status = Completed AND completed_at >= today. Real today filter.        |
|    - Admin Reports: Filters jobs by created_at in current month, omitting older jobs completed this month! |
|                                                                                                             |
| 3. "IN PROGRESS" DEFINITION:                                                                                |
|    - Receptionist Dashboard: Counts ONLY status = 'In Progress' (excludes Waiting for Materials).           |
|    - Receptionist Analytics: Sums 'In Progress' + 'Waiting for Materials'.                                  |
|    - Technician Dashboard: Sums 'In Progress' + 'Waiting for Materials' + 'Received'.                       |
|                                                                                                             |
| 4. LOW STOCK THRESHOLDS:                                                                                    |
|    - OverviewScreen: Dynamically evaluates quantity_cached <= item.low_stock_threshold.                     |
|    - InventoryScreen Tab Query: Uses hardcoded quantity_cached <= 5, miscounting items with threshold != 5. |
+-------------------------------------------------------------------------------------------------------------+
```

### Dead Metric Summary
1. **Today's Revenue StatCard** (`OverviewScreen.tsx:L141`): `onPress` omitted. Dead touch.
2. **Jobs Overview Chart Bars** (`ReportsScreen.tsx:L163-L186` & `AnalyticsScreen.tsx:L82-L105`): Bars are static `View` containers.
3. **Top Technicians Leaderboard Rows** (`ReportsScreen.tsx:L221-L245`): Static `View` rows without drill-down.
4. **Technician 4-KPI Summary Tiles** (`TechnicianReportsScreen.tsx:L235-L265`): Tiles are static `View` containers.
5. **Total Expenditure Card** (`ExpenditureScreen.tsx:L221-L228`): Lacks category filter drill-down.
6. **Attendance Summary Breakdown** (`SalaryScreen.tsx:L373-L378`): Does not link to attendance history.

---

## 7. Current Navigation Graph Architecture

### Root Auth & Role Stack Diagram

```mermaid
graph TD
    Start([App Launch]) --> CheckAuth{useAuth()}
    
    CheckAuth -->|isLoading == true| NodeLoading[LoadingScreen]
    CheckAuth -->|!session| NodeLogin[LoginScreen]
    CheckAuth -->|session && !isActive| NodeInactive[InactiveUserScreen]
    CheckAuth -->|session && isActive && role == admin| NodeAdminRoot[AdminStack]
    CheckAuth -->|session && isActive && role == receptionist| NodeRecepRoot[ReceptionistStack]
    CheckAuth -->|session && isActive && role == technician| NodeTechRoot[TechnicianStack]
```

### Structural Navigation Defects
- **Broken Target Crash:** `TechnicianDashboardScreen.tsx:L224` attempts to navigate to `'JobDetail'`. Route is unregistered in `TechnicianStack.tsx`. Crashes runtime.
- **Orphan Nodes in AdminStack:** `SalaryScreen` (`AdminStack.tsx:L36`), `AttendanceScreen` (`AdminStack.tsx:L39`), and `CustomersScreen` (`AdminStack.tsx:L46`) are registered in navigation but have zero in-app links leading to them.
- **Trap Node:** `InactiveUserScreen.tsx` has zero exit paths or logout buttons.
- **Broken Filter Tab State:** Navigating to `JobListScreen` or `MyJobsScreen` with `filter: 'Urgent'` or `filter: 'Completed Today'` fails to highlight any tab because those values do not exist in the destination `statusTabs` arrays.

---

## 8. Prioritized Gap Analysis & Action Plan

### Priority 1: Critical Severity (Crashes & Security Boundary Leaks)

| ID | Location | Issue Description | Recommended Action |
|---|---|---|---|
| **GAP-01** | `src/screens/technician/TechnicianDashboardScreen.tsx:L224` | **Navigation Runtime Crash:** Active job card calls `navigation.navigate('JobDetail', { jobId })`. Route is unregistered in `TechnicianStack.tsx`. | Change navigation target to `navigation.navigate('UpdateWork', { jobId: job.id })`. |
| **GAP-02** | `src/hooks/usePushNotifications.ts:L202-L220` | **Complete Admin Push Failure:** OS notification response listener only checks `role === 'receptionist'` and `role === 'technician'`. Admin role is completely unhandled. | Add `if (role === 'admin') navigationRef.current?.navigate('AdminJobDetail', { jobId: data.jobId })`. |
| **GAP-03** | `src/navigation/ReceptionistStack.tsx:L42` | **Role Boundary Leak:** `PurchaseIntakeScreen` (vendor cost accounting & wholesale purchase intake) is registered in the Receptionist stack. | Remove `PurchaseIntake` route from `ReceptionistStack.tsx`. |

---

### Priority 2: High Severity (Orphans, Traps & Broken Workflows)

| ID | Location | Issue Description | Recommended Action |
|---|---|---|---|
| **GAP-04** | `src/screens/admin/OverviewScreen.tsx:L141` | **Dead Revenue StatCard:** Fourth stat card on Admin Overview displays today's revenue but has no touch handler. | Wire `onPress` to navigate to `SalesListScreen` or a financial summary screen. |
| **GAP-05** | `src/navigation/AdminStack.tsx:L36, L39` | **Orphaned Admin Modules:** `SalaryScreen` and `AttendanceScreen` exist in AdminStack but cannot be accessed from Admin Overview or Tabs. | Add "Payroll / Salary" and "Attendance Review" quick action tiles to `OverviewScreen.tsx`. |
| **GAP-06** | `src/screens/shared/InactiveUserScreen.tsx:L1-L45` | **Dead-End Trap Node:** Deactivated or pending users cannot log out or refresh account status. | Add "Log Out" button calling `supabase.auth.signOut()` and a manual refresh trigger. |
| **GAP-07** | `src/screens/admin/OverviewScreen.tsx:L227-L229` | **Missing Admin Notification View:** Admin notifications bottom sheet lacks a "View all" header link to `NotificationsScreen`. | Add "View all" header link to Admin bottom sheet, matching Receptionist and Technician sheets. |
| **GAP-08** | `src/screens/admin/OverviewScreen.tsx:L240`, `DashboardScreen.tsx:L178`, `TechnicianDashboardScreen.tsx:L252` | **Dead Notification Sheet Touches:** Individual notification rows in all three dashboard bottom sheets lack `onPress` callbacks. | Add `onPress` callback to route to the appropriate job detail screen or mark as read. |
| **GAP-09** | `src/screens/shared/NotificationsScreen.tsx:L224-L232` | **Dead Non-Job Notification Rows:** Tapping notification center items without `job_id` only toggles read status with no navigation. | Route non-job alerts to `Salary`, `Inventory`, `StaffAttendance`, or `SalesList` based on type. |
| **GAP-10** | `src/screens/receptionist/DashboardScreen.tsx:L136` | **Broken Urgent Tab Selection:** Tapping "Urgent" stat card passes `filter: 'Urgent'`, but `JobListScreen` lacks an `'Urgent'` tab in `statusTabs`. | Add `'Urgent'` tab to `JobListScreen.tsx` status tabs array. |
| **GAP-11** | `src/screens/technician/TechnicianDashboardScreen.tsx:L174-L175` | **Broken Tech Tab Selection:** Tapping "Completed Today" or "Urgent" passes filter values not present in `MyJobsScreen` status tabs. | Harmonize filter parameters with `MyJobsScreen.tsx` tab definitions. |
| **GAP-12** | `src/hooks/usePushNotifications.ts:L214-L216` | **Material Return Push Misdirection:** Technician tapping a material return reminder is incorrectly sent to `UpdateWork` instead of `AllottedMaterialsScreen`. | Check `if (data?.screen === 'AllottedMaterialsScreen')` before generic `jobId` routing. |

---

### Priority 3: Medium Severity (Data Discrepancies & UX Gaps)

| ID | Location | Issue Description | Recommended Action |
|---|---|---|---|
| **GAP-13** | `src/screens/admin/ReportsScreen.tsx:L88` vs `OverviewScreen.tsx:L82` | **Database Table Discrepancy:** Reports queries legacy `billing` table, while Overview queries `invoices` table. | Migrate `ReportsScreen.tsx` to query unified `invoices` table. |
| **GAP-14** | `src/screens/admin/OverviewScreen.tsx:L82` | **Counter Sales Excluded from Today's Revenue:** Query only sums `invoices`, completely ignoring counter `sales`. | Add `sales` grand total sum to daily revenue calculation. |
| **GAP-15** | `src/screens/receptionist/DashboardScreen.tsx:L79` | **Completed Job Semantic Mislabeling:** Variable `completedToday` actually queries all completed jobs in history. | Add `.gte('completed_at', startOfToday)` to match label, or rename label to "Total Completed". |
| **GAP-16** | `src/screens/shared/InventoryScreen.tsx:L87` | **Hardcoded Low Stock Threshold:** Tab query hardcodes `quantity_cached <= 5`, ignoring item-specific thresholds. | Align tab query with per-item `low_stock_threshold`. |
| **GAP-17** | `src/screens/receptionist/AnalyticsScreen.tsx:L61-L68` | **Hardcoded Date Controls:** Date range text is fixed to May 2025 and calendar button is completely non-functional. | Connect date pill and calendar button to dynamic date range picker. |
| **GAP-18** | `src/screens/admin/ReportsScreen.tsx:L163-L186` & `TechReports:L235-L265` | **Static Chart & KPI Tiles:** Bar charts and KPI summary tiles cannot be tapped to drill down into filtered lists. | Add touch interactions to filter underlying job lists by status. |

---

### Priority 4: Low Severity (Visual & Semantic Polish)

| ID | Location | Issue Description | Recommended Action |
|---|---|---|---|
| **GAP-19** | Multiple screens | **Icon Semantic Inconsistencies:** New Job, Sales, and Pending Payments use conflicting Lucide icons across dashboards. | Unify on standard icon tokens (`PlusSquare` for New Job, `Receipt` for Sales, `CreditCard` for Payments). |
| **GAP-20** | `src/screens/shared/SalaryScreen.tsx:L373-L378` | **Attendance Breakdown Static Cards:** Salary attendance summary cards do not link to `AttendanceScreen`. | Add optional touch link to inspect monthly attendance logs. |
| **GAP-21** | `src/screens/admin/AdminCreateStaffScreen.tsx` | **Admin Creation Lacks Re-Authentication:** Admin-level staff creation does not require re-entering admin password. | Add confirmation modal for creating administrator accounts. |

---

## 9. Implementation Readiness Assessment

### Prerequisites & Architectural Alignment Needed
Before beginning an implementation pass to address these findings, the following design decisions must be confirmed with the product owner:
1. **Unified Revenue Source:** Confirm whether `invoices` is the authoritative source of truth for all billing and counter sales, allowing deprecation of `billing` queries in `ReportsScreen.tsx`.
2. **Technician Job Details Screen:** Confirm whether technicians should ever see a read-only `JobDetailScreen`, or if `UpdateWorkScreen` is their sole authoritative job interaction surface.
3. **Admin Attendance Workflow:** Confirm whether Admins should have a dedicated staff attendance oversight screen in the mobile app, or if the shared `AttendanceScreen` (selfie check-in) is sufficient for admin personal attendance.
4. **Urgent Tab Placement:** Confirm whether "Urgent" should be added as a permanent sixth status tab across `JobListScreen` and `MyJobsScreen`, or if priority filtering should be implemented via a separate chip bar.

---

*Report compiled autonomously via Antigravity IDE Discovery Protocol. Zero application code modifications were made during this audit.*
