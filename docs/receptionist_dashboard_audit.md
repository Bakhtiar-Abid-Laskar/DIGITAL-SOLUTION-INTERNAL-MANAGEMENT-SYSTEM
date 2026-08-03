# Receptionist Dashboard & Mobile Application Comprehensive Audit

## Executive Summary

This document presents a comprehensive audit of the **RepairShop Mobile Application**, detailing its three role-based dashboards—**Receptionist**, **Technician**, and **Admin**—with a primary focus on the **Receptionist Dashboard Ecosystem**.

RepairShop is an enterprise service and repair management mobile application built with Expo React Native, TypeScript, and Supabase. The system enforces strict Role-Based Access Control (RBAC) via Supabase Auth and Row-Level Security (RLS) policies.

---

## 1. Overview of the Three Mobile Dashboards

| Dashboard | Primary Role | Core Focus | Key Screens & Capabilities |
| :--- | :--- | :--- | :--- |
| **Receptionist Dashboard** | Front-Desk Staff / Receptionist | Intake, Sales, Billing, Customer Management | • Customer Intake & Device Registration<br>• Job Assignment & Receipt Printing<br>• Point-of-Sale (OTC Accessories & Services)<br>• Billing & Invoice Generation (Print/WhatsApp/Email)<br>• Live Status Tracking & Analytics<br>• Customer Search Directory |
| **Technician Dashboard** | Repair Technicians | Assigned Repair Work & Onsite Visits | • My Assigned Jobs Feed (Realtime filtered)<br>• Work Log & Status Updates (`In Progress`, `Waiting`, `Completed`)<br>• Material / Parts Logging with Stock Deduction<br>• Onsite Visit Verification (Selfie + High-Accuracy GPS)<br>• Personal Work History |
| **Admin Dashboard** | Shop Owners & Managers | System Governance & Financial Oversight | • System-wide Active Jobs & Real-Time Revenue<br>• Low Stock Alerts & Urgent Job Escalations<br>• Staff User Approval / Deactivation<br>• System Financial Reports & Expenditure<br>• Global Inventory Management |

### Shared Shell Architecture
All three dashboards leverage unified foundation components:
1. **`RoleDashboard.tsx`**: Renders dynamic greeting banners, customizable KPI grid cards, 3-column quick-action tiles, header notification bell with unread badges, and role menu triggers.
2. **`CustomTabBar.tsx`**: Bottom navigation bar supporting active tab indicators, safe-area inset calculations, and central Floating Action Button (FAB) quick-action menus.
3. **`AppHeader.tsx`**: Universal top bar managing back-navigation, safe-area top insets, and notification/menu triggers.
4. **`useRealtimeSubscription`**: Custom hook maintaining live Supabase Postgres WebSocket channels (`jobs`, `job_materials`, etc.) for seamless UI synchronization without manual pulling.

---

## 2. Granular Page-by-Page Audit: Receptionist Dashboard Ecosystem

---

### Page 1: Receptionist Main Dashboard Screen
**File:** [DashboardScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/DashboardScreen.tsx)

#### 1. Screen Purpose & User Goal
Serves as the central operational hub for front-desk staff. Provides instant visibility into today's job intake, active repair volume, completed jobs, urgent escalations, and notifications, while offering one-tap access to primary receptionist workflows.

#### 2. UI/UX Layout & Visual Elements
- **Top Bar / Header**: Custom `AppHeader` featuring notification bell with unread counter badge (left) and slide-up overflow menu button (right).
- **Greeting Banner**: Modern primary-colored card displaying date (e.g. `Mon, Oct 24`), greeting (`Good Morning, [Name]`), user avatar icon, and dynamic workload status pill (`X urgent jobs need attention` or `All caught up`).
- **Quick Action Grid (3-column layout)**:
  - `New Job` (+ icon, Blue tile) -> Navigates to `CustomerIntake`
  - `New Sale` ($ icon, Teal tile) -> Navigates to `NewSaleScreen`
  - `Customers` (Users icon, Purple tile) -> Navigates to `Customers`
  - `Analytics` (Chart icon, Red tile) -> Navigates to `AnalyticsScreen`
  - `Inventory` (Package icon, Neutral tile) -> Navigates to `InventoryScreen`
  - `Job List` (Clipboard icon, Orange tile) -> Navigates to `JobList`
- **KPI Stat Cards (2-column grid)**:
  - `Jobs Received` (Total count today) -> Filter link: `Today`
  - `In Progress` (Active job count) -> Filter link: `In Progress`
  - `Completed` (Completed today count) -> Filter link: `Completed Today`
  - `Urgent` (Urgent uncompleted count) -> Filter link: `Urgent`
- **Bottom Sheets (Modals)**:
  - *Notifications Bottom Sheet*: Displays top 5 recent notifications with channel icons (WhatsApp, Email, Bell) and "See All" shortcut.
  - *Menu Bottom Sheet*: Navigation to Profile and Log Out trigger.
  - *Logout Confirmation*: Destructive confirmation dialog with Cancel / Log Out actions.

#### 3. Form Fields & State Properties
- `loading`: Boolean state for initial query hydration.
- `statsData`: Object holding counts (`todayTotal`, `inProgress`, `completedToday`, `urgentPending`).
- `notificationsData`: Array of recent notification records.
- `unreadCount`: Integer count of user notifications.
- `logoutVisible`, `notificationsVisible`, `menuVisible`: Modal visibility flags.

#### 4. Backend Integrations & Supabase Queries
```ts
// Concurrent dashboard metrics fetch
const startOfToday = new Date(today + 'T00:00:00.000Z').toISOString();
const [todayRes, inProgressRes, completedRes, urgentRes, unreadRes] = await Promise.all([
  supabase.from('jobs').select('id', { count: 'exact' }).gte('created_at', startOfToday),
  supabase.from('jobs').select('id', { count: 'exact' }).eq('status', 'In Progress'),
  supabase.from('jobs').select('id', { count: 'exact' }).eq('status', 'Completed').gte('completed_at', startOfToday),
  supabase.from('jobs').select('id', { count: 'exact' }).eq('priority', 'Urgent').neq('status', 'Completed'),
  supabase.from('notifications').select('id', { count: 'exact' }).eq('recipient_user_id', user?.id),
]);

// Recent notifications fetch
supabase.from('notifications').select('*').eq('recipient_user_id', user.id).order('sent_at', { ascending: false }).limit(5);

// Realtime Channel
useRealtimeSubscription('jobs', fetchDashboardData);
```

#### 5. Data Connections & Navigation
- Connected to Supabase Auth (`user`, `displayName`, `signOut`).
- Passes parameters to `JobList` screen via `navigation.navigate('Jobs', { screen: 'JobList', params: { filter: ... } })`.

---

### Page 2: Customer Intake / New Job Screen (Step 1)
**File:** [CustomerIntakeScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx)

#### 1. Screen Purpose & User Goal
Initial step of the job creation flow. Captures customer contact details, pre-configured job service types from the master catalog, device specifications, reported issue description, service location mode, and repair priority.

#### 2. UI/UX Layout & Visual Elements
- **Header**: `AppHeader` titled "New Job".
- **Keyboard Handling**: `KeyboardAvoidingView` + `ScreenScrollView` to prevent software keyboard overlap on smaller devices.
- **Form Sections (Structured Cards with Section Labels)**:
  - `CUSTOMER DETAILS`: Customer Name, Contact Number (Phone keypad), Email (Email keypad, optional).
  - `SERVICE / JOB CATALOG`: Job Service Type Dropdown (loads active items from `job_types` table). Displays dynamic green badge showing base price and incentives (Receptionist / Tech).
  - `DEVICE & ISSUE`: Device Type Picker (`Laptop`, `PC`, `Other`), Reported Issue text area (multiline), Remarks text area (optional).
  - `DELIVERY & PRIORITY`: Service Location Segmented Control (`In-house`, `Onsite`), Priority Segmented Control (`Normal`, `High`, `Urgent`).
- **Action Button**: Primary full-width "Next" button routing to Step 2.

#### 3. Form Fields & Validation Rules
- `customer_name`: Required text input. Validated non-empty.
- `customer_contact`: Required numeric text input. Validated non-empty.
- `customer_email`: Optional string.
- `job_type_ref_id`: Optional catalog reference ID. Auto-populates `customer_charge_amount`, `snap_receptionist_incentive`, and `snap_technician_incentive`.
- `device_type`: Default `'Laptop'`. Options: `Laptop`, `PC`, `Other`.
- `reported_issue`: Required multiline string. Validated non-empty.
- `remarks`: Optional multiline string.
- `job_type`: Default `'Inhouse'`. Options: `Inhouse`, `Onsite`.
- `priority`: Default `'Normal'`. Options: `Normal`, `High`, `Urgent`.

#### 4. Backend Integrations & Supabase Queries
```ts
// Fetches active job service catalog on mount
supabase
  .from('job_types')
  .select('id, title, customer_charge_amount, receptionist_incentive, technician_incentive')
  .eq('is_active', true)
  .order('title', { ascending: true });
```

#### 5. Data Connections & Navigation
- Transfers complete form payload to `JobAssignmentScreen` via route parameters: `navigation.navigate('JobAssignment', { formState: form })`.

---

### Page 3: Job Assignment & Receipt Generation Screen (Step 2)
**File:** [JobAssignmentScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx)

#### 1. Screen Purpose & User Goal
Step 2 of job intake. Displays a summary of the intake details, allows optional technician assignment, executes server-side job code generation via PostgreSQL RPC, commits the job record, and provides receipt printing capabilities.

#### 2. UI/UX Layout & Visual Elements
- **Header**: `AppHeader` titled "Job Assignment" with back navigation.
- **Job Overview Card**: Displays auto-generated placeholder badge, priority pill (color-coded), service location, customer name, device type, and full reported issue block.
- **Technician Assignment Picker**: Pressable tile opening `TechnicianPicker` modal listing active technicians.
- **Fixed Footer Bar**: Sits above system navigation inset:
  - `Print Receipt`: Secondary button (disabled until job creation).
  - `Create Job`: Primary button with spinner loading state.
- **Success Modal**: Reanimated pop-up displaying green checkmark, generated job code chip (e.g. `RS-2026-0001`), "Print Receipt" primary action, "View Job Details" secondary action, and "Create Another" reset action.

#### 3. Backend Integrations & Security Enforcements
- **Mandatory RLS Security Rule Enforcement**: Job codes are generated strictly server-side by PostgreSQL sequence to prevent concurrent duplicate codes.

```ts
// 1. Generate unique sequence job code
const { data: jobCode, error: rpcError } = await supabase.rpc('generate_job_code');

// 2. Insert new job record
const { data: newJob, error: insertError } = await supabase.from('jobs').insert({
  job_code: jobCode,
  customer_name: formState.customer_name.trim(),
  customer_contact: cleanPhoneNumber(formState.customer_contact),
  customer_email: formState.customer_email.trim() || null,
  device_type: formState.device_type,
  reported_issue: formState.reported_issue.trim(),
  remarks: formState.remarks.trim() || null,
  job_type: formState.job_type,
  job_type_ref_id: formState.job_type_ref_id || null,
  snap_receptionist_incentive: formState.snap_receptionist_incentive || 0,
  snap_technician_incentive: formState.snap_technician_incentive || 0,
  priority: formState.priority,
  status: 'Received',
  receptionist_id: user?.id,
  technician_id: technicianId || null,
}).select().single();
```

#### 4. Hardware Integrations
- **Thermal / AirPrint Printing**: Uses `expo-print` with `@repairshop/shared` `generateDocumentHtml('receipt', createdJob, [])` to render thermal receipt HTML layout.

---

### Page 4: Job Detail Screen
**File:** [JobDetailScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx)

#### 1. Screen Purpose & User Goal
Detailed inspect-and-control page for an existing repair job. Shows complete job specs, assigned technician, logged materials/parts table, status timeline, and receptionist quick actions (Technician Reassignment, Thermal Receipt Printing, Customer WhatsApp Messaging, and Billing/Invoicing).

#### 2. UI/UX Layout & Visual Elements
- **Job Detail Shell Component (`JobDetailShell`)**: Displays top banner with status badge, customer name, contact phone, job code, device type, priority badge, and issue details.
- **Logged Materials Section**: Renders `LineItemTable` listing all materials consumed by technicians with item name, quantity, unit cost, and total cost.
- **Assigned Technician Card**: Shows current technician name with "Reassign" pill button. Tapping opens `TechnicianPicker`.
- **Embedded Action Row**:
  - `Print`: Secondary button triggering thermal printer dialog.
  - `WhatsApp`: Secondary button opening pre-filled WhatsApp web/app link to notify customer device is ready for pickup.
  - `Generate Bill`: Primary full-width button opening `BillingScreen`.

#### 3. Backend Integrations & Realtime Synchronization
```ts
// 1. Fetch Job & Technician details
supabase.from('jobs').select('*, technician:technician_id(name)').eq('id', jobId).single();

// 2. Fetch Logged Materials
supabase.from('job_materials').select('*').eq('job_id', jobId);

// 3. Technician Reassignment Update
supabase.from('jobs').update({ technician_id: technicianId }).eq('id', jobId);

// Realtime Subscriptions
useRealtimeSubscription('jobs', fetchJobDetails, `id=eq.${jobId}`);
useRealtimeSubscription('job_materials', fetchJobDetails, `job_id=eq.${jobId}`);
```

#### 4. External Integrations
- **WhatsApp Deep Linking**: Formats Indian contact numbers (`+91`) via `createWhatsAppUrl` and opens `whatsapp://send?phone=...&text=...` using `Linking.openURL`.

---

### Page 5: Job List & Multi-Tab Filter Screen
**File:** [JobListScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/JobListScreen.tsx)

#### 1. Screen Purpose & User Goal
Comprehensive search and filter list for all repair jobs in the system. Allows receptionists to filter jobs by lifecycle status, perform server-side keyword searches, and inspect real-time badge counts.

#### 2. UI/UX Layout & Visual Elements
- **Search Header**: TextInput with search icon supporting live text filtering across job code, customer name, and contact number.
- **Status Filter Tabs (Horizontal Scrollable Pills with Counts)**:
  - `All` (Count)
  - `Received` (Count)
  - `In Progress` (Count)
  - `Waiting` (`Waiting for Materials` Count)
  - `Completed` (Count)
- **Job Cards List (`FlatList`)**: Each card displays job code, customer name, device type, priority badge, status badge, technician name, and relative date.
- **Pull-to-Refresh**: `RefreshControl` updating job data and status counts.

#### 3. Backend Integrations & Supabase Queries
```ts
// 1. Concurrent Status Tab Head Count Queries
const [allRes, recRes, progRes, waitRes, compRes] = await Promise.all([
  supabase.from('jobs').select('id', { count: 'exact', head: true }),
  supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Received'),
  supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'In Progress'),
  supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Waiting for Materials'),
  supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Completed'),
]);

// 2. Server-side Filtered Job Query
let query = supabase.from('jobs').select('*, technician:technician_id(name)');
if (activeTab === 'Today') query = query.gte('created_at', todayStr);
else if (activeTab === 'Completed Today') query = query.eq('status', 'Completed').gte('completed_at', todayStr);
else if (activeTab === 'Urgent') query = query.eq('priority', 'Urgent').neq('status', 'Completed');
else if (activeTab !== 'All') query = query.eq('status', activeTab);

if (trimmedQuery) {
  query = query.or(`job_code.ilike.%${trimmedQuery}%,customer_name.ilike.%${trimmedQuery}%,customer_contact.ilike.%${trimmedQuery}%`);
}
query = query.order('created_at', { ascending: false }).range(0, 49);
```

---

### Page 6: Billing & Invoice Management Screen
**File:** [BillingScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/BillingScreen.tsx)

#### 1. Screen Purpose & User Goal
Calculates, generates, and manages financial billing records for repair jobs. Enforces shared billing calculation formulas, handles tax/discounts, supports warranty no-charge overrides, and handles multi-channel invoice distribution (Print, WhatsApp, Email).

#### 2. UI/UX Layout & Visual Elements
- **Header**: `AppHeader` titled "Billing".
- **Job & Customer Summary Header**: Large job code title, customer name, and status badge.
- **Itemized Charges Card**: Renders logged materials plus labour charges line item.
- **Adjustments Card**:
  - Labour Charge input field (₹)
  - Tax Percent input field (%)
  - Discount input field (₹)
- **Totals Summary Card**:
  - Sub Total
  - Tax Amount
  - Discount Amount (displayed in red)
  - Divider & Grand Total (Large bold text)
  - Warning banner (shown when total is ₹0 without no-charge flag)
  - Switches: `No-charge warranty` toggle and `Mark as Paid` toggle.
- **Footer Actions Bar**:
  - Quick Icons: `Print` (Printer), `WhatsApp` (MessageCircle), `Email` (Mail).
  - Primary Action Button: `Save Billing` (triggers upsert into `billing` table).

#### 3. Formula Compliance & Business Rules
Employs shared business logic from `@repairshop/shared`:
```text
parts_total   = SUM(job_materials.total_cost)
sub_total     = parts_total + labour_charge
tax_amount    = (sub_total * tax_percent) / 100
grand_total   = MAX(0, sub_total + tax_amount - discount)
```
- **Zero-Total Guard**: Prevents saving ₹0 bills unless explicitly marked as `isNoCharge` warranty.

#### 4. Backend Integrations & Edge Functions
```ts
// 1. Fetch existing bill or initialize
supabase.from('billing').select('*').eq('job_id', jobId).maybeSingle();

// 2. Upsert billing record
supabase.from('billing').upsert({
  job_id: jobId,
  parts_total: partsTotal,
  labour_charge: labourCharge,
  tax_percent: taxPercent,
  discount: discount,
  grand_total: grandTotal,
  is_paid: isPaid,
}, { onConflict: 'job_id' });

// 3. Email Invoice via Supabase Edge Function
fetch(`${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-invoice-email`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ job_id: jobId, customer_email: job.customer_email })
});
```

---

### Page 7: New Sale / Point-of-Sale (OTC Counter) Screen
**File:** [NewSaleScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/NewSaleScreen.tsx)

#### 1. Screen Purpose & User Goal
Point-of-Sale counter screen for over-the-counter sales (spare parts, accessories, cables, adapters). Features live inventory lookup, sale catalog shortcuts, receptionist incentive recording, payment method selection, and instant invoice output.

#### 2. UI/UX Layout & Visual Elements
- **Pre-configured Sale Type Catalog**: Dropdown menu pulling from `sale_types` table. Automatically fills item title, customer charge, and displays receptionist incentive badge (e.g. `Receptionist Sales Incentive: +₹50`).
- **Customer Information Card**: Name, Contact Number, Email.
- **Dynamic Line Items List**:
  - Interactive inventory search bar with live auto-complete dropdown showing stock count and cost price.
  - Quantity and Unit Price inputs.
  - Dynamic line total calculation.
  - Delete item button.
  - "Add Item" button.
- **Payment & Status Options**:
  - Status choice chips (`Paid`, `Draft`, `Cancelled`).
  - Payment method choice chips (`Cash`, `Card`, `UPI`, `Bank Transfer`, `Other`).
  - Discount and Tax inputs.
  - Optional Notes area.
- **Totals Summary Card**: Subtotal, Discount, Tax, and Grand Total.
- **Success Screen View**: Renders upon sale creation with generated sale code (e.g. `SL-2026-0001`), total amount, and action buttons (`Print Invoice`, `WhatsApp`, `Email Draft`, `Create Another`).

#### 3. Backend Integrations & Server Sequences
```ts
// 1. Live inventory search with debounce
supabase.from('inventory').select('id, item_name, quantity, cost_price, unit').ilike('item_name', `%${term}%`).limit(8);

// 2. Server-side sequence for sale code
const { data: saleCode } = await supabase.rpc('generate_sale_code');

// 3. Insert Sale Master Record
supabase.from('sales').insert({
  sale_code: saleCode,
  sale_type_id: selectedSaleTypeId || null,
  snap_receptionist_incentive: selectedSaleType ? selectedSaleType.receptionist_incentive : 0,
  customer_name: form.customer_name.trim(),
  customer_contact: form.customer_contact.trim(),
  customer_email: form.customer_email.trim() || null,
  status: form.status,
  payment_method: form.payment_method,
  discount: discountValue,
  tax_percent: taxPercent,
  notes: form.notes.trim() || null,
  created_by: user.id,
  paid_at: form.status === 'Paid' ? new Date().toISOString() : null,
});

// 4. Insert Sale Items
supabase.from('sale_items').insert(saleItems);
```

---

### Page 8: Customer Directory Screen
**File:** [CustomersScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/CustomersScreen.tsx)

#### 1. Screen Purpose & User Goal
Enables receptionists to quickly search customer repair history by customer name or phone number.

#### 2. UI/UX Layout & Key Components
- **Top Search Bar**: Instant search input with 500ms debounce.
- **Customer FlatList**: Displaying customer name icon, current job status badge, device type, registration date, job code, and right chevron.
- **TanStack React Query**: Manages query caching, loading skeletons, and state updates under `['customers', debouncedSearch]`.

#### 3. Backend Queries
```ts
let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
if (debouncedSearch.trim()) {
  query = query.or(`customer_name.ilike.%${debouncedSearch}%,customer_contact.ilike.%${debouncedSearch}%`);
} else {
  query = query.limit(20);
}
```

---

### Page 9: Receptionist Analytics Screen
**File:** [AnalyticsScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/AnalyticsScreen.tsx)

#### 1. Screen Purpose & User Goal
Visual overview of reception repair volumes categorized by status.

#### 2. UI/UX Layout & Visual Elements
- **Date Range Selector Pill**: Displays active date range (e.g. `01 May – 14 May 2025`).
- **Jobs Volume Bar Chart**: Custom animated bar chart plotting:
  - `Received` (Blue bar)
  - `In Progress` (Orange bar)
  - `Completed` (Green bar)
- **Chart Legend**: Color-coded indicators matching chart bars.

#### 3. Backend Aggregation Query
```ts
const { data: allJobs } = await supabase.from('jobs').select('status, id');
// Client aggregation into Received, In Progress, and Completed buckets
```

---

### Page 10: Payments Screen (OTC Cash Ledger Preview)
**File:** [PaymentsScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/PaymentsScreen.tsx)

#### 1. Screen Purpose & User Goal
Provides a front-desk preview of today's counter cash and UPI collections.

#### 2. Security & RLS Notice Banner
- Includes prominent notice: *"Note: This is a UI preview. Receptionist access to shop payments is currently blocked by database security rules (Admin Only)."*
- Complies with non-negotiable security rules: Receptionists are strictly blocked from querying administrative tables (`salary`, `staff_rates`, `payments`).

---

### Page 11: Receptionist Profile & Account Screen
**File:** [ProfileScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/receptionist/ProfileScreen.tsx)

#### 1. Screen Purpose & User Goal
Displays staff account credentials, role permissions, and sign-out control.

#### 2. Key Components
- **Profile Header Card**: Large avatar circle, user display name, and role badge (`RECEPTIONIST`).
- **Account Details Card**: Email address display and Role Permissions indicator.
- **Log Out Action**: Triggers slide-up `BottomSheet` confirmation dialog calling Supabase `auth.signOut()`.

---

### Shared Pages Accessible via Receptionist Flow

#### 1. Shared Attendance Screen
**File:** [AttendanceScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/shared/AttendanceScreen.tsx)
- Reusable attendance tracking module.
- Camera selfie capture (Expo Camera) + High-Accuracy GPS verification (Expo Location).
- Uploads selfie to Supabase Storage bucket `attendance-selfies` and upserts `attendance` table row. Includes 30-day historical attendance log.

#### 2. Shared Inventory Screen
**File:** [InventoryScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/shared/InventoryScreen.tsx)
- Live inventory stock lookup. Receptionist has read/select access to inspect available repair parts and sale items.

#### 3. Shared Notifications Screen
**File:** [NotificationsScreen.tsx](file:///c:/Users/bakht/Desktop/Project/RepairShopApp/src/screens/shared/NotificationsScreen.tsx)
- Full list of historical staff alerts delivered via Expo Push Notifications and logged in the `notifications` table.

---

## 3. Database Schema & RLS Security Compliance Matrix

### Table Access Rights Matrix

| Database Table | Receptionist Permission | Technician Permission | Admin Permission | RLS Policy Status |
| :--- | :--- | :--- | :--- | :--- |
| `jobs` | Full Access (Create, Read All, Reassign) | Read Assigned Only, Update Status | Full Access | Verified |
| `job_materials` | Read All, Insert | Insert for Assigned Job | Full Access | Verified |
| `billing` | Read All, Upsert | **NO ACCESS (Blocked)** | Full Access | Verified |
| `sales` & `sale_items` | Full Access (Create OTC Sales) | **NO ACCESS (Blocked)** | Full Access | Verified |
| `job_types` & `sale_types` | Read Active Catalog | Read Active Catalog | Full Access | Verified |
| `inventory` | Read Stock | Read Stock | Full Access (Add/Edit) | Verified |
| `attendance` | Insert/Read Own | Insert/Read Own | Read All Staff | Verified |
| `notifications` | Read Recipient ID | Read Recipient ID | Read All Logs | Verified |
| `payments` & `salary` | **NO ACCESS (Blocked)** | **NO ACCESS (Blocked)** | Full Access | Enforced in RLS |

---

## 4. Key Findings & Strategic Recommendations

1. **Strict Sequence Guarantee**: All job codes (`RS-2026-XXXX`) and sale codes (`SL-2026-XXXX`) are generated server-side using PostgreSQL sequences via RPC functions (`generate_job_code`, `generate_sale_code`), preventing duplicate IDs during concurrent operations.
2. **Zero-Role Exposure**: Expo public variables only include `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Service role keys are kept isolated within Supabase Edge Functions (`send-invoice-email`, etc.).
3. **Multi-Channel Dispatch Integration**: Thermal printing (`expo-print`), WhatsApp deep links (`Linking.openURL`), and Edge Function email delivery provide complete customer coverage across all intake and billing steps.
4. **Realtime UX**: Dashboard statistics, job details, and materials tables update instantaneously via Supabase Realtime Postgres channels without needing manual page reloads.
