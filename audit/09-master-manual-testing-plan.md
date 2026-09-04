# Master Manual Testing Plan (Mobile & Web)

**Project:** RepairShop Service Management System (Digital Solution)  
**Document Version:** 1.0 (Production Release Candidate)  
**Scope:** Complete Step-by-Step Test Execution Plan for All Pages, Features, and Functions Across Mobile (`RepairShopApp`) and Web (`admin-panel`).  

---

## 📋 Table of Contents

1. [Test Environment & Prerequisites](#1-test-environment--prerequisites)
2. [PART I — Web Admin Panel Manual Test Cases](#part-i--web-admin-panel-manual-test-cases)
   - [W-01: Authentication & Session Management (`/login`)](#w-01-authentication--session-management-login)
   - [W-02: Executive Dashboard (`/`)](#w-02-executive-dashboard-)
   - [W-03: Jobs Management & Table (`/jobs`)](#w-03-jobs-management--table-jobs)
   - [W-04: Job Intake & Creation (`/jobs/new`)](#w-04-job-intake--creation-jobsnew)
   - [W-05: Job Detail & Control Center (`/jobs/[id]`)](#w-05-job-detail--control-center-jobsid)
   - [W-06: POS Sales Ledger (`/sales`)](#w-06-pos-sales-ledger-sales)
   - [W-07: POS Counter Checkout & Invoicing (`/sales/new`)](#w-07-pos-counter-checkout--invoicing-salesnew)
   - [W-08: Inventory & Restocking Management (`/inventory`)](#w-08-inventory--restocking-management-inventory)
   - [W-09: Material Allotments (`/materials`)](#w-09-material-allotments-materials)
   - [W-10: Staff Directory & Rates (`/staff`)](#w-10-staff-directory--rates-staff)
   - [W-11: Leave Management (`/staff/leaves`)](#w-11-leave-management-staffleaves)
   - [W-12: Attendance Inspection Grid (`/attendance`)](#w-12-attendance-inspection-grid-attendance)
   - [W-13: Monthly Payroll & Salary Processing (`/salary`)](#w-13-monthly-payroll--salary-processing-salary)
   - [W-14: Expenditure & Cash Outflow (`/expenditure`)](#w-14-expenditure--cash-outflow-expenditure)
   - [W-15: Reports & Analytics (`/reports`)](#w-15-reports--analytics-reports)
   - [W-16: Service & Sale Catalog (`/job-types`)](#w-16-service--sale-catalog-job-types)
   - [W-17: Workshop Geofencing Configuration (`/settings/geofence`)](#w-17-workshop-geofencing-configuration-settingsgeofence)
   - [W-18: WhatsApp Integration & Logs (`/settings/whatsapp`)](#w-18-whatsapp-integration--logs-settingswhatsapp)
3. [PART II — Mobile Application Manual Test Cases](#part-ii--mobile-application-manual-test-cases)
   - [M-01: Authentication & Role-Based Navigation (`LoginScreen`)](#m-01-authentication--role-based-navigation-loginscreen)
   - [M-02: Attendance Check-in & GPS Verification (`AttendanceScreen`)](#m-02-attendance-check-in--gps-verification-attendancescreen)
   - [M-03: Receptionist Dashboard & Counters (`DashboardScreen`)](#m-03-receptionist-dashboard--counters-dashboardscreen)
   - [M-04: Receptionist Job Intake (`CustomerIntakeScreen`)](#m-04-receptionist-job-intake-customerintakescreen)
   - [M-05: Receptionist Job List & Search (`JobListScreen`)](#m-05-receptionist-job-list--search-joblistscreen)
   - [M-06: Receptionist Job Details & Actions (`JobDetailScreen`)](#m-06-receptionist-job-details--actions-jobdetailscreen)
   - [M-07: Receptionist Billing & Invoice Generation (`BillingScreen`)](#m-07-receptionist-billing--invoice-generation-billingscreen)
   - [M-08: Mobile POS Counter Sale (`NewSaleScreen`)](#m-08-mobile-pos-counter-sale-newsalescreen)
   - [M-09: Technician Dashboard & My Jobs (`TechnicianDashboardScreen` & `MyJobsScreen`)](#m-09-technician-dashboard--my-jobs-techniciandashboardscreen--myjobsscreen)
   - [M-10: Technician Work Update & Material Usage (`UpdateWorkScreen`)](#m-10-technician-work-update--material-usage-updateworkscreen)
   - [M-11: Technician Onsite Verification (`OnsiteVisitScreen`)](#m-11-technician-onsite-verification-onsitevisitscreen)
   - [M-12: Allotted Materials & Van Stock (`AllottedMaterialsScreen`)](#m-12-allotted-materials--van-stock-allottedmaterialsscreen)
   - [M-13: Push Notification Delivery & Deep Linking (`NotificationsScreen`)](#m-13-push-notification-delivery--deep-linking-notificationsscreen)
   - [M-14: User Profile & Avatar Upload (`ProfileScreen`)](#m-14-user-profile--avatar-upload-profilescreen)
   - [M-15: Inactive & Blocked User Interception (`InactiveUserScreen`)](#m-15-inactive--blocked-user-interception-inactiveuserscreen)
4. [PART III — End-to-End Cross-Platform Journeys](#part-iii--end-to-end-cross-platform-journeys)
   - [E2E-01: Full Repair Service Lifecycle (Intake -> Assignment -> Repair -> Billing -> Pickup)](#e2e-01-full-repair-service-lifecycle-intake---assignment---repair---billing---pickup)
   - [E2E-02: Counter Sale & Instant Stock Deduction Lifecycle](#e2e-02-counter-sale--instant-stock-deduction-lifecycle)
   - [E2E-03: Attendance Out-of-Bounds Review & Salary Calculation Cycle](#e2e-03-attendance-out-of-bounds-review--salary-calculation-cycle)

---

## 1. Test Environment & Prerequisites

### Test Accounts Required
1. **Admin User:** `admin@repairshop.com` / `Password123!` (Role: `admin`)
2. **Receptionist User:** `receptionist@repairshop.com` / `Password123!` (Role: `receptionist`)
3. **Technician 1:** `tech1@repairshop.com` / `Password123!` (Role: `technician`)
4. **Technician 2:** `tech2@repairshop.com` / `Password123!` (Role: `technician`)
5. **Inactive User:** `blocked@repairshop.com` / `Password123!` (Role: `technician`, `is_active: false`)

### Devices & Browsers
- **Web:** Chrome / Edge / Firefox (Desktop viewport: 1440x900 or 1920x1080)
- **Mobile Hardware:** Android Device (Android 11+) & iOS Device (iOS 16+) with Camera & Location services enabled.

---

# PART I — Web Admin Panel Manual Test Cases

---

### W-01: Authentication & Session Management (`/login`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-01.1** | Valid Admin Login | 1. Navigate to `/login`.<br>2. Enter email: `admin@repairshop.com` and password: `Password123!`.<br>3. Click **"Sign In"**. | User is authenticated; redirected to Executive Dashboard (`/`). Session persists on refresh. | `[  ]` |
| **W-01.2** | Invalid Credentials | 1. Enter valid email with incorrect password.<br>2. Click **"Sign In"**. | Error toast/alert displays: "Invalid login credentials". Page remains on `/login`. | `[  ]` |
| **W-01.3** | Empty Field Validation | 1. Leave Email and/or Password empty.<br>2. Click **"Sign In"**. | Browser/form validation highlights required inputs; no request sent to Supabase. | `[  ]` |
| **W-01.4** | Non-Admin Role Redirection | 1. Log in with technician account credentials on Web. | Redirection is blocked or warning displayed indicating web panel requires administrative privileges. | `[  ]` |
| **W-01.5** | Logout Workflow | 1. From sidebar, click **"Sign Out"** button.<br>2. Confirm sign out. | Session is cleared from `localStorage`; user is redirected back to `/login`. Back button cannot access protected routes. | `[  ]` |

---

### W-02: Executive Dashboard (`/`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-02.1** | KPI Cards Loading | 1. Log in as Admin.<br>2. Observe top KPI cards (Total Jobs, In Progress, Low Stock Items, Monthly Revenue). | Cards show actual aggregated counts matching database. Numbers format with Indian comma grouping. | `[  ]` |
| **W-02.2** | Low Stock Alert Banner | 1. Ensure at least 1 item in `inventory` has `quantity <= low_stock_threshold`.<br>2. View Dashboard. | Low stock banner/badge displays item names with current remaining quantity and a link to `/inventory`. | `[  ]` |
| **W-02.3** | Monthly Revenue Chart | 1. Observe the Recharts Revenue Area/Bar chart.<br>2. Hover over data points. | Tooltip renders date/month and accurate INR currency amount (`₹XX,XXX.00`). | `[  ]` |
| **W-02.4** | Recent Jobs Quick Table | 1. Verify the list of latest 5 repair jobs.<br>2. Click on a job row. | Navigates directly to `/jobs/[id]` for that specific repair job. | `[  ]` |

---

### W-03: Jobs Management & Table (`/jobs`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-03.1** | Full-Text Search | 1. Navigate to `/jobs`.<br>2. Type a customer name (e.g. "Rahul") or Job Code (e.g. "RS-2026-0001") in search bar. | Table filters in real-time (<300ms debounce) showing only matching rows. | `[  ]` |
| **W-03.2** | Multi-Status Filtering | 1. Select status dropdown: "In Progress".<br>2. Select status: "Completed". | Table updates to display only jobs matching selected status. Status badges render with correct color tokens. | `[  ]` |
| **W-03.3** | Technician Filter | 1. Select technician dropdown (e.g. "Arshad Ali"). | Only jobs assigned to that technician appear. | `[  ]` |
| **W-03.4** | Priority Filter & Badges | 1. Filter by "Urgent". | Only urgent priority jobs render with red danger badges. | `[  ]` |
| **W-03.5** | CSV Export | 1. Click **"Export CSV"** button. | Browser downloads `.csv` file containing filtered jobs with headers (`Job Code`, `Customer`, `Status`, `Date`). | `[  ]` |

---

### W-04: Job Intake & Creation (`/jobs/new`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-04.1** | Happy-Path Job Intake | 1. Navigate to `/jobs/new`.<br>2. Enter Customer Name: "Amit Sharma", Contact: "9876543210", Email: "amit@test.com".<br>3. Select Device Type: "Laptop", Brand/Model: "Dell XPS 15".<br>4. Enter Reported Issue: "Battery draining fast, overheating".<br>5. Select Service Catalog type (e.g. "General Servicing").<br>6. Assign Technician: "Arshad Ali".<br>7. Set Priority: "High".<br>8. Click **"Create Job"**. | System calls `generate_job_code()`, inserts row with `RS-YYYY-XXXX`, links snapshot incentives, and redirects to `/jobs/[id]` with success toast. | `[  ]` |
| **W-04.2** | Auto-Generated Job Code | 1. Check generated code format. | Follows exact sequence pattern `RS-2026-XXXX`. | `[  ]` |
| **W-04.3** | Required Field Validation | 1. Leave Customer Name or Reported Issue empty.<br>2. Click **"Create Job"**. | Form highlights missing fields with red error text; submission is blocked. | `[  ]` |
| **W-04.4** | Phone Number Formatting | 1. Enter phone as `98765-43210` or `09876543210`. | Form normalizes phone number to 10 clean digits before saving. | `[  ]` |

---

### W-05: Job Detail & Control Center (`/jobs/[id]`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-05.1** | Status Progression | 1. Open an active job (`/jobs/[id]`).<br>2. Change status from `Received` -> `In Progress` -> `Completed`. | Status badge updates immediately. Timestamp `completed_at` is set when marked `Completed`. Database trigger accrues staff incentives. | `[  ]` |
| **W-05.2** | Inline Details Editing | 1. Click **"Edit Details"** button.<br>2. Modify Reported Issue and Remarks.<br>3. Click **"Save Changes"**. | Form toggles out of edit mode; updated text persists upon page refresh. | `[  ]` |
| **W-05.3** | Technician Re-assignment Modal | 1. Click **"Reassign Technician"**.<br>2. Choose new technician from modal dropdown.<br>3. Click **"Confirm Reassignment"**. | Primary technician is updated; row added to `job_technicians`; audit note appended to job. | `[  ]` |
| **W-05.4** | Adding Repair Materials | 1. Under Materials section, select item from inventory (e.g. "Thermal Paste"), Qty: 1.<br>2. Click **"Add Material"**. | Material appears in table; total parts cost auto-recalculates; inventory stock is decremented. | `[  ]` |
| **W-05.5** | Removing Repair Materials | 1. Click trash/remove icon next to a material. | Material is deleted from job; parts total updates; inventory stock is restored to warehouse. | `[  ]` |
| **W-05.6** | Billing & Invoice Calculation | 1. Under Billing section, enter Labour Charge: `400`, Tax: `18%`, Discount: `50`.<br>2. Check Grand Total. | Grand total calculates live: `(Parts + 400) * 1.18 - 50`. No negative total possible. | `[  ]` |
| **W-05.7** | Invoice Generation & PDF | 1. Click **"Generate Invoice"**.<br>2. Click **"Download PDF"** / **"View Drive Link"**. | Edge function `generate-invoice` compiles HTML, generates Drive file, and returns clickable link. | `[  ]` |
| **W-05.8** | Email Invoice to Customer | 1. Click **"Email Invoice"**.<br>2. Confirm customer email. | Email dispatches via Resend API. Dispatches success banner. Attempting again within 60s shows rate-limit toast. | `[  ]` |
| **W-05.9** | Customer Review Score | 1. If customer review exists, inspect rating stars (1.0 to 5.0). | Star rating displays with comments. Scores >=4.5 or <3.0 trigger payroll bonus/penalty logic. | `[  ]` |

---

### W-06: POS Sales Ledger (`/sales`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-06.1** | Sales Table Loading | 1. Navigate to `/sales`. | Renders list of all counter sales with `Sale Code`, `Customer`, `Items Count`, `Grand Total`, `Payment Mode`, `Status`. | `[  ]` |
| **W-06.2** | Search by Sale Code / Customer | 1. Enter `SALE-2026` or customer name in search. | Table filters instantly. | `[  ]` |
| **W-06.3** | Payment Mode Filter | 1. Filter by "UPI", "Cash", or "Card". | Displays only sales completed with selected payment method. | `[  ]` |
| **W-06.4** | View Sale Receipt Modal | 1. Click on a sale row. | Modal opens displaying itemized receipt preview with print action. | `[  ]` |

---

### W-07: POS Counter Checkout & Invoicing (`/sales/new`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-07.1** | Add Catalog Items to Cart | 1. Navigate to `/sales/new`.<br>2. Select product from dropdown (e.g. "Wireless Mouse", Stock: 15).<br>3. Adjust quantity to 2.<br>4. Click **"Add to Cart"**. | Product is added to cart table; line total calculates `2 * unit_price`. Remaining stock indicator updates. | `[  ]` |
| **W-07.2** | Out of Stock Validation | 1. Attempt to add item with quantity exceeding available warehouse stock. | Alert displays: "Requested quantity exceeds available stock". Item cannot be added. | `[  ]` |
| **W-07.3** | Tax & Discount Calculation | 1. Add ₹1,000 subtotal of items.<br>2. Set GST: `18%`, Discount: `100`. | Grand Total calculates: `(1000 * 1.18) - 100 = 1080.00`. | `[  ]` |
| **W-07.4** | Complete Checkout & Payment | 1. Enter Customer Name: "Deepak Patel", Phone: "9876543210".<br>2. Select Payment Mode: "UPI".<br>3. Click **"Complete Sale & Print Invoice"**. | Generates code `SALE-YYYY-XXXX`; deducts stock in `inventory`; inserts `sales` and `sale_items`; opens printable invoice view. | `[  ]` |

---

### W-08: Inventory & Restocking Management (`/inventory`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-08.1** | Inventory Table Inspection | 1. Navigate to `/inventory`. | Lists all items with `Item Name`, `SKU/Category`, `In Stock`, `Cost Price`, `Selling Price`, `Status`. | `[  ]` |
| **W-08.2** | Low Stock Filter | 1. Click **"Low Stock Only"** filter toggle. | Displays only items where `quantity <= low_stock_threshold` with warning badges. | `[  ]` |
| **W-08.3** | Add New Product Modal | 1. Click **"Add New Product"**.<br>2. Enter Name: "NVMe SSD 1TB", Category: "Storage", Cost: `4500`, Selling: `5800`, Opening Stock: `5`, Threshold: `2`.<br>3. Click **"Save Product"**. | Product is created; initial quantity is set to 5; initial transaction recorded in `inventory_transactions`. | `[  ]` |
| **W-08.4** | Restock Existing Item Modal | 1. Click **"Add Stock"** icon on an item.<br>2. Enter Quantity: `10`, Reason: "Supplier Shipment #402".<br>3. Click **"Confirm Restock"**. | Item quantity increments by 10; audit row written to `inventory_transactions`. | `[  ]` |
| **W-08.5** | Edit Product Pricing & Threshold | 1. Click **"Edit"** on a product.<br>2. Change Selling Price from `5800` to `6000`.<br>3. Save. | Price updates in table and reflects immediately in POS / Repair job materials picker. | `[  ]` |

---

### W-09: Material Allotments (`/materials`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-09.1** | View Allotted Spares | 1. Navigate to `/materials`. | Table displays all spare parts currently in custody of mobile technicians. | `[  ]` |
| **W-09.2** | Filter by Technician | 1. Select technician dropdown. | Filters allotments showing only items held by that specific staff member. | `[  ]` |
| **W-09.3** | Return Allotment to Warehouse | 1. Click **"Return to Stock"** on an allotted item.<br>2. Confirm return quantity. | Item is deducted from technician's allotment and added back to warehouse `inventory`. | `[  ]` |

---

### W-10: Staff Directory & Rates (`/staff`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-10.1** | Staff List & Roles | 1. Navigate to `/staff`. | Lists all registered staff with `Name`, `Email`, `Phone`, `Role Badge`, `Status (Active/Blocked)`. | `[  ]` |
| **W-10.2** | Add New Employee Modal | 1. Click **"Add Staff Member"**.<br>2. Enter Name: "Karan Johar", Email: "karan@repairshop.com", Role: "Technician", Password: `TempPass123!`.<br>3. Submit. | Calls `admin-create-user` Edge Function; creates Supabase Auth user & `public.users` record. | `[  ]` |
| **W-10.3** | Configure Staff Compensation Rates | 1. Click **"Edit Rates"** on a staff row.<br>2. Set Base Monthly Salary: `25000`, Halfday Deduction: `500`, OT Rate/Hr: `150`, Late Deduction: `100`.<br>3. Click **"Save Rates"**. | Upserts `staff_rates` table; values used in monthly payroll calculations. | `[  ]` |
| **W-10.4** | Block / Deactivate Staff Member | 1. Toggle `is_active` switch on a staff member to `Blocked`.<br>2. Confirm prompt. | User's `is_active` becomes `false`. Employee is immediately blocked from logging in on mobile/web. | `[  ]` |

---

### W-11: Leave Management (`/staff/leaves`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-11.1** | Pending Leave Requests List | 1. Navigate to `/staff/leaves`. | Lists pending leave submissions from staff with date range, reason, and status badge. | `[  ]` |
| **W-11.2** | Approve Leave Request | 1. Click **"Approve"** on a pending leave request.<br>2. Confirm. | Leave status updates to `approved`. Approved leave days are factored into monthly attendance without absent penalties. | `[  ]` |
| **W-11.3** | Reject Leave Request | 1. Click **"Reject"** on a pending leave request.<br>2. Enter rejection reason. | Leave status updates to `rejected`. | `[  ]` |

---

### W-12: Attendance Inspection Grid (`/attendance`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-12.1** | Attendance Grid View | 1. Navigate to `/attendance`.<br>2. Select Month (e.g. "August 2026"). | Grid renders all days of the month for each staff member with status chips (`P`, `HD`, `L`, `A`). | `[  ]` |
| **W-12.2** | Selfie Inspection Lightbox | 1. Click on an attendance cell that has a selfie.<br>2. Lightbox modal opens. | Modal displays full-resolution check-in/out selfie photo, timestamp, and location coordinates. | `[  ]` |
| **W-12.3** | Out-of-Bounds Review Action | 1. Locate an attendance entry marked with yellow `Pending Review` (out-of-bounds check-in).<br>2. Click **"Approve Location"** or **"Mark Absent"**. | Record updates to `approved` (marks Present) or `rejected` (marks Absent). | `[  ]` |
| **W-12.4** | Manual Attendance Adjustment | 1. Click on a staff cell.<br>2. Change status from `Absent` to `Present` with admin reason. | Updates attendance table; logs adjustment to audit history. | `[  ]` |

---

### W-13: Monthly Payroll & Salary Processing (`/salary`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-13.1** | Trigger Monthly Salary Calculation | 1. Navigate to `/salary`.<br>2. Select Month: "2026-08".<br>3. Click **"Calculate Payroll"**. | Calls `calculate-monthly-salary` Edge Function; computes working days (excluding Sundays & holidays), penalties, OT, bonuses, and advance deductions. | `[  ]` |
| **W-13.2** | Itemized Breakdown Inspection | 1. Click on an employee row in payroll table. | Drawer/modal reveals full breakdown: Base Pay, Present Days Pay, Halfday Pay, OT Pay, Late Deductions, Customer Review Bonus/Penalty, Advance Deducted, Gross Salary, Net Salary. | `[  ]` |
| **W-13.3** | Add Discretionary Employee Bonus | 1. Click **"Add Bonus"**.<br>2. Select Staff, Amount: `1500`, Reason: "Festival Performance Bonus".<br>3. Save. | Inserts into `employee_bonus`; payroll recalculates with added bonus. | `[  ]` |
| **W-13.4** | Mark Payroll as Paid | 1. Click **"Mark as Paid"** for an employee.<br>2. Select Payment Mode: "Bank Transfer". | `salary.status` updates to `paid`; `paid_at` timestamp recorded. | `[  ]` |

---

### W-14: Expenditure & Cash Outflow (`/expenditure`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-14.1** | Log Daily Shop Expense | 1. Navigate to `/expenditure`.<br>2. Click **"Record Expense"**.<br>3. Select Category: "daily_expenditure", Amount: `350`, Description: "Workshop cleaning supplies & tea".<br>4. Submit. | Inserts row in `payments`; updates monthly expense total and category breakdown chart. | `[  ]` |
| **W-14.2** | Record Advance Salary Payment | 1. Click **"Record Expense"**.<br>2. Category: "advance_salary", Select Employee: "Arshad Ali", Amount: `3000`.<br>3. Submit. | Records payment row; advance automatically deducts during monthly payroll processing for that employee. | `[  ]` |

---

### W-15: Reports & Analytics (`/reports`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-15.1** | Date Range Filter | 1. Navigate to `/reports`.<br>2. Select Date Range: "Last 30 Days" or custom date range. | KPI summaries and charts refresh to display data within selected date boundaries. | `[  ]` |
| **W-15.2** | Technician Performance Chart | 1. Inspect Technician Turnaround & Completed Jobs chart. | Displays comparative job completion counts and average turnaround hours per technician. | `[  ]` |
| **W-15.3** | Export Complete CSV Report | 1. Click **"Export Full Report (CSV)"**. | Downloads comprehensive CSV file of revenue, job turnaround, parts usage, and staff incentives. | `[  ]` |

---

### W-16: Service & Sale Catalog (`/job-types`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-16.1** | Add Repair Service Category | 1. Navigate to `/job-types`.<br>2. Click **"Add Service Type"**.<br>3. Title: "Motherboard Chip-Level Repair", Base Customer Charge: `2500`, Receptionist Incentive: `100`, Tech Incentive: `300`.<br>4. Save. | Service type is added to `job_types`; appears in intake dropdowns immediately. | `[  ]` |
| **W-16.2** | Toggle Category Active / Inactive | 1. Toggle `is_active` off for an obsolete service. | Category is hidden from mobile intake dropdowns while preserving historical repair references. | `[  ]` |

---

### W-17: Workshop Geofencing Configuration (`/settings/geofence`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-17.1** | Interactive Leaflet Map Pin | 1. Navigate to `/settings/geofence`.<br>2. Drag map marker to workshop building roof.<br>3. Observe Latitude and Longitude input fields. | Inputs update live with high-precision GPS coordinates as marker moves. | `[  ]` |
| **W-17.2** | Adjust Geofence Radius Slider | 1. Move Radius slider from `50m` to `75m`.<br>2. Observe blue radius circle overlay on map. | Circle dynamically resizes on map to visually reflect the 75m attendance boundary. | `[  ]` |
| **W-17.3** | Save Geofence Coordinates | 1. Click **"Save Geofence Settings"**.<br>2. Refresh page. | Settings persist in `geofence_settings`; mobile app applies new boundary immediately for check-ins. | `[  ]` |

---

### W-18: WhatsApp Integration & Logs (`/settings/whatsapp`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **W-18.1** | Configure Message Templates | 1. Navigate to `/settings/whatsapp`.<br>2. Edit "Ready for Pickup" template: `"Hello {customer_name}, your device {job_code} is ready at RepairShop."`<br>3. Save. | Template updates in database; used for generating pre-filled customer links. | `[  ]` |
| **W-18.2** | Inspect Notification Delivery Logs | 1. Check WhatsApp logs table. | Displays log rows with `Recipient Phone`, `Job Code`, `Timestamp`, and `Status (Sent/Failed)`. | `[  ]` |

---

# PART II — Mobile Application Manual Test Cases

---

### M-01: Authentication & Role-Based Navigation (`LoginScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-01.1** | Receptionist Login Flow | 1. Open app.<br>2. Enter email: `receptionist@repairshop.com` and password: `Password123!`.<br>3. Tap **"Sign In"**. | App authenticates; routes to `ReceptionistRoot` navigation stack with Receptionist Tabs (Dashboard, Jobs, Intake, Attendance, Profile). | `[  ]` |
| **M-01.2** | Technician Login Flow | 1. Log in with `tech1@repairshop.com` / `Password123!`. | App routes to `TechnicianRoot` stack with Technician Tabs (Dashboard, My Jobs, Attendance, Profile). Receptionist/Admin screens are inaccessible. | `[  ]` |
| **M-01.3** | Admin Mobile Login Flow | 1. Log in with `admin@repairshop.com` / `Password123!`. | App routes to `AdminRoot` stack with full mobile administrative oversight. | `[  ]` |
| **M-01.4** | Show/Hide Password Toggle | 1. Type password.<br>2. Tap Eye icon toggle. | Switches between masked `••••••` and plain text. | `[  ]` |
| **M-01.5** | Session Persistence | 1. Log in as Technician.<br>2. Force-close mobile app completely.<br>3. Relaunch app. | App opens directly into Technician Dashboard without prompting for login (restored via `expo-secure-store`). | `[  ]` |

---

### M-02: Attendance Check-in & GPS Verification (`AttendanceScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-02.1** | Permission Requests | 1. Open Attendance tab on fresh install.<br>2. Observe OS prompts. | App requests Camera permission and Location (GPS) permission with clear explanation. | `[  ]` |
| **M-02.2** | Inside Workshop Geofence Check-in (<50m) | 1. Stand inside workshop boundary.<br>2. Tap **"Check In"**.<br>3. Front camera opens; snap selfie.<br>4. Tap **"Submit Check-in"**. | Photo compresses to WebP; uploads to `attendance-selfies`; captures GPS; marks status `Present`, `at_location = true`, `review_status = 'approved'`. UI shows green checked badge. | `[  ]` |
| **M-02.3** | Outside Workshop Geofence Check-in (>50m) | 1. Test check-in from distance >50m from workshop.<br>2. Capture selfie and submit. | App alerts: "You are outside the workshop geofence. Your attendance has been submitted for Admin Review." Status marks `review_status = 'pending'`. | `[  ]` |
| **M-02.4** | Check-out Workflow | 1. At end of shift, tap **"Check Out"**.<br>2. Snap departure selfie and submit. | Departure timestamp & departure selfie recorded; shifts minutes and overtime calculated. | `[  ]` |
| **M-02.5** | 30-Day Attendance History List | 1. Scroll down on Attendance screen.<br>2. Pull-to-refresh list. | Displays 30-day chronological list with date, check-in time, check-out time, status badge, and location approval status. | `[  ]` |

---

### M-03: Receptionist Dashboard & Counters (`DashboardScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-03.1** | Daily Intake & Delivery Counters | 1. Log in as Receptionist.<br>2. View Dashboard top counters. | Displays "Today's Intake" and "Today's Delivered" counts matching database records. | `[  ]` |
| **M-03.2** | Quick Action Shortcuts | 1. Tap **"New Repair Job"** button.<br>2. Tap **"New Counter Sale"** button. | Seamlessly pushes `CustomerIntakeScreen` or `NewSaleScreen`. | `[  ]` |
| **M-03.3** | Recent Jobs Card List | 1. Scroll through recent jobs carousel/cards.<br>2. Tap on any job card. | Opens `JobDetailScreen` with full repair context. | `[  ]` |

---

### M-04: Receptionist Job Intake (`CustomerIntakeScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-04.1** | Complete Job Intake Submission | 1. Tap **"New Intake"**.<br>2. Enter Customer Name: "Pooja Hegde", Phone: "9876543210".<br>3. Select Device Type: "Laptop", Brand: "HP Pavilion 14".<br>4. Enter Reported Issue: "No power, charging light blinking".<br>5. Select Service Catalog type (e.g. "Motherboard Repair").<br>6. Select Technician: "Arshad Ali".<br>7. Tap **"Create Repair Job"**. | Generates code `RS-2026-XXXX`; saves job to database; displays Success Modal with options: "Print Receipt", "WhatsApp Customer", "View Job". Assigned technician receives push alert. | `[  ]` |
| **M-04.2** | Print Intake Receipt | 1. From Success Modal, tap **"Print Receipt"**. | Opens `expo-print` thermal printer sheet formatted with 58mm/80mm layout, job code barcode, customer details, and terms. | `[  ]` |
| **M-04.3** | WhatsApp Confirmation Link | 1. Tap **"WhatsApp Customer"**. | Opens WhatsApp with pre-filled message: "Hello Pooja, your repair job RS-2026-0001 has been registered at RepairShop." | `[  ]` |

---

### M-05: Receptionist Job List & Search (`JobListScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-05.1** | Real-Time Search Bar | 1. Type "HP" or customer phone number in search bar. | List filters dynamically as user types without lag. | `[  ]` |
| **M-05.2** | Status Filter Chips | 1. Tap filter chips: "All", "Received", "In Progress", "Completed". | List re-renders showing only jobs matching selected chip. | `[  ]` |
| **M-05.3** | Priority Indicator Badges | 1. Observe job card list. | Urgent priority jobs display bold red priority badge; normal jobs show standard badge. | `[  ]` |

---

### M-06: Receptionist Job Details & Actions (`JobDetailScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-06.1** | Job Overview Tab | 1. Tap on a job from list.<br>2. Inspect Customer, Device, Issue, Technician, and Status timeline. | All details match database. Pull-to-refresh updates live status if technician made progress. | `[  ]` |
| **M-06.2** | Materials Used Tab | 1. Switch to **"Materials"** tab. | Lists all spare parts and materials logged by technician with unit costs and total cost. | `[  ]` |
| **M-06.3** | WhatsApp Ready-for-Pickup Action | 1. When status is `Completed`, tap green **"WhatsApp Ready Notice"** button. | Opens WhatsApp chat with customer pre-filled: "Your device RS-2026-0001 is repaired and ready for pickup. Grand Total: ₹X,XXX." | `[  ]` |
| **M-06.4** | Navigate to Billing | 1. Tap **"Proceed to Billing"** button. | Pushes `BillingScreen` with pre-populated parts total. | `[  ]` |

---

### M-07: Receptionist Billing & Invoice Generation (`BillingScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-07.1** | Live Grand Total Formula Calculation | 1. Open Billing for a job with ₹800 parts.<br>2. Enter Labour Charge: `400`.<br>3. Enter GST: `18%`.<br>4. Enter Discount: `50`. | Grand total preview updates in real-time to `(800 + 400) * 1.18 - 50 = ₹1,366.00`. | `[  ]` |
| **M-07.2** | Mark as Paid & Save Invoice | 1. Select Payment Method: "Cash" or "UPI".<br>2. Tap **"Finalize & Mark Paid"**. | Upserts `billing` table; sets `is_paid = true`; generates invoice record; opens share/print dialog. | `[  ]` |
| **M-07.3** | Thermal Receipt Print | 1. Tap **"Print Receipt"**. | Generates thermal printer receipt formatted with breakdown: Parts, Labour, Tax, Discount, Grand Total. | `[  ]` |

---

### M-08: Mobile POS Counter Sale (`NewSaleScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-08.1** | Add Multiple Retail Items to Cart | 1. Navigate to New Sale screen.<br>2. Select product from inventory (e.g. "HDMI Cable"), set Qty: 2.<br>3. Add second product ("Type-C Adapter"), Qty: 1. | Cart calculates item subtotals and grand total live. | `[  ]` |
| **M-08.2** | Stock Limit Protection | 1. Attempt to select quantity greater than displayed stock. | App warns user and restricts quantity stepper to maximum available warehouse stock. | `[  ]` |
| **M-08.3** | Complete POS Checkout | 1. Enter Customer Name: "Sameer Roy", Phone: "9876543210".<br>2. Select Payment Mode: "UPI".<br>3. Tap **"Complete Sale"**. | Creates sale `SALE-YYYY-XXXX`; stock decrements in warehouse; shows success receipt modal. | `[  ]` |

---

### M-09: Technician Dashboard & My Jobs (`TechnicianDashboardScreen` & `MyJobsScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-09.1** | Technician Job Isolation | 1. Log in as `tech1@repairshop.com`.<br>2. Open "My Jobs" tab. | Lists **only** jobs assigned to Tech 1. Jobs assigned to other technicians are strictly excluded (enforced by RLS). | `[  ]` |
| **M-09.2** | Technician Dashboard KPI Counters | 1. View Dashboard tab. | Shows "Assigned to Me", "In Progress", and "Completed Today" metrics. | `[  ]` |
| **M-09.3** | Tap Job for Work Update | 1. Tap any assigned job card. | Opens `UpdateWorkScreen`. | `[  ]` |

---

### M-10: Technician Work Update & Material Usage (`UpdateWorkScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-10.1** | Status Transition Buttons | 1. Tap **"Start Work"** (moves to `In Progress`).<br>2. Tap **"Waiting for Parts"** (moves to `Waiting for Materials`).<br>3. Tap **"Mark Complete"** (moves to `Completed`). | Status updates immediately; triggers push notification to receptionist/admin. `completed_at` timestamp is written. | `[  ]` |
| **M-10.2** | Log Used Materials from Inventory | 1. Under "Parts & Materials", tap **"Add Part"**.<br>2. Select item from warehouse stock (e.g. "Screen Adhesive"), Qty: 1.<br>3. Tap **"Log Part"**. | Material is logged under job; warehouse inventory quantity auto-decrements via database trigger. | `[  ]` |
| **M-10.3** | Work Notes Editor | 1. Enter text in Work Notes: "Cleaned fan, replaced display ribbon cable".<br>2. Tap **"Save Notes"**. | Notes persist in `jobs.work_notes`. Visible to receptionist and admin. | `[  ]` |

---

### M-11: Technician Onsite Verification (`OnsiteVisitScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-11.1** | Arrival Selfie & GPS Capture | 1. Open Onsite Visit for field job.<br>2. Tap **"Record Arrival"**.<br>3. Capture front camera selfie at client location.<br>4. Confirm. | Rear/front camera captures photo; acquires high-accuracy GPS; uploads to `onsite-visits` bucket; records arrival timestamp. | `[  ]` |
| **M-11.2** | Departure Selfie & Job Completion | 1. After completing repair, tap **"Record Departure"**.<br>2. Capture departure photo with repaired device.<br>3. Confirm. | Departure timestamp & photo recorded; visit marked complete. | `[  ]` |

---

### M-12: Allotted Materials & Van Stock (`AllottedMaterialsScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-12.1** | Inspect Possessed Allotments | 1. Open Allotted Materials screen as Technician. | Lists spare parts currently allotted to this technician with remaining quantities. | `[  ]` |
| **M-12.2** | Use Allotment in Repair Job | 1. Tap **"Use on Job"** on an allotted spare.<br>2. Select active Job ID and Quantity: 1.<br>3. Confirm. | Allotment quantity decrements; material transfers into job's `job_materials` ledger. | `[  ]` |
| **M-12.3** | Return Allotment to Warehouse | 1. Tap **"Return to Stock"**.<br>2. Enter return quantity.<br>3. Confirm. | Allotment decrements; returned items restore to warehouse `inventory`. | `[  ]` |

---

### M-13: Push Notification Delivery & Deep Linking (`NotificationsScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-13.1** | Receive Job Assignment Push | 1. In background/killed app state, have Receptionist assign a new job to Technician.<br>2. Observe phone. | Phone rings/vibrates; notification banner displays: "New Job Assigned: RS-2026-0001 (Priority: Urgent)". | `[  ]` |
| **M-13.2** | Deep Link Tap to Job | 1. Tap the received push notification banner. | App cold-starts/foregrounds and navigates directly to `JobDetailScreen` for that repair job. | `[  ]` |
| **M-13.3** | Notifications Inbox List | 1. Open Notifications tab from bottom bar.<br>2. Pull-to-refresh. | Displays chronological notification history; tap to mark as read. | `[  ]` |

---

### M-14: User Profile & Avatar Upload (`ProfileScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-14.1** | Edit Profile Contact Info | 1. Open Profile tab.<br>2. Edit phone number or display name.<br>3. Tap **"Save Profile"**. | Updates `public.users` row; toast displays "Profile updated successfully". | `[  ]` |
| **M-14.2** | Upload Avatar Photo | 1. Tap profile avatar circle.<br>2. Pick photo from camera/gallery.<br>3. Crop and upload. | Compresses image, uploads to `profile-pictures/{userId}/avatar.webp`, updates `users.avatar_url`, and renders new avatar immediately. | `[  ]` |
| **M-14.3** | Change Password | 1. Tap **"Change Password"**.<br>2. Enter current password and new password.<br>3. Save. | Updates password via Supabase Auth; next login requires new password. | `[  ]` |

---

### M-15: Inactive & Blocked User Interception (`InactiveUserScreen`)

| Test ID | Test Title | Step-by-Step Instructions | Expected Result | Status |
|---|---|---|---|---|
| **M-15.1** | Blocked User Login Interception | 1. Attempt login with credentials of blocked user (`is_active: false`). | Root navigator intercepts session and locks app to `InactiveUserScreen` displaying: "Your account has been deactivated. Please contact your administrator." No tabs or data accessible. | `[  ]` |
| **M-15.2** | Inactive Screen Sign Out | 1. From `InactiveUserScreen`, tap **"Sign Out"**. | Session is cleared from device; returns to `LoginScreen`. | `[  ]` |

---

# PART III — End-to-End Cross-Platform Journeys

---

### E2E-01: Full Repair Service Lifecycle (Intake -> Assignment -> Repair -> Billing -> Pickup)

```
[Receptionist Mobile]     [Technician Mobile]          [Receptionist Mobile]     [Web Admin Panel]
  1. Intake Job       ->   2. Push Alert Received  ->   4. Status: Completed  ->  6. Audit & Invoice
  - Customer Pooja         - Opens Job Detail           - Live WhatsApp Ready     - View in /jobs/[id]
  - Device: Laptop         - Starts Work (In Prog)        Notice to Customer      - Check Stock Deduct
  - Assigns Tech 1         - Logs SSD 512GB             5. Finalize Billing       - PDF on Google Drive
                           - Marks Completed              - Cash ₹1,850 Paid
```

| Step # | Action Description | Execution & Verification Points | Pass / Fail |
|---|---|---|---|
| **Step 1** | **Intake on Mobile App** | Receptionist logs customer intake for Pooja Hegde (`9876543210`), Laptop, issue: "Dead SSD", assigns `tech1@repairshop.com`. Job `RS-2026-0001` created. Thermal receipt printed. | `[  ]` |
| **Step 2** | **Technician Push Alert** | Tech 1 device receives push alert within 3s. Tapping opens `UpdateWorkScreen`. | `[  ]` |
| **Step 3** | **Technician Progress & Materials** | Tech 1 taps "Start Work" (`In Progress`), logs material "NVMe SSD 512GB" (Qty: 1, Cost: ₹3,200), adds work notes: "Replaced drive, installed OS", taps "Mark Complete". | `[  ]` |
| **Step 4** | **WhatsApp Ready Notification** | Receptionist receives status update notification. Taps green WhatsApp button on job detail; WhatsApp opens with ready-for-pickup draft. | `[  ]` |
| **Step 5** | **Billing & Payment** | Receptionist opens Billing, sets Labour Charge: `500`, GST: `18%`, Discount: `100`. Grand total calculates `(3200 + 500) * 1.18 - 100 = ₹4,266.00`. Selects UPI payment and marks Paid. | `[  ]` |
| **Step 6** | **Web Admin Oversight** | Admin views `/jobs/[id]` on web. Verified: Status `Completed`, Billing `Paid`, Stock of SSD 512GB decremented in `/inventory`, Technician snapshot incentive accrued in `/salary`. | `[  ]` |

---

### E2E-02: Counter Sale & Instant Stock Deduction Lifecycle

```
[Web Admin / Receptionist]                      [Warehouse Inventory Database]
  1. Opens /sales/new (or Mobile NewSale)    ->   2. Inventory: "Wireless Mouse" (Stock: 10 -> 8)
  - Adds 2x Wireless Mouse                        3. Creates SALE-2026-0001
  - Applies 10% Discount                          4. Generates Tax Invoice PDF
  - Selects UPI Payment Mode                      5. Accrues Receptionist Commission
```

| Step # | Action Description | Execution & Verification Points | Pass / Fail |
|---|---|---|---|
| **Step 1** | **Cart & Product Selection** | User navigates to `/sales/new`, selects "Wireless Mouse" (available stock: 10), sets Qty: 2, unit price: ₹600. Line total = ₹1,200. | `[  ]` |
| **Step 2** | **Tax & Discount Application** | Enters Discount: `100`, GST: `18%`. Grand Total preview = `(1200 * 1.18) - 100 = ₹1,316.00`. | `[  ]` |
| **Step 3** | **Checkout Execution** | Enters customer name "Rahul Dev", selects payment "UPI", clicks **"Complete Sale"**. | `[  ]` |
| **Step 4** | **Stock & Invoice Verification** | Verifies `inventory` stock for "Wireless Mouse" is now exactly 8. Verifies sale appears in `/sales` ledger. Printable invoice opens. | `[  ]` |

---

### E2E-03: Attendance Out-of-Bounds Review & Salary Calculation Cycle

```
[Technician Mobile]                          [Web Admin Panel]
  1. Check-in >50m from Workshop       ->      2. /attendance: Marked "Pending Review"
  - Selfie Uploaded                            3. Admin Inspects Selfie & Location
  - Coordinates Captured (Out of Bounds)       4. Admin Approves Check-in -> Marks "Present"
                                               5. /salary: Triggers "Calculate Payroll"
                                               6. Base Pay + Bonus Calculated Correctly
```

| Step # | Action Description | Execution & Verification Points | Pass / Fail |
|---|---|---|---|
| **Step 1** | **Out-of-Bounds Mobile Check-in** | Technician checks in from remote location (>50m from workshop). Captures selfie and submits. Attendance saved with `review_status = 'pending'`. | `[  ]` |
| **Step 2** | **Admin Inspection on Web** | Admin opens `/attendance`. Locates pending yellow cell. Clicks cell to inspect selfie photo lightbox and Google Maps pin. | `[  ]` |
| **Step 3** | **Admin Review Approval** | Admin clicks **"Approve Location"**. Attendance updates to `review_status = 'approved'`, `status = 'Present'`. | `[  ]` |
| **Step 4** | **Monthly Payroll Execution** | Admin opens `/salary`, selects current month, clicks **"Calculate Payroll"**. | `[  ]` |
| **Step 5** | **Payroll Output Verification** | The approved day is counted as a full working day (no absent deduction). Advance salary deductions and customer review bonuses match verified calculation. | `[  ]` |

---

## 🎯 Testing Execution Sign-Off

| Milestone | Tester Name | Signature | Date Completed | Result (PASS / FAIL) |
|---|---|---|---|---|
| **Web Admin Panel Full Pass** | ____________________ | ____________________ | ____________________ | `[  ]` PASS / `[  ]` FAIL |
| **Mobile App (Android) Full Pass** | ____________________ | ____________________ | ____________________ | `[  ]` PASS / `[  ]` FAIL |
| **Mobile App (iOS) Full Pass** | ____________________ | ____________________ | ____________________ | `[  ]` PASS / `[  ]` FAIL |
| **End-to-End Workflows Pass** | ____________________ | ____________________ | ____________________ | `[  ]` PASS / `[  ]` FAIL |
