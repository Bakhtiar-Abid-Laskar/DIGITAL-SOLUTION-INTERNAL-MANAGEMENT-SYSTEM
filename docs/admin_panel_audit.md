# RepairShop Web Admin Panel — Comprehensive Functional & Architectural Audit Report

## 1. Executive Summary & System Identity

- **Application Name**: RepairShop Web Admin Panel
- **Project Role**: Central Command & Operations Management Portal for Business Owners and Admin Staff
- **Primary Domain & Stack**:
  - **Framework**: Next.js 14 (App Router) with React 19 & TypeScript 5
  - **Styling & Design Token System**: Custom Dark Slate & Indigo Palette via Tailwind CSS (`admin-*` token namespace)
  - **Backend & Database**: Supabase PostgreSQL, Supabase Auth, Supabase Storage, and Supabase Realtime Channels
  - **Visualization & Utility Libraries**: Recharts (Pie & Bar charts), Lucide React Icons, HTML2Canvas / JSPDF for invoice export
- **Security & Access Boundary**:
  - Exclusively accessible by users authenticated with `role = 'admin'` and `is_active = true`.
  - Non-admin users attempting access are blocked at the route level and redirected to `/login` or denied access via PostgreSQL Row Level Security (RLS).

---

## 2. Global Application Shell & Infrastructure Components

### 2.1 Navigation & Layout Architecture (`Sidebar.tsx`, `layout.tsx`)
- **Sidebar Menu**: Fixed left-hand navigation sidebar (responsive collapsible drawer on mobile viewports) rendering main navigation items:
  1. **Overview** (`/`) — System metrics, real-time alerts, quick actions, pie chart breakdowns, recent jobs stream.
  2. **Jobs** (`/jobs`) — Master repair job listing, status filters, search, technician assignment, CSV exports.
  3. **Job Types** (`/job-types`) — Catalog management for standard repair services, base charges, and incentive rates.
  4. **Sales** (`/sales`) — Direct sales history, customer details, payment method filters, total revenue tracking.
  5. **Staff** (`/staff`) — Employee accounts, role approvals, activation toggles, staff rates, and attendance logs.
  6. **Inventory** (`/inventory`) — Spare parts & accessories catalog, quantity adjustments, low-stock threshold triggers.
  7. **Reports** (`/reports`) — Financial analytics, jobs completion rates, technician productivity, expenditure breakdowns.
  8. **Salary** (`/salary`) — Monthly salary calculations, attendance deductions, overtime calculations, advance salary logs.
  9. **Expenditure** (`/expenditure`) — Shop petty cash, daily expense logging, materials purchase records.
  10. **Settings** (`/settings`) — System configurations, company profile, notification settings, data backup options.
- **Top Header Bar**: Displays global search bar, notification badge counter with drop-down feed, system status pill ("Live Sync Active"), and currently logged-in Admin avatar/email badge with Log Out trigger.

### 2.2 Global Auth & Realtime Context Providers
- **`AuthContext.tsx`**: Listens to Supabase Auth state changes (`onAuthStateChange`). Fetches `public.users` row matching `auth.uid()`. Stores `session`, `user`, and `profile` in React context. Blocks unapproved/inactive users.
- **`ToastProvider.tsx` / `Toast.tsx`**: Floating notification system supporting `'success'`, `'error'`, `'info'`, and `'warning'` toast banners.
- **Supabase Realtime Channel (`postgres_changes`)**: Subscribes to live updates on `jobs`, `attendance`, `inventory`, `billing`, and `users` tables to update state across screens without full page refreshes.

---

## 3. Screen-by-Screen Detailed Audit

---

### 3.1 Authentication Screen (`/login`)

#### Page Route & Access Control
- **Route Path**: `/login`
- **Access Permission**: Public (unauthenticated). Redirects automatically to `/` if an active admin session already exists.

#### 1. Functional Features & Capabilities
- Email & Password authentication against Supabase Auth (`signInWithPassword`).
- Active admin account verification (`role === 'admin'` and `is_active === true`).
- Inline password reset link dispatcher (`resetPasswordForEmail`).
- Animated focus states and toast error handling for invalid credentials.

#### 2. UI Elements & Component Catalog
- **Cards**: Single centered glassmorphism login card.
- **Inputs**: Email text input (`type="email"`), Password text input with show/hide toggle (`Eye` / `EyeOff` icons).
- **Buttons**: `Sign In` primary action button (with loading spinner state), `Forgot password?` button.
- **Alerts**: Toast error banner displayed on auth failure.

#### 3. Backend & Frontend Data Connections
- **Supabase Auth**: `supabase.auth.signInWithPassword({ email, password })`.
- **Database Table**: Query `public.users` where `id = auth.uid()` to verify `role = 'admin'` and `is_active = true`.

#### 4. User Workflows & Access Controls
1. Admin enters credentials -> Clicks `Sign In`.
2. App authenticates with Supabase Auth -> Checks user role in `public.users`.
3. If valid Admin -> Stores session -> Navigates to `/`.
4. If non-admin or inactive -> Signs out session -> Displays error toast ("Access restricted to active Admin accounts").

---

### 3.2 Overview / Dashboard Page (`/`)

#### Page Route & Access Control
- **Route Path**: `/`
- **Access Permission**: Admin only (`AuthContext` protected).

#### 1. Functional Features & Capabilities
- **Real-Time KPI Cards**:
  - **Jobs Today**: Total jobs received today.
  - **Completed This Week**: Jobs marked completed in the last 7 days.
  - **Active Technicians**: Total count of active staff members with `role = 'technician'`.
  - **Pending Approvals**: User registration accounts awaiting admin approval.
- **Interactive Visualizations**:
  - `JobsPieChart`: Status breakdown of active jobs (`Received`, `In Progress`, `Waiting for Materials`, `Completed`).
- **Realtime Alerts Feed**: Live alerts for pending user approvals, low-stock inventory items (`quantity <= 5`), and urgent unassigned jobs.
- **Recent Repair Jobs Feed**: Real-time table of the 10 most recent jobs with status pills, assigned technician names, and quick action shortcuts.
- **Quick Action Bar**: Buttons to create a new job, create a sale, view staff, or view inventory.

#### 2. UI Elements & Component Catalog
- **Cards**: 4 KPI metric cards, Chart container card, Alerts feed card, Recent Jobs table card.
- **Tables**: Recent Jobs table (Columns: Job Code, Customer, Device, Status, Priority, Technician, Date, Actions).
- **Badges**: Status badges (`StatusBadge`), Priority badges (`PriorityBadge`).
- **Buttons**: `New Job` (+ icon), `New Sale` (+ icon), `Refresh Data` button, `View All Jobs` button.

#### 3. Backend & Frontend Data Connections
- **Database Tables Queried**: `jobs`, `users`, `inventory`, `billing`.
- **Parallel Queries**: `Promise.all` fetching today's jobs count, completed jobs, active techs count, pending approval users count, low stock items, and top 10 recent jobs.
- **Realtime Channel**: Listens to `postgres_changes` on `jobs` and `inventory` to refresh metrics live.

#### 4. User Workflows & Access Controls
- Admin lands on dashboard -> Views real-time snapshot of business operations.
- Clicking any job row navigates directly to `/jobs/[id]`.
- Clicking "Pending user approvals" alert navigates to `/staff`.

---

### 3.3 Repair Jobs Management Feed Page (`/jobs`)

#### Page Route & Access Control
- **Route Path**: `/jobs`
- **Access Permission**: Admin only.

#### 1. Functional Features & Capabilities
- **Multi-Tab Status Filtering**: Tabs for `All`, `Received`, `In Progress`, `Waiting for Materials`, `Completed`.
- **Advanced Filtering Bar**:
  - Search input (debounced by 300ms) matching job code, customer name, or customer contact number.
  - Technician dropdown filter.
  - Priority dropdown filter (`All`, `Normal`, `High`, `Urgent`).
  - Date range filters (Date From / Date To).
- **Bulk CSV Export**: Generates and downloads a `.csv` file containing filtered repair job records (`exportJobsToCSV`).
- **Quick Technician Reassignment Modal**: Inline modal allowing the Admin to reassign any job to another active technician instantly.

#### 2. UI Elements & Component Catalog
- **Header**: `PageHeader` with title, subtitle, `Create New Job` primary button, and `Export CSV` secondary button.
- **Filter Controls**: `Tabs` component, search `Input`, `Select` dropdowns for technician/priority, date pickers.
- **Table**: Jobs master table with pagination controls (`Pagination` component, 20 jobs per page).
- **Modals**: `ReassignTechnicianModal` (Technician selection dropdown, Save button, Cancel button).

#### 3. Backend & Frontend Data Connections
- **Database Query**: `supabase.from('jobs').select('*, technician:users!jobs_technician_id_fkey(name)', { count: 'exact' })`.
- **Foreign Key Join**: `jobs.technician_id -> users.id`.
- **Pagination Logic**: Supabase `.range(from, to)`.

#### 4. User Workflows & Access Controls
1. Filter jobs by technician, priority, date range, or status tab.
2. Click `Reassign` icon on any job row -> Select new technician in modal -> Click Save -> Database updates `technician_id` -> Toast confirms success.
3. Click `Export CSV` -> Downloads `.csv` file of currently filtered dataset.

---

### 3.4 New Job Intake Creation Page (`/jobs/new`)

#### Page Route & Access Control
- **Route Path**: `/jobs/new`
- **Access Permission**: Admin & Receptionist.

#### 1. Functional Features & Capabilities
- Customer intake form with auto-generated server-side job code (`generate_job_code()` RPC).
- Pre-configured service catalog integration: Selecting a `Job Type` automatically populates default charges and receptionist/technician incentive rates.
- Form validation for required customer details, device category, priority, and assigned technician.

#### 2. UI Elements & Component Catalog
- **Cards**: Single structured form container card.
- **Form Inputs**: Customer Name (`TextInput`), Contact Number (`phone-pad`), Customer Email, Device Type dropdown (`Laptop`, `PC`, `Other`), Priority dropdown (`Normal`, `High`, `Urgent`), Job Type catalog dropdown, Technician dropdown, Reported Issue (`Textarea`), Remarks (`Textarea`).
- **Buttons**: `Create Job` submit button, `Cancel` button.

#### 3. Backend & Frontend Data Connections
- **RPC Function**: `supabase.rpc('generate_job_code')` returning sequence-based job code (`RS-YYYY-XXXX`).
- **Database Tables**:
  - Read: `job_types` (active catalog items), `users` (active technicians).
  - Insert: `jobs` row (`job_code`, `customer_name`, `customer_contact`, `customer_email`, `device_type`, `priority`, `technician_id`, `reported_issue`, `remarks`, `receptionist_id`).

#### 4. User Workflows & Access Controls
1. Fill in customer details -> Select device type & priority.
2. Select assigned technician -> Enter reported issue.
3. Click `Create Job` -> RPC generates job code -> Job row inserted into Supabase -> Admin redirected to `/jobs/[id]`.

---

### 3.5 Job Detail & Management Workspace Page (`/jobs/[id]`)

#### Page Route & Access Control
- **Route Path**: `/jobs/[id]`
- **Access Permission**: Admin (full edit/manage/delete access), Receptionist (read/bill access), Technician (assigned view only).

#### 1. Functional Features & Capabilities
- **Tabbed Interface**:
  - **Overview Tab**: Complete job summary, status updater, customer details, assigned technician info, repair notes, and onsite visit history.
  - **Materials Tab**: Materials used logger (material name, quantity, unit cost, auto-calculated total cost).
  - **Billing & Invoice Tab**: Parts total + labor charge - discount + tax % = Grand Total calculation. Invoice PDF generation and print actions.
  - **Activity Log Tab**: Timestamped status updates and note edits.
- **Status Transition Workflow**: Buttons to advance job status (`Received` -> `In Progress` -> `Waiting for Materials` -> `Completed`). Automatically populates `completed_at` timestamp when completed.
- **WhatsApp Customer Alert**: Button generating pre-filled `wa.me` WhatsApp message link to notify customer job is ready.
- **Destructive Job Deletion**: Admin confirmation modal to permanently delete a job record.

#### 2. UI Elements & Component Catalog
- **Header**: Job Code header with status badge, priority badge, `Print Receipt` button, `Notify via WhatsApp` button, `Delete Job` button.
- **Tabs**: `OverviewTab`, `MaterialsTab`, `BillingTab`, `ActivityLogTab`.
- **Inputs**: Status selector, Work Notes textarea, Labor Charge input, Discount input, Tax % input.
- **Modals**: `ConfirmationModal` for job deletion and technician reassignment.

#### 3. Backend & Frontend Data Connections
- **Database Tables**:
  - `jobs`: Full single row fetch with technician join.
  - `job_materials`: Select & insert/delete material rows for `job_id`.
  - `billing`: Upsert billing summary row.
  - `onsite_visits`: Select technician arrival/departure selfies & GPS coordinates.
  - `attendance`: Technician check-in context.
- **Supabase Storage**: Retrieves signed URLs for onsite visit selfies (`onsite-visits` bucket).

#### 4. User Workflows & Access Controls
1. Update status to `In Progress` or `Completed` -> Saves instantly to DB.
2. Log materials used -> Auto-updates billing subtotal.
3. Enter labor charge & discount -> Saves to `billing` table -> Click `Print Receipt` -> Opens printable invoice view.

---

### 3.6 Job Receipt Print View Page (`/jobs/[id]/print`)

#### Page Route & Access Control
- **Route Path**: `/jobs/[id]/print`
- **Access Permission**: Admin & Receptionist.

#### 1. Functional Features & Capabilities
- Clean, print-formatted paper layout tailored for POS paper or standard A4 invoice printing.
- Auto-triggers browser print dialog (`window.print()`) on load.
- Displays business branding ("RepairShop"), job code barcode placeholder, customer details, device issue summary, itemized materials & labor charges, grand total, and shop terms & conditions.

#### 2. UI Elements & Component Catalog
- **Branding Header**: Company logo & address block.
- **Receipt Cards**: Customer Info box, Job Info box, Line items table, Summary total box.
- **Buttons**: `Print Now` floating button, `Back to Job` button.

#### 3. Backend & Frontend Data Connections
- Reads single `jobs` record and associated `billing` & `job_materials` records from Supabase.

---

### 3.7 Job Types Catalog Page (`/job-types`)

#### Page Route & Access Control
- **Route Path**: `/job-types`
- **Access Permission**: Admin only.

#### 1. Functional Features & Capabilities
- Catalog management for standard repair service types (e.g. "Screen Replacement", "OS Installation", "General Servicing").
- Configures default customer charge amount, receptionist commission incentive, and technician completion incentive per job type.
- Active/Inactive status toggle button.
- Create, edit, and delete job types.

#### 2. UI Elements & Component Catalog
- **Page Header**: Title, description, `Add Job Type` button.
- **Table**: Job Types catalog table (Columns: Title, Base Customer Charge, Receptionist Incentive, Technician Incentive, Status, Actions).
- **Modal**: `JobTypeFormModal` (Title input, Customer Charge input, Receptionist Incentive input, Technician Incentive input, Active toggle, Save button).

#### 3. Backend & Frontend Data Connections
- **Database Table**: `job_types` (`id`, `title`, `customer_charge_amount`, `receptionist_incentive`, `technician_incentive`, `is_active`, `created_at`).

---

### 3.8 Direct Sales Feed Page (`/sales`)

#### Page Route & Access Control
- **Route Path**: `/sales`
- **Access Permission**: Admin & Receptionist.

#### 1. Functional Features & Capabilities
- Listing feed of over-the-counter accessory & part sales (separate from repair jobs).
- Search by sale code (`RS-SALE-XXXX`), customer name, or phone number.
- Payment status filter (`Paid`, `Pending`, `Refunded`).
- Summary totals banner showing total sales revenue generated.
- CSV export for sales records.

#### 2. UI Elements & Component Catalog
- **Header**: `Sales Management`, `New Sale` button, `Export CSV` button.
- **Table**: Sales table (Sale Code, Customer Name, Contact, Status, Payment Method, Total Amount, Date, Actions).
- **Badges**: Payment status pills (`Paid` = green, `Pending` = yellow).

#### 3. Backend & Frontend Data Connections
- **Database Table**: `sales` table joined with `sales_items`.

---

### 3.9 New Direct Sale Page (`/sales/new`)

#### Page Route & Access Control
- **Route Path**: `/sales/new`
- **Access Permission**: Admin & Receptionist.

#### 1. Functional Features & Capabilities
- Multi-item checkout form for selling accessories, spare parts, and merchandise.
- Real-time inventory autocomplete lookup: Typing an item name queries the `inventory` table and auto-fills cost price.
- Subtotal, discount, tax percentage, and final total auto-calculation.
- Invoice generation with options to Print, Send WhatsApp draft, or Email invoice link.

#### 2. UI Elements & Component Catalog
- **Inputs**: Customer Name, Phone, Email, Payment Method dropdown (`Cash`, `UPI`, `Card`, `NetBanking`), Status dropdown (`Paid`, `Pending`), Line items list (Item Name input with live inventory suggestions dropdown, Quantity input, Unit Price input, Remove Item button).
- **Buttons**: `Add Item`, `Complete Sale`, `Print Invoice`, `Send WhatsApp`, `Email Invoice`.

#### 3. Backend & Frontend Data Connections
- **RPC Function**: `generate_sale_code()` (`RS-SALE-YYYY-XXXX`).
- **Database Tables**:
  - Query: `inventory` (live autocomplete suggestions).
  - Insert: `sales` header row and `sale_items` detail rows.

---

### 3.10 Staff & User Management Page (`/staff`)

#### Page Route & Access Control
- **Route Path**: `/staff`
- **Access Permission**: Admin only.

#### 1. Functional Features & Capabilities
- Master list of all registered staff accounts (`Admin`, `Receptionist`, `Technician`).
- **User Activation Toggle**: Activate/Deactivate staff members. Deactivated users cannot log into mobile or web apps.
- **Pending Approvals Queue**: Prominent banner/tab highlighting new user signups awaiting Admin approval.
- **Add New Staff Member**: Create staff accounts directly with assigned role and password.
- **View Staff Attendance Modal**: Inspection window showing 30-day attendance selfie photos, check-in/out timestamps, and GPS verification coordinates.
- **Manage Staff Pay Rates**: Opens form to set base pay, daily rate, overtime rate, and early departure deduction per employee.

#### 2. UI Elements & Component Catalog
- **Header**: Title, `Add Staff` button.
- **Tabs**: `All Staff`, `Pending Approval`, `Receptionists`, `Technicians`.
- **Table**: Staff table (Name, Email, Phone, Role, Status toggle switch, Pay Rate status, Attendance link, Actions).
- **Modals**:
  - `AddStaffModal`: Name, Email, Phone, Role selector, Password inputs.
  - `AttendanceModal`: Monthly calendar view, Check-in selfie image display, GPS Lat/Lng map link.
  - `StaffRateForm`: Base Monthly Salary, Daily Rate, Overtime Rate per Hour, Early Departure Deduction per Hour.

#### 3. Backend & Frontend Data Connections
- **Database Tables**:
  - `users`: Full CRUD access (`id`, `name`, `email`, `phone`, `role`, `is_active`).
  - `staff_rates`: Read/Write rate rules (`base_pay`, `base_daily_rate`, `ot_rate_per_hour`, `early_deduction_per_hour`).
  - `attendance`: Read staff attendance history & selfie URLs (`selfie_url` from `attendance-selfies` storage bucket).

---

### 3.11 Inventory & Stock Management Page (`/inventory`)

#### Page Route & Access Control
- **Route Path**: `/inventory`
- **Access Permission**: Admin & Receptionist (read-only for tech).

#### 1. Functional Features & Capabilities
- Spare parts & accessories inventory catalog.
- Low-stock visual warning triggers when item `quantity <= low_stock_threshold` (default threshold: 5 units).
- Search by item name or category.
- Quick quantity increment / decrement buttons (+ / -).
- Create, edit, and delete inventory items.

#### 2. UI Elements & Component Catalog
- **Header**: Title, `Add Inventory Item` button.
- **Table**: Inventory table (Item Name, SKU / Category, Unit Price / Cost, Quantity stock pill, Low Stock Badge, Actions).
- **Modal**: `InventoryFormModal` (Item Name, Category, Quantity, Cost Price, Selling Price, Low Stock Threshold).

#### 3. Backend & Frontend Data Connections
- **Database Table**: `inventory` (`id`, `item_name`, `quantity`, `cost_price`, `low_stock_threshold`, `unit`, `created_at`).

---

### 3.12 Analytics & Financial Reports Page (`/reports`)

#### Page Route & Access Control
- **Route Path**: `/reports`
- **Access Permission**: Admin only.

#### 1. Functional Features & Capabilities
- **Date Range Selector**: Filter metrics by `Today`, `This Week`, `This Month`, `Custom Date Range`.
- **Financial Breakdown Cards**:
  - Total Repair Revenue
  - Total Direct Sales Revenue
  - Total Gross Income
  - Total Petty Cash Expenditure
  - Net Profit Summary
- **Visual Analytics Charts**:
  - Revenue Trend Line Chart (`RevenueChart`).
  - Technician Performance Bar Chart (`TechPerformanceChart` — completed jobs & turnaround times).
  - Repair Device Categories Pie Chart.

#### 2. UI Elements & Component Catalog
- **Controls**: Date range dropdown, Custom date inputs, `Export Report PDF` button.
- **Charts**: Recharts ResponsiveContainer, BarChart, LineChart, PieChart.
- **Summary Cards**: 5 Financial metric cards with comparison indicators.

#### 3. Backend & Frontend Data Connections
- Queries `billing`, `sales`, `expenditure`, `jobs`, and `users` tables across selected date ranges.

---

### 3.13 Salary & Payroll Management Page (`/salary`)

#### Page Route & Access Control
- **Route Path**: `/salary`
- **Access Permission**: Admin only (strictly blocked for Receptionist and Technician roles).

#### 1. Functional Features & Capabilities
- **Monthly Payroll Calculator**:
  - Calculates salary per employee for a selected month using confirmed business rules:
    ```text
    present_pay      = present_days * base_daily_rate
    halfday_pay      = halfday_count * (base_daily_rate / 2)
    ot_pay           = ot_hours * ot_rate_per_hour
    early_deduction  = early_hours * early_deduction_per_hour
    gross_salary     = present_pay + halfday_pay + ot_pay - early_deduction
    advance_deducted = SUM(payments.amount WHERE type = 'advance_salary')
    net_salary       = gross_salary - advance_deducted
    ```
- **Advance Salary Logging**: Modal to record cash advance payments given to staff members (`type = 'advance_salary'`).
- **Pay Slip Generator**: Modal displaying printable itemized salary slip for staff members.
- **Final Salary Record Lock**: Finalizes and saves calculated monthly salary into `public.salary` table.

#### 2. UI Elements & Component Catalog
- **Header**: Month selector dropdown, `Record Advance Salary` button, `Calculate Payroll` button.
- **Table**: Payroll table (Employee Name, Role, Present Days, Half Days, Overtime Hours, Gross Pay, Advance Deducted, Net Payable Salary, Actions).
- **Modals**:
  - `AdvanceSalaryForm`: Staff selection dropdown, Amount input, Payment Date, Notes input.
  - `SalaryBreakdownCard`: Detailed itemized breakdown of base pay, overtime, attendance deductions, advances, and net salary.

#### 3. Backend & Frontend Data Connections
- **Database Tables**:
  - Read: `staff_rates`, `attendance`, `payments` (where `type = 'advance_salary'`).
  - Upsert: `salary` table (`user_id`, `month`, `base_pay`, `gross_salary`, `net_salary`, `advance_deducted`).

---

### 3.14 Expenditure & Petty Cash Page (`/expenditure`)

#### Page Route & Access Control
- **Route Path**: `/expenditure`
- **Access Permission**: Admin only.

#### 1. Functional Features & Capabilities
- Track all daily shop expenses, petty cash disbursements, and materials purchases.
- Expense categorization: `materials_purchase`, `daily_expenditure`, `office_development`, `advance_salary`.
- Date range filtering and summary calculation cards.
- Add new expense entry form modal.

#### 2. UI Elements & Component Catalog
- **Header**: Title, `Log New Expense` button.
- **Summary Cards**: Total Expenditure Card, Materials Purchase Card, Daily Operations Card.
- **Table**: `ExpenditureTable` (Category badge, Amount, Description, Logged By, Date, Actions).
- **Modal**: `ExpenditureForm` (Category dropdown, Amount input, Description textarea, Date picker).

#### 3. Backend & Frontend Data Connections
- **Database Table**: `payments` (`id`, `type`, `amount`, `description`, `user_id`, `created_by`, `created_at`).

---

### 3.15 System Settings Page (`/settings`)

#### Page Route & Access Control
- **Route Path**: `/settings`
- **Access Permission**: Admin only.

#### 1. Functional Features & Capabilities
- Business profile settings: Shop Name, Contact Phone, Shop Address, GST/Tax Number, Currency format.
- Notification preferences: Toggle WhatsApp auto-drafts, Push notifications, Email invoice notifications.
- System information & database connection status checker.

#### 2. UI Elements & Component Catalog
- **Tabs**: `General Settings`, `Invoicing & Tax`, `Notifications`, `Database & System`.
- **Inputs**: Text inputs for shop branding details, Toggle switches for notification triggers.
- **Buttons**: `Save Settings` primary button.

#### 3. Backend & Frontend Data Connections
- Persists config key-value pairs or updates business profile record.

---

## 4. Comprehensive Database & API Integration Matrix

| Supabase Table | Primary Key | Foreign Keys | Read Operations | Write Operations | RLS Access Control |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `public.users` | `id` (uuid) | Auth `auth.users.id` | Dashboard, Staff, Jobs, Attendance | Admin (Create/Update/Role toggle) | Admin: Full. Staff: Self read/update own profile. |
| `public.jobs` | `id` (uuid) | `receptionist_id`, `technician_id` | Overview, Jobs list, Job detail, Reports | Admin, Receptionist, Technician (Status) | Admin/Receptionist: Full. Tech: Assigned jobs only. |
| `public.job_materials` | `id` (uuid) | `job_id -> jobs.id` | Job Detail Workspace | Admin, Receptionist, Tech (Assigned jobs) | Tech: Assigned jobs only. |
| `public.attendance` | `id` (uuid) | `user_id -> users.id` | Dashboard, Staff Attendance modal, Salary | Check-in / Check-out selfie flow | Users: Own row. Admin: Full. |
| `public.inventory` | `id` (uuid) | None | Dashboard low-stock, Inventory page, Sales autocomplete | Admin, Receptionist (Quantity) | Admin/Receptionist: Full. Tech: Read only. |
| `public.billing` | `id` (uuid) | `job_id -> jobs.id` | Job Detail, Financial Reports, Overview | Admin, Receptionist | Admin/Receptionist: Full. Tech: Blocked. |
| `public.sales` | `id` (uuid) | `created_by -> users.id` | Sales list, Financial Reports | Admin, Receptionist | Admin/Receptionist: Full. |
| `public.sale_items` | `id` (uuid) | `sale_id -> sales.id` | Sales detail view | Admin, Receptionist | Admin/Receptionist: Full. |
| `public.job_types` | `id` (uuid) | None | Job Types page, New Job dropdown | Admin | Admin: Full. Receptionist: Read active. |
| `public.payments` | `id` (uuid) | `user_id`, `created_by` | Expenditure page, Salary advances | Admin | Admin: Full. Others: Blocked. |
| `public.staff_rates` | `user_id` | `user_id -> users.id` | Staff rate settings, Salary calculator | Admin | Admin: Full. Others: Blocked. |
| `public.salary` | `id` (uuid) | `user_id -> users.id` | Salary page, Staff pay slips | Admin | Admin: Full. Others: Blocked. |

---

## 5. Security & Permission Boundaries Summary

1. **Role Isolation**:
   - **Admin**: Complete access across all 15 screens, salary calculations, financial reports, user approvals, and DB management.
   - **Receptionist**: Access restricted to Intake (`/jobs/new`), Jobs list (`/jobs`), Job Detail (`/jobs/[id]`), Direct Sales (`/sales`), and Inventory (`/inventory`). Strictly blocked from `/salary`, `/expenditure`, `/staff_rates`, and `/reports`.
   - **Technician**: Access restricted to mobile app assigned jobs feed and own attendance. Web Admin access blocked via RLS and AuthContext guard.

2. **Server-Side Safety Controls**:
   - **Job Codes & Sale Codes**: Generated exclusively by PostgreSQL sequences (`generate_job_code()` and `generate_sale_code()`). Never constructed client-side.
   - **Service Role Key Protection**: `service_role` keys are strictly excluded from Next.js public client bundles. Client uses `anon` key subject to PostgreSQL RLS policies.
