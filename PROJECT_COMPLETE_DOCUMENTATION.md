# RepairShop — Complete Project Documentation
*(Generated on: July 30, 2026, reflecting the current ground-truth codebase state)*

> **Verification & Scope Note**: This document was generated through a ground-truth pass reading every route, screen, Edge Function, schema migration, and package file in the workspace. No prior audit logs or stale docs were assumed as authoritative.
> 
> **Unverifiable / Ambiguous Items**:
> 1. **Live Supabase Secret Variables**: External integration keys (`TWILIO_SID`, `TWILIO_TOKEN`, `RESEND_API_KEY`, `WHATSAPP_VERIFY_TOKEN`) are configured as Supabase Edge Function Secrets and are not stored in repository code.
> 2. **Push Notification Gateway**: Mobile push notifications rely on Expo Push Service (`https://exp.host/--/api/v2/push/send`) which requires live physical device APNs/FCM setup during runtime.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Full Directory Structure](#3-full-directory-structure)
4. [Admin Panel — Page-by-Page Reference](#4-admin-panel--page-by-page-reference)
   - [Overview Dashboard (`/`)](#41-overview-dashboard-)
   - [Login Page (`/login`)](#42-login-page-login)
   - [Jobs List (`/jobs`)](#43-jobs-list-jobs)
   - [New Job Form (`/jobs/new`)](#44-new-job-form-jobsnew)
   - [Job Detail & Billing (`/jobs/[id]`)](#45-job-detail--billing-jobsid)
   - [Print Job Receipt (`/jobs/[id]/print`)](#46-print-job-receipt-jobsidprint)
   - [Job Types Catalog (`/job-types`)](#47-job-types-catalog-job-types)
   - [Sales List (`/sales`)](#48-sales-list-sales)
   - [New Direct Sale (`/sales/new`)](#49-new-direct-sale-salesnew)
   - [Staff Management (`/staff`)](#410-staff-management-staff)
   - [Inventory Management (`/inventory`)](#411-inventory-management-inventory)
   - [Reports & Analytics (`/reports`)](#412-reports--analytics-reports)
   - [Salary & Payroll (`/salary`)](#413-salary--payroll-salary)
   - [Expenditure Tracking (`/expenditure`)](#414-expenditure-tracking-expenditure)
   - [Admin Settings (`/settings`)](#415-admin-settings-settings)
5. [Mobile App — Screen-by-Screen Reference](#5-mobile-app--screen-by-screen-reference)
   - **Auth**: [LoginScreen](#51-loginscreen-auth)
   - **Admin Screens**: [OverviewScreen](#52-overviewscreen-admin), [AdminJobsScreen](#53-adminjobsscreen-admin), [AdminJobDetailScreen](#54-adminjobdetailscreen-admin), [StaffScreen](#55-staffscreen-admin), [AdminCreateStaffScreen](#56-admincreatestaffscreen-admin), [SalaryScreen](#57-salaryscreen-admin), [ExpenditureScreen](#58-expenditurescreen-admin), [ReportsScreen](#59-reportsscreen-admin)
   - **Receptionist Screens**: [DashboardScreen](#510-dashboardscreen-receptionist), [CustomerIntakeScreen](#511-customerintakescreen-receptionist), [JobListScreen](#512-joblistscreen-receptionist), [JobDetailScreen](#513-jobdetailscreen-receptionist), [JobAssignmentScreen](#514-jobassignmentscreen-receptionist), [BillingScreen](#515-billingscreen-receptionist), [NewSaleScreen](#516-newsalescreen-receptionist), [PaymentsScreen](#517-paymentsscreen-receptionist), [CustomersScreen](#518-customersscreen-receptionist), [AnalyticsScreen](#519-analyticsscreen-receptionist)
   - **Technician Screens**: [TechnicianDashboardScreen](#520-techniciandashboardscreen-technician), [MyJobsScreen](#521-myjobsscreen-technician), [UpdateWorkScreen](#522-updateworkscreen-technician), [OnsiteVisitScreen](#523-onsitevisitscreen-technician)
   - **Shared Screens**: [AttendanceScreen](#524-attendancescreen-shared), [ProfileScreen](#525-profilescreen-shared), [InventoryScreen](#526-inventoryscreen-shared), [SalaryScreen](#527-salaryscreen-shared), [NotificationsScreen](#528-notificationsscreen-shared), [InactiveUserScreen](#529-inactiveuserscreen-shared)
6. [Full Route Map (Admin Panel)](#6-full-route-map-admin-panel)
7. [Full Navigator Map (Mobile App)](#7-full-navigator-map-mobile-app)
8. [Database Schema Reference](#8-database-schema-reference)
9. [RLS / Access Control Matrix](#9-rls--access-control-matrix)
10. [Supabase Edge Functions Reference](#10-supabase-edge-functions-reference)
11. [Master API / Network Call Inventory](#11-master-api--network-call-inventory)
12. [Design System & UI/UX Reference](#12-design-system--uiux-reference)
13. [State Management Overview](#13-state-management-overview)
14. [Business Logic & Formulas Reference](#14-business-logic--formulas-reference)
15. [Shared Package Reference](#15-shared-package-reference)
16. [Appendix: Full File Inventory](#16-appendix-full-file-inventory)

---

## 1. Executive Summary

**RepairShop** is a multi-platform service and repair shop management solution designed for device repair centers, field technicians, receptionists, and shop owners. 

### Key Modules:
- **Mobile Application (`RepairShopApp/`)**: Cross-platform Expo React Native app serving **Receptionist**, **Technician**, and **Admin** roles with selfie+GPS attendance tracking, customer intake, job assignment, work updates, onsite visit logging, billing, direct sales, and real-time push alerts.
- **Web Admin Panel (`admin-panel/`)**: Next.js (App Router) web application providing shop owners with real-time overview analytics, staff approval management, job/sale creation, inventory tracking, financial expenditure logging, custom salary/payroll calculation, and reporting.
- **Shared Package (`packages/shared/`)**: Monorepo TypeScript package exporting standardized status badges, E.164 phone formatters, INR currency formatters, and central TypeScript domain types.
- **Supabase Backend (`supabase/`)**: PostgreSQL database with Row Level Security (RLS), Supabase Auth, Storage buckets (`attendance-selfies`, `onsite-visits`, `avatars`, `invoices`), and 6 Deno Edge Functions for notification handling, WhatsApp webhooks, salary calculation, and user provisioning.

---

## 2. System Architecture

```
                                    +-----------------------------------+
                                    |        React / Next.js Admin      |
                                    |            (admin-panel)          |
                                    +-----------------+-----------------+
                                                      |
                                                      | Supabase JS SDK (Anon Key)
                                                      v
+-----------------------------------+        +-----------------------------------+        +-----------------------------------+
|      Expo React Native App        |------->|         Supabase Backend          |<-------|       External Integrations       |
|         (RepairShopApp)           |        |                                   |        | - Expo Push API                   |
+-----------------------------------+        |  - Postgres (Tables, Triggers)    |        | - Twilio / WhatsApp Cloud API     |
                                             |  - Supabase Auth                  |        | - Resend Email Service            |
                                             |  - Supabase Storage               |        | - Device Camera & GPS             |
                                             |  - Supabase Realtime Channels     |        +-----------------------------------+
                                             |  - Supabase Edge Functions        |
                                             +-----------------------------------+
```

---

## 3. Full Directory Structure

```text
c:\Users\bakht\Desktop\Digital Solution\
├── GEMINI.md
├── SKILL.md
├── package.json
├── package-lock.json
├── PROJECT_COMPLETE_DOCUMENTATION.md
├── admin-panel/
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── login/
│       │   │   └── page.tsx
│       │   └── (admin)/
│       │       ├── layout.tsx
│       │       ├── page.tsx
│       │       ├── expenditure/page.tsx
│       │       ├── inventory/page.tsx
│       │       ├── job-types/page.tsx
│       │       ├── jobs/
│       │       │   ├── page.tsx
│       │       │   ├── new/page.tsx
│       │       │   └── [id]/
│       │       │       ├── page.tsx
│       │       │       └── print/page.tsx
│       │       ├── reports/page.tsx
│       │       ├── salary/page.tsx
│       │       ├── sales/
│       │       │   ├── page.tsx
│       │       │   └── new/page.tsx
│       │       ├── settings/page.tsx
│       │       └── staff/page.tsx
│       ├── components/
│       │   ├── catalog/
│       │   ├── common/
│       │   ├── dashboard/
│       │   ├── expenditure/
│       │   ├── inventory/
│       │   ├── jobs/
│       │   ├── layout/
│       │   ├── providers/
│       │   ├── salary/
│       │   └── staff/
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── lib/
│       │   └── supabase.ts
│       └── types/
├── RepairShopApp/
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── components/
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── navigation/
│       │   ├── AdminNavigator.tsx
│       │   ├── ReceptionistStack.tsx
│       │   ├── TechnicianStack.tsx
│       │   ├── RootNavigator.tsx
│       │   └── SharedStack.tsx
│       ├── screens/
│       │   ├── admin/
│       │   │   ├── AdminCreateStaffScreen.tsx
│       │   │   ├── AdminJobDetailScreen.tsx
│       │   │   ├── AdminJobsScreen.tsx
│       │   │   ├── ExpenditureScreen.tsx
│       │   │   ├── OverviewScreen.tsx
│       │   │   ├── ReportsScreen.tsx
│       │   │   ├── SalaryScreen.tsx
│       │   │   └── StaffScreen.tsx
│       │   ├── auth/
│       │   │   └── LoginScreen.tsx
│       │   ├── receptionist/
│       │   │   ├── AnalyticsScreen.tsx
│       │   │   ├── BillingScreen.tsx
│       │   │   ├── CustomerIntakeScreen.tsx
│       │   │   ├── CustomersScreen.tsx
│       │   │   ├── DashboardScreen.tsx
│       │   │   ├── JobAssignmentScreen.tsx
│       │   │   ├── JobDetailScreen.tsx
│       │   │   ├── JobListScreen.tsx
│       │   │   ├── NewSaleScreen.tsx
│       │   │   └── PaymentsScreen.tsx
│       │   ├── shared/
│       │   │   ├── AttendanceScreen.tsx
│       │   │   ├── InactiveUserScreen.tsx
│       │   │   ├── InventoryScreen.tsx
│       │   │   ├── NotificationsScreen.tsx
│       │   │   ├── ProfileScreen.tsx
│       │   │   └── SalaryScreen.tsx
│       │   └── technician/
│       │       ├── MyJobsScreen.tsx
│       │       ├── OnsiteVisitScreen.tsx
│       │       ├── TechnicianDashboardScreen.tsx
│       │       └── UpdateWorkScreen.tsx
│       ├── services/
│       ├── theme/
│       └── utils/
├── packages/
│   └── shared/
│       ├── package.json
│       ├── index.ts
│       └── src/
│           ├── badgeConfig.ts
│           ├── billing.ts
│           ├── date.ts
│           ├── formatCurrency.ts
│           ├── phone.ts
│           ├── storageUrlCache.ts
│           └── types.ts
└── supabase/
    ├── functions/
    │   ├── admin-create-user/index.ts
    │   ├── calculate-monthly-salary/index.ts
    │   ├── notify-on-job-created/index.ts
    │   ├── notify-on-status-change/index.ts
    │   ├── send-invoice-email/index.ts
    │   └── whatsapp-webhook/index.ts
    └── migrations/
        ├── 20260721000000_rls_policies.sql
        ├── 20260721010000_sales.sql
        ├── 20260721011000_inventory_cost_price.sql
        ├── 20260722000000_salary_incentive_system.sql
        ├── 20260722000001_incentive_triggers.sql
        ├── 20260723000000_user_avatar_and_profile_rls.sql
        ├── 20260726000000_add_customer_gstin.sql
        ├── 20260727000000_remove_receptionist_incentive.sql
        ├── 20260727000001_redesign_salary_system.sql
        ├── 20260728000000_comprehensive_master_schema.sql
        ├── 20260728000001_fix_users_rls_recursion.sql
        ├── 20260728000002_add_created_at_to_notifications.sql
        ├── 20260728000003_create_storage_buckets.sql
        └── 20260728000004_extend_attendance_columns.sql
```

---

## 4. Admin Panel — Page-by-Page Reference

### 4.1 Overview Dashboard (`/`)
- **File path**: `admin-panel/src/app/(admin)/page.tsx`
- **Purpose**: Displays shop-wide operational metrics, active alerts, pie chart distribution of jobs, and recent job intake.
- **Access control**: Admin role required (`AdminLayout` guard + `AuthContext`).
- **UI/UX inventory**:
  - Banner: Welcome header with quick actions (`Create Job`, `Create Sale`, `Refresh`).
  - Stat Cards: 4 metric tiles (`Jobs Today`, `Completed This Week`, `Active Technicians`, `Pending Approvals`).
  - System Alerts Card: Displays pending staff approvals and low inventory warnings.
  - Pie Chart: Recharts interactive breakdown of today's jobs by status.
  - Table: Recent 10 jobs list with customer, technician, status badge, priority badge, and action link.
- **State**: `loading`, `error`, `refreshing`, `stats`, `pieData`, `recentJobs`, `alerts`.
- **Routes / navigation**: Navigates to `/jobs/new`, `/sales/new`, `/jobs/[id]`.
- **API / Supabase calls**:
  - `jobs`: `select(*, count)`, `select(status)`, `select(*, technician)`.
  - `users`: `select(count)` for active technicians, `select(name, role)` for pending users.
  - `inventory`: `select(item_name, quantity, low_stock_threshold)`.
- **Realtime subscriptions**: Subscribes to `jobs` and `users` tables.
- **External integrations**: None.

---

### 4.2 Login Page (`/login`)
- **File path**: `admin-panel/src/app/login/page.tsx`
- **Purpose**: Authenticates admin users into the web control panel.
- **Access control**: Public route; redirects authenticated admins to `/`.
- **UI/UX inventory**:
  - Card with RepairShop branding logo.
  - Form: Email input (`type="email"`), Password input (`type="password"`).
  - Submit Button: `Sign In` with spinner loading state.
  - Alert: Error toast banner for invalid credentials.
- **State**: `email`, `password`, `loading`, `error`.
- **Routes / navigation**: Redirects to `/` on successful login.
- **API / Supabase calls**:
  - `supabase.auth.signInWithPassword({ email, password })`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 4.3 Jobs List (`/jobs`)
- **File path**: `admin-panel/src/app/(admin)/jobs/page.tsx`
- **Purpose**: Comprehensive table for searching, filtering, and managing all customer repair jobs.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Header: Title and `New Job` button.
  - Filter Bar: Search input (Job code/customer/device), Status dropdown, Priority dropdown, Technician filter dropdown.
  - Table: Job Code, Customer Name, Device, Priority, Status, Assigned Technician, Created Date, Action links (`View`, `Print`).
  - Pagination Controls: Page size, previous/next page buttons.
- **State**: `jobs`, `loading`, `searchQuery`, `statusFilter`, `priorityFilter`, `technicianFilter`, `page`, `totalCount`.
- **Routes / navigation**: Navigates to `/jobs/new`, `/jobs/[id]`, `/jobs/[id]/print`.
- **API / Supabase calls**:
  - `jobs`: `select(*, technician:users!jobs_technician_id_fkey(name))` with filters and pagination.
  - `users`: `select(id, name)` for technician dropdown.
- **Realtime subscriptions**: Subscribes to `jobs` table changes.
- **External integrations**: None.

---

### 4.4 New Job Form (`/jobs/new`)
- **File path**: `admin-panel/src/app/(admin)/jobs/new/page.tsx`
- **Purpose**: Creates a new repair job intake with automatic PostgreSQL sequence job code generation.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Form Fields: Customer Name, Customer Contact (10-digit phone), Customer GSTIN (optional), Device Type, Brand, Model, Serial Number, Problem Description, Priority dropdown (`low`, `medium`, `high`, `urgent`), Estimated Cost, Expected Delivery Date, Technician assignment dropdown, Job Type dropdown.
  - Submit Button: `Create Job` with loading state.
  - Success Modal: Shows generated job code with options to view job or print receipt.
- **State**: `formData`, `technicians`, `jobTypes`, `submitting`, `createdJob`.
- **Routes / navigation**: Navigates back to `/jobs` or `/jobs/[id]`.
- **API / Supabase calls**:
  - `rpc('generate_job_code')`: Generates sequence job code `RS-YYYY-XXXX`.
  - `jobs`: `insert({...})`.
  - `users`: `select(id, name)` for technicians.
  - `job_types`: `select(id, name, base_price)`.
- **Realtime subscriptions**: None.
- **External integrations**: Triggers `notify-on-job-created` Edge Function via DB webhook.

---

### 4.5 Job Detail & Billing (`/jobs/[id]`)
- **File path**: `admin-panel/src/app/(admin)/jobs/[id]/page.tsx`
- **Purpose**: Detailed management view of a job including status updates, materials/parts logging, work notes, and final invoice billing.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Header: Job Code, Priority Badge, Status Badge, Quick Actions (`Print Receipt`, `Send WhatsApp`).
  - Section 1: Customer & Device details card.
  - Section 2: Technician assignment card with edit modal.
  - Section 3: Job Materials table (add part, quantity, cost, delete part).
  - Section 4: Work notes log with author timestamp.
  - Section 5: Billing & Invoice Card (Parts Total, Labour Charge, Tax %, Discount, Grand Total, Payment Status toggle, Save Invoice button).
- **State**: `job`, `materials`, `technicians`, `loading`, `saving`, `labourCharge`, `taxPercent`, `discount`, `paymentStatus`.
- **Routes / navigation**: Navigates to `/jobs`, `/jobs/[id]/print`.
- **API / Supabase calls**:
  - `jobs`: `select(*, technician:users(name))`, `update(...)`.
  - `job_materials`: `select(*)`, `insert(...)`, `delete(...)`.
  - `billing`: `select(*)`, `upsert(...)`.
- **Realtime subscriptions**: Subscribes to `jobs` and `job_materials` for current job ID.
- **External integrations**: WhatsApp ready-for-pickup deep link (`https://wa.me/...`).

---

### 4.6 Print Job Receipt (`/jobs/[id]/print`)
- **File path**: `admin-panel/src/app/(admin)/jobs/[id]/print/page.tsx`
- **Purpose**: Clean, print-optimized customer intake receipt view.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Clean black & white printable receipt layout.
  - RepairShop header, Job Code, Barcode placeholder, Customer details, Device info, Reported problems, Terms & Conditions footer.
  - Action: Floating `Print` button that invokes `window.print()`.
- **State**: `job`, `loading`.
- **Routes / navigation**: Print view.
- **API / Supabase calls**:
  - `jobs`: `select(*)`.
- **Realtime subscriptions**: None.
- **External integrations**: `window.print()`.

---

### 4.7 Job Types Catalog (`/job-types`)
- **File path**: `admin-panel/src/app/(admin)/job-types/page.tsx`
- **Purpose**: Manages preset service/repair categories and base prices.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Header: Title and `Add Job Type` button.
  - Table: Category Name, Code Prefix, Base Price (INR), Estimated Hours, Status toggle, Action buttons (`Edit`, `Delete`).
  - Modal: Add/Edit Job Type form (Name, Description, Base Price, Estimated Hours).
- **State**: `jobTypes`, `loading`, `isModalOpen`, `selectedType`.
- **Routes / navigation**: Stays on `/job-types`.
- **API / Supabase calls**:
  - `job_types`: `select(*)`, `insert(...)`, `update(...)`, `delete(...)`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 4.8 Sales List (`/sales`)
- **File path**: `admin-panel/src/app/(admin)/sales/page.tsx`
- **Purpose**: Lists direct point-of-sale transactions for parts/accessories sold without repair jobs.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Header: Title and `New Direct Sale` button.
  - Search & Date Filter bar.
  - Table: Invoice Code, Customer Name, Total Items, Subtotal, Tax, Discount, Grand Total, Payment Mode (`Cash`, `UPI`, `Card`), Sale Date.
- **State**: `sales`, `loading`, `search`, `startDate`, `endDate`.
- **Routes / navigation**: Navigates to `/sales/new`.
- **API / Supabase calls**:
  - `sales`: `select(*, items:sale_items(*))`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 4.9 New Direct Sale (`/sales/new`)
- **File path**: `admin-panel/src/app/(admin)/sales/new/page.tsx`
- **Purpose**: POS checkout interface for direct item sales with inventory auto-deduction.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Section 1: Customer details form (Name, Mobile, GSTIN).
  - Section 2: Item selector dropdown (fetches from inventory), Quantity input, Add to cart button.
  - Section 3: Cart table (Item, Unit Price, Qty, Total, Remove button).
  - Section 4: Discount & Tax inputs, Payment Method selector.
  - Checkout Button: Complete sale with sequence sale code `SALE-YYYY-XXXX`.
- **State**: `cart`, `inventoryItems`, `customerName`, `customerPhone`, `discount`, `taxPercent`, `paymentMethod`, `submitting`.
- **Routes / navigation**: Navigates back to `/sales`.
- **API / Supabase calls**:
  - `inventory`: `select(id, item_name, selling_price, quantity)`.
  - `sales`: `insert(...)`.
  - `sale_items`: `insert(...)`.
  - `inventory`: `update(quantity)` (deduct sold quantities).
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 4.10 Staff Management (`/staff`)
- **File path**: `admin-panel/src/app/(admin)/staff/page.tsx`
- **Purpose**: Staff directory, approval of pending registrations, role management, and base daily rate settings.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Tabs: `All Staff`, `Pending Approvals`, `Technicians`, `Receptionists`.
  - Table: Staff Avatar, Name, Email, Role, Status (`Active`/`Inactive`), Base Daily Rate, Actions (`Approve`, `Block/Unblock`, `Set Rates`).
  - Modal 1: Add New Staff Member (Email, Password, Name, Role).
  - Modal 2: Edit Staff Rates (Base Daily Rate, Overtime Hourly Rate).
- **State**: `staff`, `loading`, `activeTab`, `isAddModalOpen`, `isRateModalOpen`, `selectedStaff`.
- **Routes / navigation**: Stays on `/staff`.
- **API / Supabase calls**:
  - `users`: `select(*)`, `update(is_active, role)`.
  - `staff_rates`: `select(*)`, `upsert(...)`.
  - Edge Function: `admin-create-user` (to register new staff securely).
- **Realtime subscriptions**: Subscribes to `users` table changes.
- **External integrations**: None.

---

### 4.11 Inventory Management (`/inventory`)
- **File path**: `admin-panel/src/app/(admin)/inventory/page.tsx`
- **Purpose**: Stock control for spare parts and accessories with low-stock alerts.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Header: Summary stats (Total Items, Low Stock Count, Total Stock Value) and `Add Item` button.
  - Table: Item Name, SKU/Part #, Category, Cost Price, Selling Price, Quantity, Low Stock Threshold, Status Badge, Actions (`Edit`, `Restock`).
  - Modal: Add/Edit Inventory Item form.
- **State**: `items`, `loading`, `searchQuery`, `categoryFilter`, `isModalOpen`, `selectedItem`.
- **Routes / navigation**: Stays on `/inventory`.
- **API / Supabase calls**:
  - `inventory`: `select(*)`, `insert(...)`, `update(...)`, `delete(...)`.
- **Realtime subscriptions**: Subscribes to `inventory` table.
- **External integrations**: None.

---

### 4.12 Reports & Analytics (`/reports`)
- **File path**: `admin-panel/src/app/(admin)/reports/page.tsx`
- **Purpose**: Financial analytics, job throughput, sales revenue, and technician performance metrics.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Date Range Picker (`This Week`, `This Month`, `Custom Range`).
  - Summary Cards: Gross Revenue, Total Jobs Completed, Direct Sales Revenue, Net Profit estimate.
  - Charts: Revenue Trend Line Chart, Job Volume Bar Chart, Technician Job Breakdown Chart.
  - Export Button: `Export CSV Report`.
- **State**: `dateRange`, `loading`, `revenueData`, `jobData`, `techPerformance`.
- **Routes / navigation**: Stays on `/reports`.
- **API / Supabase calls**:
  - `billing`: `select(grand_total, created_at)`.
  - `sales`: `select(grand_total, created_at)`.
  - `jobs`: `select(id, status, technician_id, completed_at)`.
  - `expenditure`: `select(amount, created_at)`.
- **Realtime subscriptions**: None.
- **External integrations**: Client-side CSV generation & download.

---

### 4.13 Salary & Payroll (`/salary`)
- **File path**: `admin-panel/src/app/(admin)/salary/page.tsx`
- **Purpose**: Calculates monthly payroll including attendance, technician job completion incentives, overtime, advance deductions, and payout history.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Month Picker (Month & Year).
  - Table: Staff Name, Role, Days Present, Incentive Earnings (Technician), Base Daily Rate, Gross Salary, Advance Salary Deducted, Net Payable Salary, Payout Status badge, Action (`Record Payout`).
  - Modal: Record Salary Payment modal.
- **State**: `selectedMonth`, `selectedYear`, `salaryRecords`, `loading`, `isPayModalOpen`.
- **Routes / navigation**: Stays on `/salary`.
- **API / Supabase calls**:
  - `salary`: `select(*, user:users(name, role))`.
  - `payments`: `insert(type: 'salary')`.
  - Edge Function: `calculate-monthly-salary` RPC invocation.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 4.14 Expenditure Tracking (`/expenditure`)
- **File path**: `admin-panel/src/app/(admin)/expenditure/page.tsx`
- **Purpose**: Logs shop operational expenses (rent, utilities, vendor bills, tea/snacks, staff advances).
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Header: Total Expense summary card and `Add Expense` button.
  - Table: Category, Description, Amount (INR), Payment Mode, Date, Recorded By, Actions (`Delete`).
  - Modal: Add Expense modal (Category dropdown, Amount, Notes, Receipt Image upload).
- **State**: `expenses`, `loading`, `isModalOpen`, `formData`.
- **Routes / navigation**: Stays on `/expenditure`.
- **API / Supabase calls**:
  - `expenditure`: `select(*, recorded_by_user:users(name))`, `insert(...)`, `delete(...)`.
- **Realtime subscriptions**: Subscribes to `expenditure` table.
- **External integrations**: Supabase Storage upload for expense receipts.

---

### 4.15 Admin Settings (`/settings`)
- **File path**: `admin-panel/src/app/(admin)/settings/page.tsx`
- **Purpose**: Shop profile configuration, tax percentage defaults, invoice footer notes, and system backup configuration.
- **Access control**: Admin role required.
- **UI/UX inventory**:
  - Form Fields: Shop Name, Address, Contact Phone, Email, Default Tax % (GST), Currency Symbol (`₹`), Invoice Terms & Conditions text block.
  - Save Button: Save Shop Preferences.
- **State**: `settings`, `saving`, `message`.
- **Routes / navigation**: Stays on `/settings`.
- **API / Supabase calls**:
  - `shop_settings`: `select(*)`, `upsert(...)`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

## 5. Mobile App — Screen-by-Screen Reference

### 5.1 LoginScreen (Auth)
- **File path**: `RepairShopApp/src/screens/auth/LoginScreen.tsx`
- **Purpose**: Mobile login screen for all user roles (Admin, Receptionist, Technician).
- **Access control**: Public screen.
- **UI/UX inventory**:
  - Logo & App Header.
  - Form: Email input, Password input with toggle visibility eye icon.
  - Submit Button: `Sign In` button.
  - Error Banner: Displayed on failed authentication or inactive account.
- **State**: `email`, `password`, `loading`, `error`.
- **Routes / navigation**: Navigates to appropriate role navigator (`AdminNavigator`, `ReceptionistStack`, `TechnicianStack`) based on user role.
- **API / Supabase calls**:
  - `supabase.auth.signInWithPassword({ email, password })`.
  - `users`: `select(role, is_active)` for `auth.uid()`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 5.2 OverviewScreen (Admin)
- **File path**: `RepairShopApp/src/screens/admin/OverviewScreen.tsx`
- **Purpose**: Mobile overview dashboard for shop owner featuring daily metrics and quick access.
- **Access control**: Admin role required.
- **UI/UX inventory**: Quick stats cards, Recent Jobs list, Low Stock warning banner, Quick Navigation grid.
- **State**: `metrics`, `recentJobs`, `loading`.
- **Routes / navigation**: Navigates to `AdminJobs`, `Staff`, `Salary`, `Expenditure`, `Reports`.
- **API / Supabase calls**: `jobs`, `users`, `inventory` selects.
- **Realtime subscriptions**: Subscribes to `jobs`.
- **External integrations**: None.

---

### 5.3 AdminJobsScreen (Admin)
- **File path**: `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx`
- **Purpose**: Mobile job list view for Admin with status filters.
- **Access control**: Admin role.
- **UI/UX inventory**: Search bar, Status tabs, Job cards list.
- **State**: `jobs`, `filter`, `loading`.
- **Routes / navigation**: Navigates to `AdminJobDetail`.
- **API / Supabase calls**: `jobs`: `select(*)`.
- **Realtime subscriptions**: `jobs` table.
- **External integrations**: None.

---

### 5.4 AdminJobDetailScreen (Admin)
- **File path**: `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx`
- **Purpose**: Full job overview for Admin on mobile.
- **Access control**: Admin role.
- **UI/UX inventory**: Job status, Device details, Assigned technician, Materials list, Billing total.
- **State**: `job`, `materials`, `loading`.
- **Routes / navigation**: Back to `AdminJobs`.
- **API / Supabase calls**: `jobs`, `job_materials`, `billing` selects.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 5.5 StaffScreen (Admin)
- **File path**: `RepairShopApp/src/screens/admin/StaffScreen.tsx`
- **Purpose**: Mobile staff management & user activation toggle.
- **Access control**: Admin role.
- **UI/UX inventory**: Staff list with role badges, Active toggle switch, `Add Staff` FAB button.
- **State**: `staff`, `loading`.
- **Routes / navigation**: Navigates to `AdminCreateStaff`.
- **API / Supabase calls**: `users`: `select(*)`, `update(is_active)`.
- **Realtime subscriptions**: `users` table.
- **External integrations**: None.

---

### 5.6 AdminCreateStaffScreen (Admin)
- **File path**: `RepairShopApp/src/screens/admin/AdminCreateStaffScreen.tsx`
- **Purpose**: Form to register new receptionist or technician user accounts.
- **Access control**: Admin role.
- **UI/UX inventory**: Form fields: Name, Email, Password, Role selector (`receptionist`/`technician`), Phone.
- **State**: `formData`, `loading`.
- **Routes / navigation**: Back to `Staff`.
- **API / Supabase calls**: Edge Function `admin-create-user`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 5.7 SalaryScreen (Admin)
- **File path**: `RepairShopApp/src/screens/admin/SalaryScreen.tsx`
- **Purpose**: Mobile salary management and payment recording.
- **Access control**: Admin role.
- **UI/UX inventory**: Month selector, Staff salary cards list, Record Payment modal.
- **State**: `month`, `year`, `salaries`, `loading`.
- **Routes / navigation**: Stays on screen.
- **API / Supabase calls**: `salary`, `payments`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 5.8 ExpenditureScreen (Admin)
- **File path**: `RepairShopApp/src/screens/admin/ExpenditureScreen.tsx`
- **Purpose**: Mobile shop expense logging.
- **Access control**: Admin role.
- **UI/UX inventory**: Monthly expense list, Total summary, Add Expense modal with receipt camera capture.
- **State**: `expenses`, `isModalOpen`, `loading`.
- **Routes / navigation**: Stays on screen.
- **API / Supabase calls**: `expenditure`: `select(*)`, `insert(...)`.
- **Realtime subscriptions**: `expenditure` table.
- **External integrations**: Expo Camera / Image Picker, Supabase Storage `onsite-visits` upload.

---

### 5.9 ReportsScreen (Admin)
- **File path**: `RepairShopApp/src/screens/admin/ReportsScreen.tsx`
- **Purpose**: Mobile financial & job performance analytics.
- **Access control**: Admin role.
- **UI/UX inventory**: Revenue summary, Monthly trend cards, Job completion counts.
- **State**: `reportsData`, `loading`.
- **Routes / navigation**: Stays on screen.
- **API / Supabase calls**: `billing`, `sales`, `jobs` selects.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 5.10 DashboardScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx`
- **Purpose**: Main hub for receptionist role: customer intake, active jobs list, quick intake button.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Welcome banner, Today's Intake count, Pending Assignment count, Quick Actions grid (`New Intake`, `New Sale`, `Check In`).
- **State**: `stats`, `recentJobs`, `loading`.
- **Routes / navigation**: Navigates to `CustomerIntake`, `JobList`, `NewSale`, `Attendance`.
- **API / Supabase calls**: `jobs`: `select(*)`.
- **Realtime subscriptions**: `jobs` table.
- **External integrations**: None.

---

### 5.11 CustomerIntakeScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx`
- **Purpose**: Intake form to register customer device for repair.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Customer Name, Phone, Device Type, Model, Serial #, Issue description, Priority, Technician selector.
- **State**: `formData`, `technicians`, `submitting`.
- **Routes / navigation**: Navigates to `Billing` or `Dashboard`.
- **API / Supabase calls**: `rpc('generate_job_code')`, `jobs`: `insert(...)`, `users`: `select(*)`.
- **Realtime subscriptions**: None.
- **External integrations**: Push notification trigger to technician.

---

### 5.12 JobListScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/JobListScreen.tsx`
- **Purpose**: Filterable job list for receptionist.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Search input, Status pills, Job card items.
- **State**: `jobs`, `search`, `statusFilter`, `loading`.
- **Routes / navigation**: Navigates to `JobDetail`.
- **API / Supabase calls**: `jobs`: `select(*)`.
- **Realtime subscriptions**: `jobs` table.
- **External integrations**: None.

---

### 5.13 JobDetailScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx`
- **Purpose**: Job management view for receptionist with ready-for-pickup WhatsApp link & billing access.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Customer info, Device info, Status badge, Reassign technician button, WhatsApp notification button, Go to Billing button.
- **State**: `job`, `loading`.
- **Routes / navigation**: Navigates to `JobAssignment`, `Billing`.
- **API / Supabase calls**: `jobs`: `select(*)`.
- **Realtime subscriptions**: `jobs` table.
- **External integrations**: WhatsApp deep link (`https://wa.me/...`).

---

### 5.14 JobAssignmentScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx`
- **Purpose**: Reassigns a job to a different technician.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Current technician display, Radio list of active technicians, Reassign button.
- **State**: `technicians`, `selectedTechId`, `submitting`.
- **Routes / navigation**: Back to `JobDetail`.
- **API / Supabase calls**: `jobs`: `update(technician_id)`, `users`: `select(*)`.
- **Realtime subscriptions**: None.
- **External integrations**: Push notification to newly assigned technician.

---

### 5.15 BillingScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/BillingScreen.tsx`
- **Purpose**: Mobile billing and invoice generator for repair jobs.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Parts cost table, Labour charge input, Tax %, Discount, Grand Total preview, Payment Status toggle, Save & Print Receipt button.
- **State**: `labourCharge`, `taxPercent`, `discount`, `isPaid`, `submitting`.
- **Routes / navigation**: Back to `JobDetail`.
- **API / Supabase calls**: `billing`: `upsert(...)`, `jobs`: `update(status: 'Completed')`.
- **Realtime subscriptions**: None.
- **External integrations**: `expo-print` invoice receipt generation & Bluetooth thermal print.

---

### 5.16 NewSaleScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx`
- **Purpose**: POS mobile screen for direct sales.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Customer info inputs, Inventory search selector, Cart items list, Discount & Payment Mode, Complete Sale button.
- **State**: `cart`, `inventory`, `customerName`, `submitting`.
- **Routes / navigation**: Back to `Dashboard`.
- **API / Supabase calls**: `sales`: `insert(...)`, `inventory`: `update(quantity)`.
- **Realtime subscriptions**: None.
- **External integrations**: `expo-print` receipt.

---

### 5.17 PaymentsScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/PaymentsScreen.tsx`
- **Purpose**: View recent payment collections.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Payments list, Total collected today.
- **State**: `payments`, `loading`.
- **Routes / navigation**: Stays on screen.
- **API / Supabase calls**: `billing`: `select(*)`, `sales`: `select(*)`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 5.18 CustomersScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/CustomersScreen.tsx`
- **Purpose**: Directory of past customers with repair history counts.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Customer search, Customer card list (Name, Phone, Total Jobs).
- **State**: `customers`, `search`, `loading`.
- **Routes / navigation**: Stays on screen.
- **API / Supabase calls**: `jobs`: `select(customer_name, customer_contact)`.
- **Realtime subscriptions**: None.
- **External integrations**: Phone dialer link.

---

### 5.19 AnalyticsScreen (Receptionist)
- **File path**: `RepairShopApp/src/screens/receptionist/AnalyticsScreen.tsx`
- **Purpose**: Receptionist daily job throughput stats.
- **Access control**: Receptionist role.
- **UI/UX inventory**: Jobs created count, Jobs completed count, Revenue collected.
- **State**: `stats`, `loading`.
- **Routes / navigation**: Stays on screen.
- **API / Supabase calls**: `jobs`: `select(*)`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 5.20 TechnicianDashboardScreen (Technician)
- **File path**: `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx`
- **Purpose**: Dashboard for technician: assigned jobs summary, check-in status, incentive tracker.
- **Access control**: Technician role.
- **UI/UX inventory**: Welcome header, Check-in status card (`Checked In`/`Checked Out`), Assigned Jobs list, Monthly Incentive total card.
- **State**: `attendanceStatus`, `assignedJobs`, `incentiveTotal`, `loading`.
- **Routes / navigation**: Navigates to `MyJobs`, `UpdateWork`, `Attendance`.
- **API / Supabase calls**: `jobs`: `select(*) eq(technician_id, auth.uid())`, `attendance`: `select(*)`.
- **Realtime subscriptions**: Subscribes to `jobs` filtered by `technician_id=eq.${uid}`.
- **External integrations**: None.

---

### 5.21 MyJobsScreen (Technician)
- **File path**: `RepairShopApp/src/screens/technician/MyJobsScreen.tsx`
- **Purpose**: List of technician's assigned jobs filtered by status.
- **Access control**: Technician role.
- **UI/UX inventory**: Status tabs (`Assigned`, `In Progress`, `Waiting`, `Completed`), Job card list.
- **State**: `jobs`, `filter`, `loading`.
- **Routes / navigation**: Navigates to `UpdateWork`.
- **API / Supabase calls**: `jobs`: `select(*) eq(technician_id, auth.uid())`.
- **Realtime subscriptions**: Subscribes to `jobs` filtered by `technician_id`.
- **External integrations**: None.

---

### 5.22 UpdateWorkScreen (Technician)
- **File path**: `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx`
- **Purpose**: Allows technician to update job status, add materials used, log work notes, and start onsite visit flow.
- **Access control**: Technician role (restricted to assigned job ID).
- **UI/UX inventory**:
  - Job Header & Customer phone dial button.
  - Status Update buttons (`In Progress`, `Waiting for Materials`, `Completed`).
  - Materials Log section (add inventory item, quantity, list added parts).
  - Work Notes input field & post note button.
  - Onsite Visit button.
- **State**: `job`, `materials`, `workNoteText`, `submitting`.
- **Routes / navigation**: Navigates to `OnsiteVisit`.
- **API / Supabase calls**:
  - `jobs`: `update(status, completed_at)`.
  - `job_materials`: `insert(...)`.
  - `work_notes`: `insert(...)`.
- **Realtime subscriptions**: Subscribes to `job_materials` for current job.
- **External integrations**: Phone call deep link (`tel:...`).

---

### 5.23 OnsiteVisitScreen (Technician)
- **File path**: `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx`
- **Purpose**: Logs onsite customer visit with arrival/departure selfie and GPS verification.
- **Access control**: Technician role.
- **UI/UX inventory**:
  - Arrival Card: Camera preview, Take Arrival Selfie button, Capture GPS button, Submit Arrival.
  - Departure Card: Camera preview, Take Departure Selfie button, Capture GPS button, Submit Departure.
  - Status Badge: `Onsite Active` / `Completed`.
- **State**: `visitState`, `arrivalPhoto`, `departurePhoto`, `location`, `loading`.
- **Routes / navigation**: Back to `UpdateWork`.
- **API / Supabase calls**:
  - Supabase Storage upload to `onsite-visits` bucket.
  - `onsite_visits`: `insert(...)`, `update(...)`.
- **Realtime subscriptions**: None.
- **External integrations**: Expo Camera, Expo Location (High Accuracy GPS).

---

### 5.24 AttendanceScreen (Shared)
- **File path**: `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`
- **Purpose**: Shared selfie + GPS check-in / check-out screen for Receptionists and Technicians.
- **Access control**: Authenticated active staff (`receptionist`, `technician`).
- **UI/UX inventory**:
  - Date & Time Header.
  - Today's Status Card (`Checked In at 09:15 AM` / `Not Checked In`).
  - Front Camera Viewfinder.
  - Action Button: `Check In` / `Check Out`.
  - GPS Coordinates display (Latitude, Longitude, Accuracy).
  - 30-Day Attendance Log history list.
- **State**: `hasCheckedIn`, `todayRecord`, `photoUri`, `location`, `history`, `loading`.
- **Routes / navigation**: Stays on screen.
- **API / Supabase calls**:
  - Supabase Storage upload to `attendance-selfies` bucket.
  - `attendance`: `upsert(...)`.
  - `attendance`: `select(*)` for last 30 days.
- **Realtime subscriptions**: None.
- **External integrations**: Expo Camera (Front facing), Expo Location.

---

### 5.25 ProfileScreen (Shared)
- **File path**: `RepairShopApp/src/screens/shared/ProfileScreen.tsx`
- **Purpose**: Staff user profile view, avatar photo update, push token registration, and Sign Out.
- **Access control**: All authenticated roles.
- **UI/UX inventory**: Avatar Image with upload button, Staff Name, Email, Role badge, Phone, App Version, Sign Out button.
- **State**: `profile`, `avatarUri`, `uploading`.
- **Routes / navigation**: Redirects to `LoginScreen` on Sign Out.
- **API / Supabase calls**:
  - `users`: `select(*)`, `update(avatar_url, expo_push_token)`.
  - Supabase Storage upload to `avatars` bucket.
  - `supabase.auth.signOut()`.
- **Realtime subscriptions**: None.
- **External integrations**: Expo ImagePicker, Expo Notifications (Expo Push Token registration).

---

### 5.26 InventoryScreen (Shared)
- **File path**: `RepairShopApp/src/screens/shared/InventoryScreen.tsx`
- **Purpose**: Shared stock check screen for staff to view available parts and prices.
- **Access control**: All authenticated roles (Read-only for receptionist/technician).
- **UI/UX inventory**: Search input, Category filter pills, Item card list (Name, Part #, Available Qty, Price).
- **State**: `items`, `search`, `category`, `loading`.
- **Routes / navigation**: Stays on screen.
- **API / Supabase calls**: `inventory`: `select(*)`.
- **Realtime subscriptions**: `inventory` table.
- **External integrations**: None.

---

### 5.27 SalaryScreen (Shared)
- **File path**: `RepairShopApp/src/screens/shared/SalaryScreen.tsx`
- **Purpose**: Staff member personal salary slip view (Days Present, Incentives, Base Pay, Advances Deducted, Net Payable).
- **Access control**: Authenticated staff (queries only own user ID `user_id = auth.uid()`).
- **UI/UX inventory**: Month picker, Summary card, Earnings breakdown list, Advance salary deductions breakdown.
- **State**: `selectedMonth`, `salaryRecord`, `paymentsList`, `loading`.
- **Routes / navigation**: Stays on screen.
- **API / Supabase calls**: `salary`: `select(*) eq(user_id, auth.uid())`, `payments`: `select(*) eq(user_id, auth.uid())`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

### 5.28 NotificationsScreen (Shared)
- **File path**: `RepairShopApp/src/screens/shared/NotificationsScreen.tsx`
- **Purpose**: Push notification inbox and message logs for current staff user.
- **Access control**: All authenticated roles.
- **UI/UX inventory**: Notifications list with timestamp, read status indicator, `Mark All Read` button.
- **State**: `notifications`, `loading`.
- **Routes / navigation**: Navigates to relevant job screen on tap.
- **API / Supabase calls**: `notifications`: `select(*)`, `update(is_read)`.
- **Realtime subscriptions**: `notifications` table for `recipient_user_id=eq.${uid}`.
- **External integrations**: None.

---

### 5.29 InactiveUserScreen (Shared)
- **File path**: `RepairShopApp/src/screens/shared/InactiveUserScreen.tsx`
- **Purpose**: Block screen displayed when an inactive/blocked user attempts to access role features.
- **Access control**: Displayed to users where `is_active = false`.
- **UI/UX inventory**: Access Denied icon, Warning text, Contact Admin message, Sign Out button.
- **State**: None.
- **Routes / navigation**: Navigates to `LoginScreen` on Sign Out.
- **API / Supabase calls**: `supabase.auth.signOut()`.
- **Realtime subscriptions**: None.
- **External integrations**: None.

---

## 6. Full Route Map (Admin Panel)

| Route Path | File Path | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| `/login` | `admin-panel/src/app/login/page.tsx` | Public | Admin login authentication |
| `/` | `admin-panel/src/app/(admin)/page.tsx` | Admin | Overview dashboard & metrics |
| `/jobs` | `admin-panel/src/app/(admin)/jobs/page.tsx` | Admin | Jobs search & table list |
| `/jobs/new` | `admin-panel/src/app/(admin)/jobs/new/page.tsx` | Admin | New repair job intake form |
| `/jobs/[id]` | `admin-panel/src/app/(admin)/jobs/[id]/page.tsx` | Admin | Job detail, materials & billing |
| `/jobs/[id]/print` | `admin-panel/src/app/(admin)/jobs/[id]/print/page.tsx` | Admin | Printable customer receipt |
| `/job-types` | `admin-panel/src/app/(admin)/job-types/page.tsx` | Admin | Job categories & pricing catalog |
| `/sales` | `admin-panel/src/app/(admin)/sales/page.tsx` | Admin | Direct item sales transaction log |
| `/sales/new` | `admin-panel/src/app/(admin)/sales/new/page.tsx` | Admin | Direct sale POS checkout |
| `/staff` | `admin-panel/src/app/(admin)/staff/page.tsx` | Admin | Staff user directory & rates |
| `/inventory` | `admin-panel/src/app/(admin)/inventory/page.tsx` | Admin | Spare parts & inventory stock |
| `/reports` | `admin-panel/src/app/(admin)/reports/page.tsx` | Admin | Financial & job analytics |
| `/salary` | `admin-panel/src/app/(admin)/salary/page.tsx` | Admin | Monthly payroll & payout log |
| `/expenditure` | `admin-panel/src/app/(admin)/expenditure/page.tsx` | Admin | Operating expense tracking |
| `/settings` | `admin-panel/src/app/(admin)/settings/page.tsx` | Admin | Shop profile & tax configuration |

---

## 7. Full Navigator Map (Mobile App)

```text
RootNavigator (Switch on Auth & Role)
├── AuthStack
│   └── LoginScreen
├── AdminNavigator (Tab Navigator)
│   ├── OverviewScreen
│   ├── AdminJobsScreen (Stack -> AdminJobDetailScreen)
│   ├── StaffScreen (Stack -> AdminCreateStaffScreen)
│   ├── SalaryScreen
│   ├── ExpenditureScreen
│   ├── ReportsScreen
│   └── SharedStack (ProfileScreen, AttendanceScreen, NotificationsScreen)
├── ReceptionistStack (Tab Navigator)
│   ├── DashboardScreen
│   ├── CustomerIntakeScreen
│   ├── JobListScreen (Stack -> JobDetailScreen -> JobAssignmentScreen, BillingScreen)
│   ├── NewSaleScreen
│   ├── PaymentsScreen
│   ├── CustomersScreen
│   └── SharedStack (ProfileScreen, AttendanceScreen, InventoryScreen, NotificationsScreen)
├── TechnicianStack (Tab Navigator)
│   ├── TechnicianDashboardScreen
│   ├── MyJobsScreen (Stack -> UpdateWorkScreen -> OnsiteVisitScreen)
│   └── SharedStack (ProfileScreen, AttendanceScreen, SalaryScreen, NotificationsScreen)
└── InactiveUserScreen (Guard for is_active = false)
```

---

## 8. Database Schema Reference

Authoritative schema source: `supabase/migrations/20260728000000_comprehensive_master_schema.sql` and extension migrations.

### Table Definitions

```sql
-- 1. USERS
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'receptionist', 'technician')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  expo_push_token TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. JOB TYPES CATALOG
CREATE TABLE public.job_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  estimated_hours NUMERIC(5,2) DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. JOBS
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  customer_gstin TEXT,
  device_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  problem_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'In Progress', 'Waiting for Materials', 'Completed', 'Delivered', 'Cancelled')),
  technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  receptionist_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  estimated_cost NUMERIC(10,2),
  expected_delivery TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  job_type_id UUID REFERENCES public.job_types(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. JOB MATERIALS / PARTS
CREATE TABLE public.job_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_cost NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INVENTORY
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL UNIQUE,
  sku TEXT UNIQUE,
  category TEXT DEFAULT 'General',
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SALES (Direct POS)
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_code TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_contact TEXT,
  customer_gstin TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'NetBanking')),
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SALE ITEMS
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. BILLING / INVOICES
CREATE TABLE public.billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  parts_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  labour_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT DEFAULT 'Cash',
  billed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ATTENDANCE
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_selfie_url TEXT,
  check_out_selfie_url TEXT,
  check_in_latitude NUMERIC(10,7),
  check_in_longitude NUMERIC(10,7),
  check_out_latitude NUMERIC(10,7),
  check_out_longitude NUMERIC(10,7),
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'halfday', 'leave')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE(user_id, date)
);

-- 10. ONSITE VISITS
CREATE TABLE public.onsite_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  arrival_selfie_url TEXT,
  departure_selfie_url TEXT,
  arrival_latitude NUMERIC(10,7),
  arrival_longitude NUMERIC(10,7),
  departure_latitude NUMERIC(10,7),
  departure_longitude NUMERIC(10,7),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. STAFF RATES
CREATE TABLE public.staff_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  base_daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ot_rate_per_hour NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. SALARY RECORDS
CREATE TABLE public.salary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  present_days INTEGER NOT NULL DEFAULT 0,
  halfday_count INTEGER NOT NULL DEFAULT 0,
  total_incentive NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  base_daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  gross_salary NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  advance_deducted NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  net_salary NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'calculated' CHECK (status IN ('calculated', 'paid', 'partially_paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_month_year UNIQUE(user_id, month, year)
);

-- 13. PAYMENTS & EXPENDITURE
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  type TEXT NOT NULL CHECK (type IN ('advance_salary', 'salary_payout', 'expenditure')),
  category TEXT DEFAULT 'General',
  payment_method TEXT DEFAULT 'Cash',
  description TEXT,
  receipt_url TEXT,
  month INTEGER,
  year INTEGER,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. EXPENDITURE
CREATE TABLE public.expenditure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  receipt_url TEXT,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('push', 'whatsapp', 'whatsapp_inbound', 'whatsapp_status', 'email')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- 16. SHOP SETTINGS
CREATE TABLE public.shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL DEFAULT 'RepairShop',
  address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  tax_percent NUMERIC(5,2) DEFAULT 18.00,
  currency_symbol TEXT DEFAULT '₹',
  terms_and_conditions TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 9. RLS / Access Control Matrix

Authoritative Source: `supabase/migrations/20260721000000_rls_policies.sql`, `20260723000000_user_avatar_and_profile_rls.sql`, and `20260728000001_fix_users_rls_recursion.sql`.

| Table Name | Operation | Admin | Receptionist | Technician | Notes / Security Definition |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `users` | SELECT | ✅ | ✅ | ✅ | Public authenticated profile reading (non-recursive helper) |
| `users` | INSERT/UPDATE | ✅ | ❌ | ❌ (Own Avatar/Push Token) | Admins update roles/status; users update own token/avatar |
| `jobs` | SELECT | ✅ | ✅ | ✅ (Assigned Only) | Technician restricted to `technician_id = auth.uid()` |
| `jobs` | INSERT | ✅ | ✅ | ❌ | Intake permitted for Admin and Receptionist |
| `jobs` | UPDATE | ✅ | ✅ | ✅ (Assigned Only) | Technicians update status on assigned jobs |
| `job_materials` | SELECT/INSERT | ✅ | ✅ | ✅ (Assigned Only) | Technicians log parts on assigned jobs |
| `job_types` | SELECT | ✅ | ✅ | ✅ | Public catalog reading for job creation |
| `job_types` | INSERT/UPDATE/DELETE| ✅ | ❌ | ❌ | Admin catalog management only |
| `inventory` | SELECT | ✅ | ✅ | ✅ | Public inventory stock check |
| `inventory` | INSERT/UPDATE/DELETE| ✅ | ✅ (Sales Deduct) | ❌ | Admin & Receptionist (direct sales deduction) |
| `sales` & `sale_items` | ALL | ✅ | ✅ | ❌ | Receptionist POS direct sales allowed |
| `billing` | ALL | ✅ | ✅ | ❌ **(Blocked)** | **Technicians strictly prohibited from billing data** |
| `attendance` | SELECT | ✅ | ✅ (Own) | ✅ (Own) | Staff view own history; Admin views all |
| `attendance` | INSERT/UPSERT | ✅ | ✅ (Own) | ✅ (Own) | Staff check in/out for own user ID |
| `onsite_visits` | ALL | ✅ | ❌ | ✅ (Assigned Only) | Field technician selfie + GPS visit logging |
| `staff_rates` | ALL | ✅ | ❌ **(Blocked)** | ❌ **(Blocked)** | **Admin-only financial staff rates** |
| `salary` | ALL | ✅ | ❌ (Own Slip Read) | ❌ (Own Slip Read) | Admin calculates payroll; staff views own slip |
| `payments` & `expenditure`| ALL | ✅ | ❌ **(Blocked)** | ❌ **(Blocked)** | **Admin-only financial expenditure records** |
| `notifications` | SELECT/UPDATE | ✅ | ✅ (Recipient) | ✅ (Recipient) | Staff read/mark read own recipient messages |

---

## 10. Supabase Edge Functions Reference

| Function Name | Directory | Trigger Type | Expected Payload | Operations & External Services |
| :--- | :--- | :--- | :--- | :--- |
| `admin-create-user` | `supabase/functions/admin-create-user/` | HTTP POST | `{ email, password, name, role, phone }` | Uses `SUPABASE_SERVICE_ROLE_KEY` to create auth user & insert row in `public.users`. |
| `calculate-monthly-salary` | `supabase/functions/calculate-monthly-salary/` | HTTP POST | `{ month, year }` | Service role function calculating base pay, attendance, technician incentives, deducting advances, and writing `salary` rows. |
| `notify-on-job-created` | `supabase/functions/notify-on-job-created/` | Database Webhook (INSERT `jobs`) | `{ record: Job }` | Sends Expo Push to assigned technician & Twilio WhatsApp welcome message to customer. Logs to `notifications`. |
| `notify-on-status-change` | `supabase/functions/notify-on-status-change/` | Database Webhook (UPDATE `jobs.status`) | `{ record: Job, old_record: Job }` | Sends Expo Push to receptionist/admin and WhatsApp update to customer when status changes. |
| `send-invoice-email` | `supabase/functions/send-invoice-email/` | HTTP POST | `{ jobId, recipientEmail }` | Generates HTML invoice and sends via **Resend API**. Logs to `notifications`. |
| `whatsapp-webhook` | `supabase/functions/whatsapp-webhook/` | HTTP GET / POST (Meta Cloud API) | `GET: hub.challenge` / `POST: whatsapp_business_account` | Handles Meta Webhook verification challenge (GET) and processes incoming customer messages & delivery status updates (POST). |

---

## 11. Master API / Network Call Inventory

| # | File Location | Table / Endpoint | Operation | Trigger / Event |
|---:|:--- |:--- |:--- |:--- |
| 1 | `admin-panel/src/app/login/page.tsx` | `supabase.auth` | `signInWithPassword` | User submit login form |
| 2 | `admin-panel/src/app/(admin)/page.tsx` | `jobs` | `select(count)` | Overview mount / realtime |
| 3 | `admin-panel/src/app/(admin)/page.tsx` | `users` | `select(count)` | Overview mount / realtime |
| 4 | `admin-panel/src/app/(admin)/page.tsx` | `inventory` | `select(*)` | Overview low-stock alerts |
| 5 | `admin-panel/src/app/(admin)/jobs/page.tsx` | `jobs` | `select(*, technician)` | Jobs list pagination & filters |
| 6 | `admin-panel/src/app/(admin)/jobs/new/page.tsx` | `rpc('generate_job_code')` | `rpc` | On form load / job code generation |
| 7 | `admin-panel/src/app/(admin)/jobs/new/page.tsx` | `jobs` | `insert` | Create Job submit |
| 8 | `admin-panel/src/app/(admin)/jobs/[id]/page.tsx` | `jobs` | `select`, `update` | Job detail load & status update |
| 9 | `admin-panel/src/app/(admin)/jobs/[id]/page.tsx` | `job_materials` | `select`, `insert`, `delete` | Parts logging |
| 10 | `admin-panel/src/app/(admin)/jobs/[id]/page.tsx` | `billing` | `select`, `upsert` | Invoice billing save |
| 11 | `admin-panel/src/app/(admin)/job-types/page.tsx` | `job_types` | `select`, `insert`, `update` | Catalog management |
| 12 | `admin-panel/src/app/(admin)/sales/page.tsx` | `sales` | `select(*, sale_items)` | POS Sales list |
| 13 | `admin-panel/src/app/(admin)/sales/new/page.tsx` | `sales`, `sale_items` | `insert` | Checkout POS sale |
| 14 | `admin-panel/src/app/(admin)/sales/new/page.tsx` | `inventory` | `update(quantity)` | Deduct inventory stock |
| 15 | `admin-panel/src/app/(admin)/staff/page.tsx` | `users` | `select`, `update` | Staff status & role approval |
| 16 | `admin-panel/src/app/(admin)/staff/page.tsx` | `staff_rates` | `select`, `upsert` | Base daily rate setup |
| 17 | `admin-panel/src/app/(admin)/staff/page.tsx` | Edge: `admin-create-user` | `functions.invoke` | Create new staff account |
| 18 | `admin-panel/src/app/(admin)/inventory/page.tsx` | `inventory` | `select`, `insert`, `update`, `delete` | Stock control CRUD |
| 19 | `admin-panel/src/app/(admin)/reports/page.tsx` | `billing`, `sales`, `expenditure` | `select` | Analytics metrics |
| 20 | `admin-panel/src/app/(admin)/salary/page.tsx` | `salary`, `payments` | `select`, `insert` | Payroll calculation & payout |
| 21 | `admin-panel/src/app/(admin)/expenditure/page.tsx` | `expenditure` | `select`, `insert`, `delete` | Expense tracking |
| 22 | `admin-panel/src/app/(admin)/settings/page.tsx` | `shop_settings` | `select`, `upsert` | Save shop configuration |
| 23 | `RepairShopApp/src/screens/auth/LoginScreen.tsx` | `supabase.auth` | `signInWithPassword` | Mobile app login |
| 24 | `RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx` | `rpc('generate_job_code')` | `rpc` | Mobile job intake |
| 25 | `RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx` | `jobs` | `insert` | Mobile job submit |
| 26 | `RepairShopApp/src/screens/receptionist/BillingScreen.tsx` | `billing` | `upsert` | Mobile invoice billing |
| 27 | `RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx` | `sales`, `sale_items` | `insert` | Mobile POS sale checkout |
| 28 | `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx` | `jobs` | `update(status)` | Technician work update |
| 29 | `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx` | `job_materials` | `insert` | Log used parts |
| 30 | `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx` | Storage: `onsite-visits` | `upload` | Onsite selfie upload |
| 31 | `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx` | `onsite_visits` | `insert`, `update` | Arrival & Departure log |
| 32 | `RepairShopApp/src/screens/shared/AttendanceScreen.tsx` | Storage: `attendance-selfies` | `upload` | Attendance selfie upload |
| 33 | `RepairShopApp/src/screens/shared/AttendanceScreen.tsx` | `attendance` | `upsert` | Check in / Check out record |
| 34 | `RepairShopApp/src/screens/shared/ProfileScreen.tsx` | Storage: `avatars` | `upload` | Avatar photo upload |
| 35 | `RepairShopApp/src/screens/shared/ProfileScreen.tsx` | `users` | `update(avatar_url, expo_push_token)` | Profile update |
| 36 | `RepairShopApp/src/screens/shared/NotificationsScreen.tsx` | `notifications` | `select`, `update(is_read)` | Push notification inbox |

---

## 12. Design System & UI/UX Reference

### Web Admin Tokens (`admin-panel/src/app/globals.css`)
- **Canvas / Surfaces**: Base Canvas (`#F8FAFC`), Surface (`#FFFFFF`), Subtle background (`#F1F5F9`), Dark Slate Sidebar (`#0F172A`).
- **Brand Accents**: Primary Indigo Accent (`#6366F1`), Hover Accent (`#4F46E5`), Accent Dim (`rgba(99, 102, 241, 0.10)`).
- **Typography**: Sans (`var(--font-inter)`), Mono (`var(--font-jetbrains-mono)`). Primary Text (`#0F172A`), Muted Text (`#64748B`).
- **Radius System**: Small (`8px`), Medium (`12px`), Large (`16px`), Extra Large (`20px`).
- **Shadows**: Card Shadow (`0 4px 6px -1px rgba(0, 0, 0, 0.05)`), Modal Shadow (`0 20px 25px -5px rgba(0, 0, 0, 0.1)`).
- **Utilities**: `.table-sticky-header`, `.skeleton-pulse`, `.custom-scrollbar`.

### Shared UI Components (`packages/shared/src/badgeConfig.ts`)
Standardized status pill colors across Web & Mobile platforms:
- **Received**: Slate Gray (`#64748B` / `#F1F5F9`).
- **In Progress**: Blue (`#0284C7` / `#E0F2FE`).
- **Waiting for Materials**: Amber / Warning (`#D97706` / `#FEF3C7`).
- **Completed**: Emerald Green (`#059669` / `#D1FAE5`).
- **Urgent Priority**: Red Danger (`#DC2626` / `#FEE2E2`).

---

## 13. State Management Overview

### 1. `AuthContext` (Web Admin: `admin-panel/src/context/AuthContext.tsx`)
- **State Held**: `user` (Supabase Auth User), `profile` (Row from `public.users`), `role` (`'admin'`), `isActive` (`boolean`), `isLoading` (`boolean`).
- **Methods**: `signOut()`, `refreshProfile()`.
- **Consumers**: `AdminLayout`, `Sidebar`, `Topbar`, all Admin Pages.

### 2. `AuthContext` (Mobile App: `RepairShopApp/src/context/AuthContext.tsx`)
- **State Held**: `user`, `profile`, `role` (`'admin' | 'receptionist' | 'technician'`), `isActive`, `isLoading`.
- **Methods**: `login(email, password)`, `signOut()`, `refreshProfile()`.
- **Consumers**: `RootNavigator`, `AdminNavigator`, `ReceptionistStack`, `TechnicianStack`, all mobile screens.

---

## 14. Business Logic & Formulas Reference

### 1. Job Code Generation (PostgreSQL Server-Side Sequence)
*Implementation File*: `supabase/migrations/20260728000000_comprehensive_master_schema.sql`
```sql
CREATE SEQUENCE public.job_code_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_job_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  seq_num TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  seq_num := LPAD(NEXTVAL('public.job_code_seq')::TEXT, 4, '0');
  RETURN 'RS-' || current_year || '-' || seq_num;
END;
$$;
```

### 2. Invoice Grand Total Formula
*Implementation File*: `packages/shared/src/billing.ts`
```typescript
export function calculateBillingTotals(
  partsTotal: number,
  labourCharge: number,
  taxPercent: number,
  discount: number
): { subtotal: number; taxAmount: number; grandTotal: number } {
  const subtotal = Math.max(0, partsTotal + labourCharge);
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const grandTotal = Math.max(0, Math.round((subtotal + taxAmount - discount) * 100) / 100);
  return { subtotal, taxAmount, grandTotal };
}
```

### 3. Net Salary Calculation Formula
*Implementation File*: `supabase/functions/calculate-monthly-salary/index.ts`
```text
present_pay       = present_days * base_daily_rate
halfday_pay       = halfday_count * (base_daily_rate / 2)
total_incentive   = SUM(job_type.base_price * 0.10) for completed jobs (Technician only)
gross_salary      = present_pay + halfday_pay + total_incentive
advance_deducted  = SUM(payments.amount WHERE type = 'advance_salary' AND user_id = X AND month = Y)
net_salary        = Math.max(0, gross_salary - advance_deducted)
```

---

## 15. Shared Package Reference

**Package Name**: `@repairshop/shared` (`packages/shared/`)

### Exported Modules:
1. `types.ts`: Central domain interfaces (`User`, `Job`, `JobMaterial`, `Billing`, `Sale`, `InventoryItem`, `Attendance`, `Notification`, `SalaryRecord`).
2. `billing.ts`: `calculateBillingTotals()` function.
3. `phone.ts`: `formatE164Phone()` (formats numbers with `+91` prefix for Indian numbers).
4. `formatCurrency.ts`: `formatINR(amount)` (formats numbers with `₹` and Indian comma separators).
5. `badgeConfig.ts`: `STATUS_BADGE_CONFIG`, `PRIORITY_BADGE_CONFIG`.
6. `storageUrlCache.ts`: Helper for signed Supabase Storage URLs.

---

## 16. Appendix: Full File Inventory

```text
admin-panel/src/app/globals.css - Master design system tokens, sticky headers, skeleton animations
admin-panel/src/app/layout.tsx - Root HTML layout with AuthProvider wrapper
admin-panel/src/app/login/page.tsx - Web admin login authentication page
admin-panel/src/app/(admin)/layout.tsx - Protected admin layout wrapper with sidebar and topbar
admin-panel/src/app/(admin)/page.tsx - Admin overview dashboard with metrics and pie chart
admin-panel/src/app/(admin)/jobs/page.tsx - Jobs list table with search and pagination
admin-panel/src/app/(admin)/jobs/new/page.tsx - New job intake form with auto sequence code
admin-panel/src/app/(admin)/jobs/[id]/page.tsx - Job detail view with materials log & invoice billing
admin-panel/src/app/(admin)/jobs/[id]/print/page.tsx - Print-ready customer repair receipt
admin-panel/src/app/(admin)/job-types/page.tsx - Job types and repair pricing catalog management
admin-panel/src/app/(admin)/sales/page.tsx - Direct POS sales transaction log
admin-panel/src/app/(admin)/sales/new/page.tsx - Direct POS sale checkout form
admin-panel/src/app/(admin)/staff/page.tsx - Staff user management, role approvals, and base rates
admin-panel/src/app/(admin)/inventory/page.tsx - Inventory stock control and low-stock alerts
admin-panel/src/app/(admin)/reports/page.tsx - Financial analytics and CSV export
admin-panel/src/app/(admin)/salary/page.tsx - Monthly payroll calculation and payout recording
admin-panel/src/app/(admin)/expenditure/page.tsx - Shop operational expense tracking
admin-panel/src/app/(admin)/settings/page.tsx - Shop preferences and invoice tax settings
RepairShopApp/src/context/AuthContext.tsx - Mobile React Native authentication context
RepairShopApp/src/navigation/RootNavigator.tsx - Mobile role-based navigator dispatcher
RepairShopApp/src/navigation/AdminNavigator.tsx - Mobile admin tab navigator stack
RepairShopApp/src/navigation/ReceptionistStack.tsx - Mobile receptionist tab navigator stack
RepairShopApp/src/navigation/TechnicianStack.tsx - Mobile technician tab navigator stack
RepairShopApp/src/screens/auth/LoginScreen.tsx - Mobile user login screen
RepairShopApp/src/screens/admin/OverviewScreen.tsx - Mobile admin dashboard screen
RepairShopApp/src/screens/admin/AdminJobsScreen.tsx - Mobile admin job list view
RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx - Mobile admin job detail view
RepairShopApp/src/screens/admin/StaffScreen.tsx - Mobile staff approval & user toggle screen
RepairShopApp/src/screens/admin/AdminCreateStaffScreen.tsx - Mobile staff user registration screen
RepairShopApp/src/screens/admin/SalaryScreen.tsx - Mobile payroll management screen
RepairShopApp/src/screens/admin/ExpenditureScreen.tsx - Mobile expense log screen
RepairShopApp/src/screens/admin/ReportsScreen.tsx - Mobile analytics screen
RepairShopApp/src/screens/receptionist/DashboardScreen.tsx - Receptionist mobile dashboard screen
RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx - Customer job intake screen
RepairShopApp/src/screens/receptionist/JobListScreen.tsx - Receptionist job list screen
RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx - Receptionist job detail screen
RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx - Technician job re-assignment screen
RepairShopApp/src/screens/receptionist/BillingScreen.tsx - Receptionist invoice & billing screen
RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx - Receptionist direct POS checkout screen
RepairShopApp/src/screens/receptionist/PaymentsScreen.tsx - Receptionist payment collections screen
RepairShopApp/src/screens/receptionist/CustomersScreen.tsx - Receptionist customer directory screen
RepairShopApp/src/screens/receptionist/AnalyticsScreen.tsx - Receptionist performance analytics screen
RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx - Technician dashboard screen
RepairShopApp/src/screens/technician/MyJobsScreen.tsx - Assigned technician jobs list screen
RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx - Technician work notes & parts log screen
RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx - Onsite visit selfie & GPS log screen
RepairShopApp/src/screens/shared/AttendanceScreen.tsx - Shared selfie & GPS check-in/out screen
RepairShopApp/src/screens/shared/ProfileScreen.tsx - Shared staff profile & avatar upload screen
RepairShopApp/src/screens/shared/InventoryScreen.tsx - Shared stock catalog check screen
RepairShopApp/src/screens/shared/SalaryScreen.tsx - Shared staff personal salary slip screen
RepairShopApp/src/screens/shared/NotificationsScreen.tsx - Shared push notification inbox screen
RepairShopApp/src/screens/shared/InactiveUserScreen.tsx - Block screen for inactive user accounts
supabase/functions/admin-create-user/index.ts - Edge Function for secure staff user creation
supabase/functions/calculate-monthly-salary/index.ts - Edge Function for monthly payroll calculation
supabase/functions/notify-on-job-created/index.ts - Edge Function for job creation notifications
supabase/functions/notify-on-status-change/index.ts - Edge Function for job status change notifications
supabase/functions/send-invoice-email/index.ts - Edge Function for email invoice delivery via Resend
supabase/functions/whatsapp-webhook/index.ts - Edge Function for Meta WhatsApp Cloud API webhooks
```
