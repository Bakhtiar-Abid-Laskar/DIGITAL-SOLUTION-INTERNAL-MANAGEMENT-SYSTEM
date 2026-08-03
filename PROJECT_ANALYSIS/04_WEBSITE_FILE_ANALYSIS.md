# RepairShop — Website (Admin Panel) File Analysis

## Configuration Files

---

### `admin-panel/package.json`
- **Category:** Package Configuration
- **Size:** 713 bytes | **Lines:** 33
- **Purpose:** Defines the npm package metadata, dependencies, and scripts for the admin panel.
- **Scripts:**
  - `dev` → `next dev` — starts development server
  - `build` → `next build` — production build
  - `start` → `next start` — serves production build
  - `lint` → `eslint` — linting
- **Runtime Dependencies:**
  - `@supabase/supabase-js ^2.110.0` — Supabase client SDK
  - `clsx ^2.1.1` — conditional className utility
  - `lucide-react ^1.22.0` — icon library (SVG icons)
  - `next 16.2.9` — Next.js framework (pinned exact version)
  - `react 19.2.4` — React (pinned exact version)
  - `react-dom 19.2.4` — React DOM
  - `recharts ^3.9.1` — charting library (used in dashboard + reports)
  - `supabase ^2.109.0` — Supabase CLI (dev tools)
  - `tailwind-merge ^3.6.0` — merges Tailwind classes (used in `cn()`)
- **Dev Dependencies:**
  - `@tailwindcss/postcss ^4` — Tailwind CSS v4 PostCSS integration
  - `tailwindcss ^4` — Tailwind CSS framework (v4)
  - `typescript ^5` — TypeScript compiler
  - `eslint ^9` — linting engine

---

### `admin-panel/next.config.ts`
- **Category:** Framework Configuration
- **Purpose:** Next.js configuration. Minimal — no custom headers, redirects, or rewrites defined.
- **Key Setting:** Likely enables `tsconfigPaths` for `@/` path aliases.

---

### `admin-panel/tsconfig.json`
- **Category:** TypeScript Configuration
- **Purpose:** Sets compiler options including path aliases: `@/*` → `./src/*`, `@shared/*` → `./src/shared/*`. This allows imports like `import { supabase } from '@/lib/supabase'`.

---

### `admin-panel/.env.local`
- **Category:** Environment Variables (gitignored)
- **Purpose:** Contains actual Supabase credentials for local development.
- **Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (public, safe for client)
  - Additional undocumented variables (829 bytes — likely includes test credentials)

---

### `admin-panel/eslint.config.mjs`
- **Category:** Code Quality Config
- **Purpose:** ESLint configuration using `eslint-config-next` preset.

---

### `admin-panel/postcss.config.mjs`
- **Category:** CSS Build Config
- **Purpose:** PostCSS configuration — enables `@tailwindcss/postcss` plugin for Tailwind v4.

---

## Source Files — Library / Infrastructure

---

### `admin-panel/src/lib/supabase.ts`
- **Category:** Infrastructure | **Size:** 261 bytes | **Lines:** 7
- **Purpose:** Creates and exports the Supabase client instance for the admin panel.
- **Why it exists:** Single source of Supabase client — prevents multiple client instances.
- **Exports:** `supabase` (named export, SupabaseClient instance)
- **Key Logic:**
  ```typescript
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  ```
- **No SecureStore adapter** — uses default localStorage session persistence (browser-appropriate).
- **No auth configuration** — uses Supabase's default cookie/localStorage-based session management.
- **Dependencies:** `@supabase/supabase-js`
- **Used by:** Every page, component, and context that needs database access.

---

### `admin-panel/src/lib/tokens.ts`
- **Category:** Design System | **Size:** 1,425 bytes | **Lines:** 41
- **Purpose:** Defines the admin panel's color design tokens as a TypeScript `const` object.
- **Exports:** `ADMIN` (const object with CSS variable equivalents)
- **Color Groups:**
  - Background: `bg_base (#F8F9FB)`, `bg_surface (#FFF)`, `bg_subtle (#F1F3F7)`, `bg_hover (#EEF2FF)`
  - Brand: `accent (#3B6FF0)`, `accent_dim`, `accent_dark`
  - Status: `status_received`, `status_progress`, `status_waiting`, `status_complete`
  - Priority: `priority_normal`, `priority_high`, `priority_urgent`
  - Typography: `text_primary (#0F172A)`, `text_secondary (#475569)`, `text_muted (#94A3B8)`
  - Sidebar: `sidebar_bg (#0F172A)`, `sidebar_text`, `sidebar_active`, `sidebar_active_bg`
  - Danger: `danger (#DC2626)`, `danger_dim (#FEE2E2)`
- **Note:** These tokens duplicate CSS custom properties defined in `globals.css`. The CSS variables are used in JSX className, while these TypeScript tokens may be used for inline styles.

---

### `admin-panel/src/lib/utils.ts`
- **Category:** Utility | **Size:** 169 bytes | **Lines:** ~5
- **Purpose:** Provides the `cn()` utility function — combines `clsx` and `tailwind-merge`.
- **Exports:** `cn` (function)
- **Algorithm:** `cn(...inputs) = twMerge(clsx(inputs))` — resolves conditional classes and deduplicates conflicting Tailwind classes.
- **Used by:** Virtually every component in the admin panel for className generation.

---

### `admin-panel/src/context/AuthContext.tsx`
- **Category:** State / Auth | **Size:** 2,923 bytes | **Lines:** 114
- **Purpose:** Provides authentication state to the entire admin panel via React Context.
- **Exports:** `AuthProvider` (component), `useAuth` (hook)
- **State:** `sessionUser`, `profile` (User from DB), `isLoading`
- **Derived Values:** `role = profile?.role`, `isActive = profile?.is_active`
- **Key Behaviors:**
  1. On mount: calls `supabase.auth.getSession()` → if session exists, fetches `users` row
  2. Listens to `onAuthStateChange` for real-time login/logout events
  3. If no session and not on `/login`: redirects to `/login` via `router.push`
  4. Signs out via `supabase.auth.signOut()`
- **Cleanup:** Unsubscribes from auth state listener on unmount (via `mounted` flag prevents race conditions)
- **Dependencies:** `useRouter`, `usePathname` (Next.js navigation)
- **Used by:** `AdminLayout`, `Sidebar`, `Topbar`, `SalaryPage`

---

## Source Files — App Router Pages

---

### `admin-panel/src/app/layout.tsx`
- **Category:** Layout | **Size:** 791 bytes | **Lines:** 32
- **Purpose:** Root Next.js layout — wraps the entire application.
- **Metadata:** `title: "RepairShop Admin"`, `description: "Admin Panel for RepairShop Service Management System"`
- **Provider Tree:**
  ```
  <html lang="en" className="h-full antialiased">
    <body className="min-h-full flex flex-col font-sans bg-admin-bg-base text-admin-text-primary">
      <ToastProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ToastProvider>
    </body>
  </html>
  ```
- **Why outer ToastProvider:** Toast notifications need to be available for auth events (e.g., login failure).

---

### `admin-panel/src/app/globals.css`
- **Category:** Styles | **Size:** 3,698 bytes | **Lines:** 80
- **Purpose:** Global CSS file — defines the Tailwind v4 theme via CSS custom properties.
- **Key Sections:**
  - `@theme` block: defines CSS variables used as Tailwind utility classes (e.g., `bg-admin-accent`, `text-admin-text-primary`)
  - Animation keyframes: `fade-in`, `scale-in` — used for modal entry animations
  - Utility classes: `.animate-fade-in`, `.animate-scale-in`
- **Design Decisions:**
  - Pure white canvas (`#FFFFFF`) — not off-white
  - Purple accent (`#6D5BD0`) — authority color for admin
  - Dark sidebar (`#181B27`) — high contrast navigation
  - Status colors: pending=amber, progress=blue, completed=green, urgent=red

---

### `admin-panel/src/app/(admin)/layout.tsx`
- **Category:** Layout | **Size:** 199 bytes | **Lines:** ~8
- **Purpose:** Layout wrapper for all admin-protected pages. Renders `AdminLayout`.
- **Route Group:** `(admin)` — Next.js route group (no effect on URL, groups pages logically)

---

### `admin-panel/src/app/(admin)/page.tsx` — Overview Dashboard
- **Category:** Page | **Size:** 16,545 bytes | **Lines:** 380
- **Route:** `/` (admin root)
- **Purpose:** Real-time admin dashboard showing KPIs, alerts, donut chart, and recent jobs.
- **State:**
  - `stats` — `{ jobsToday, completedThisWeek, activeTechs, pendingApprovals }`
  - `pieData` — array of `{name, value, color}` for Recharts donut chart
  - `recentJobs` — last 10 jobs with technician join
  - `alerts` — dynamic system alerts (pending approvals, low-stock items)
- **Data Fetching:** 5 parallel Supabase queries:
  1. Count of jobs created today
  2. Count of completed jobs this week
  3. Count of active technicians
  4. Count of inactive users (pending approvals)
  5. All inventory items (for low-stock calculation)
  6. Recent 10 jobs with technician join
  7. Today's jobs with status counts (for pie chart)
- **Realtime:** Subscribes to `jobs` and `users` tables — refreshes on any change
- **Sub-Components:** `StatCard` (inline), imports from `@/components/common/*`
- **Chart:** Recharts `PieChart` with `Pie` (donut style: `innerRadius=60, outerRadius=80`)
- **Navigation:** Clicking a job row pushes to `/jobs/:id`

---

### `admin-panel/src/app/(admin)/jobs/page.tsx` — Jobs List
- **Category:** Page | **Size:** 14,813 bytes | **Lines:** 379
- **Route:** `/jobs`
- **Purpose:** Full-featured jobs management table with filtering, search, pagination, and reassignment.
- **Filters:**
  - Status filter (tabs: All, Received, In Progress, Completed, Waiting)
  - Technician filter (dropdown)
  - Priority filter (dropdown: All/Normal/High/Urgent)
  - Search query (job code, customer name, phone — debounced 300ms)
  - Date range (from/to date pickers)
- **Pagination:** 20 jobs per page, Supabase `.range(from, to)` server-side pagination
- **Realtime:** Supabase channel on `jobs` table — auto-refreshes list on any change
- **Actions:**
  - Click row → navigate to `/jobs/:id`
  - Edit icon → open `ReassignTechnicianModal`
  - Export CSV button → `exportJobsToCSV(jobs)`
- **Custom Hook:** `useDebounceValue<T>(value, delay)` — defined inline in the file

---

### `admin-panel/src/app/(admin)/jobs/[id]/page.tsx` — Job Detail
- **Category:** Page | **Size:** 39,835 bytes | **Lines:** 805
- **Route:** `/jobs/:id`
- **Purpose:** Comprehensive job detail view with tabs for overview, materials, billing, and notes.
- **Tabs:** `overview` | `materials` | `billing` | `notes`
- **State:** job, materials, technicians, billing, editForm, billingForm, notes, confirmModal
- **Data Fetching:** 4 parallel queries via `Promise.all`:
  1. Job + technician join
  2. Job materials
  3. Billing record
  4. Active technicians list
- **Edit Mode:** Toggle `isEditing` to modify job fields inline (status, priority, technician, etc.)
- **Materials Tab:** Add new material form + delete with confirmation modal
- **Billing Tab:** Labour, tax, discount inputs + grand total calculation + pay status toggle
- **Notes Tab:** Work notes textarea with save
- **Print:** Button navigates to `/jobs/:id/print`
- **WhatsApp:** Opens WhatsApp deep link with pre-filled message
- **Email:** Calls `send-invoice-email` Edge Function directly
- **Confirmation Modal:** Used for status changes, deletions (destructive actions)

---

### `admin-panel/src/app/(admin)/jobs/[id]/print/page.tsx` — Print Invoice
- **Category:** Page | **Size:** 3,356 bytes | **Lines:** ~80
- **Route:** `/jobs/:id/print`
- **Purpose:** Print-optimized full-page invoice view.
- **Behavior:** Loads job + billing data, renders `InvoiceTemplate`, triggers `window.print()` on mount.

---

### `admin-panel/src/app/(admin)/jobs/new/page.tsx` — New Job
- **Category:** Page | **Size:** 12,555 bytes | **Lines:** ~300
- **Route:** `/jobs/new`
- **Purpose:** Admin-side job creation form.
- **Fields:** Customer name, contact, email, device type, issue, job type, priority, technician
- **Job Code:** Generated via `supabase.rpc('generate_job_code')` — server-side only

---

### `admin-panel/src/app/(admin)/staff/page.tsx` — Staff Management
- **Category:** Page | **Size:** 10,971 bytes | **Lines:** 264
- **Route:** `/staff`
- **Purpose:** View, filter, approve, and block staff accounts. View attendance records.
- **Filters:** Role (All/admin/receptionist/technician), Status (All/Active/Inactive), Search by name
- **Actions:**
  - Approve user → `is_active = true` (with confirmation modal)
  - Block user → `is_active = false` (with confirmation modal, marked as destructive)
  - View Attendance → opens `AttendanceModal` showing 30-day attendance history
  - Add Staff → opens `AddStaffModal` with role selection + password
- **Security:** Block action uses destructive styling (red confirm button)

---

### `admin-panel/src/app/(admin)/salary/page.tsx` — Salary Management
- **Category:** Page | **Size:** 3,436 bytes | **Lines:** 98
- **Route:** `/salary`
- **Purpose:** Admin-only salary management with 3 tabs.
- **Role Guard:** If `role !== 'admin'` → renders Access Denied state with lock icon
- **Tabs:**
  1. **Calculate Salary** → `SalaryCalculatorForm` + `SalaryBreakdownCard`
  2. **Staff Rates** → `StaffRateForm` (set base rate, OT rate, early deduction rate)
  3. **Advance Salary** → `AdvanceSalaryForm` (record advance payment)

---

### `admin-panel/src/app/(admin)/inventory/page.tsx` — Inventory
- **Category:** Page | **Size:** 8,621 bytes | **Lines:** 203
- **Route:** `/inventory`
- **Purpose:** Full CRUD inventory management.
- **Features:** Search, add item, edit item, delete item (with confirmation), low-stock badge
- **Low Stock Detection:** `item.quantity <= item.low_stock_threshold`

---

### `admin-panel/src/app/(admin)/reports/page.tsx` — Reports
- **Category:** Page | **Size:** 21,098 bytes | **Lines:** 448
- **Route:** `/reports`
- **Purpose:** Business intelligence reports with 3 tabs.
- **Tabs:**
  1. **Technician Performance** — Bar chart of completed jobs per technician for a selected month
  2. **Customer History** — Search customer by name/phone, shows all their jobs
  3. **Revenue** — Total revenue, labour, parts breakdown + recent billing list
- **Chart:** Recharts `BarChart` for technician performance
- **Export:** CSV export of customer job history

---

### `admin-panel/src/app/(admin)/expenditure/page.tsx` — Expenditure
- **Category:** Page | **Size:** 6,801 bytes | **Lines:** ~160
- **Route:** `/expenditure`
- **Purpose:** Track operational expenditures (materials, daily expenses, office development).
- **Components:** `ExpenditureForm`, `ExpenditureSummaryCards`, `ExpenditureTable`
- **Payment Types:** `daily_expenditure`, `office_development`, `materials_purchase`

---

### `admin-panel/src/app/(admin)/settings/page.tsx` — Settings
- **Category:** Page | **Size:** 8,621 bytes | **Lines:** ~200
- **Route:** `/settings`
- **Purpose:** System settings — likely contains WhatsApp/notification configuration, branding options.

---

### `admin-panel/src/app/login/page.tsx` — Login
- **Category:** Page | **Size:** 4,804 bytes | **Lines:** ~120
- **Route:** `/login`
- **Purpose:** Admin login form with email/password. Redirects to `/` on successful auth.
- **Note:** Admin panel login is simpler than mobile — no role selection card screen.

---

## Source Files — Components

---

### `admin-panel/src/components/layout/AdminLayout.tsx`
- **Category:** Layout Component | **Size:** 2,757 bytes | **Lines:** ~70
- **Purpose:** Shell layout combining Sidebar + Topbar + main content area.
- **State:** `sidebarOpen` boolean for mobile sidebar toggle
- **Rendering:** `Sidebar` (conditionally visible on mobile) + `Topbar` (passes `onMenuClick`) + `<main>` with padding

---

### `admin-panel/src/components/layout/Sidebar.tsx`
- **Category:** Navigation | **Size:** 4,231 bytes | **Lines:** 97
- **Purpose:** Left navigation sidebar with dark theme.
- **Nav Items:** Overview, Jobs, Staff, Inventory, Reports, Salary, Expenditure, Settings
- **Active Detection:** `pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))`
- **Active Style:** Left 4px purple border + purple bg wash + white text
- **Mobile:** Slides in from left with backdrop; `translate-x-0` vs `-translate-x-[120%]`
- **Footer:** Shows current user's avatar initial + name + role + version number

---

### `admin-panel/src/components/layout/Topbar.tsx`
- **Category:** Navigation | **Size:** 5,983 bytes | **Lines:** ~150
- **Purpose:** Top navigation bar with hamburger menu, search, notifications bell, and user profile.
- **Elements:** Hamburger (mobile), RepairShop logo, global search input, notifications bell, user avatar + dropdown
- **User Dropdown:** Shows name, role, "Admin Panel" label, Sign Out button
- **Search:** Not yet wired to actual search functionality (decorative input)

---

### `admin-panel/src/components/layout/NotificationsDropdown.tsx`
- **Category:** UI Component | **Size:** 5,551 bytes | **Lines:** ~130
- **Purpose:** Bell icon that opens a dropdown panel showing recent notifications from the `notifications` table.
- **State:** `isOpen`, `notifications` array, `unreadCount`
- **Data:** Fetches last 20 notifications from `notifications` table ordered by `sent_at DESC`
- **Display:** Notification message + time ago + channel badge (push/whatsapp/email)

---

### `admin-panel/src/components/common/Button.tsx`
- **Category:** UI Primitive | **Size:** 2,107 bytes | **Lines:** ~55
- **Purpose:** Reusable button with multiple variants.
- **Props:** `variant` (primary/outline/ghost/danger), `size` (sm/md/lg), `isLoading`, `leftIcon`, `rightIcon`, `disabled`
- **Variants:** 
  - `primary` — purple background, white text
  - `outline` — bordered, accent color text
  - `ghost` — transparent background
  - `danger` — red background

---

### `admin-panel/src/components/common/Card.tsx`
- **Category:** UI Primitive | **Size:** 1,256 bytes | **Lines:** ~35
- **Purpose:** Card container with optional purple left accent line.
- **Props:** `noAccentLine` (boolean), `className`, standard HTML div props
- **Exports:** `Card`, `CardHeader`, `CardTitle`, `CardContent` (named exports)
- **Default Style:** White background, border, rounded-xl, subtle shadow, purple left accent border

---

### `admin-panel/src/components/common/StatusBadge.tsx`
- **Category:** UI Primitive | **Size:** 704 bytes | **Lines:** ~20
- **Purpose:** Renders a colored pill badge for job status.
- **Status → Color Mapping:**
  - Received → amber background + amber text
  - In Progress → blue background + blue text
  - Waiting for Materials → yellow background + orange text
  - Completed → green background + green text

---

### `admin-panel/src/components/common/PriorityBadge.tsx`
- **Category:** UI Primitive | **Size:** 564 bytes | **Lines:** ~15
- **Purpose:** Renders priority pill (Normal/High/Urgent) with appropriate color.
- **Normal** → gray, **High** → amber, **Urgent** → red

---

### `admin-panel/src/components/common/Pagination.tsx`
- **Category:** UI Component | **Size:** 1,413 bytes | **Lines:** ~40
- **Purpose:** Page navigation controls.
- **Props:** `currentPage`, `totalPages`, `onPageChange`
- **Renders:** Previous button, page numbers, Next button (with disabled states)

---

### `admin-panel/src/components/common/ConfirmationModal.tsx`
- **Category:** UI Component | **Size:** 3,161 bytes | **Lines:** ~80
- **Purpose:** Generic confirmation dialog for destructive actions.
- **Props:** `isOpen`, `title`, `message`, `onConfirm`, `onCancel`, `isDestructive` (boolean — red confirm button)
- **Animation:** `animate-scale-in` CSS animation on modal entry
- **Backdrop:** Semi-transparent dark overlay

---

### `admin-panel/src/components/common/ToastProvider.tsx`
- **Category:** State / UI | **Size:** 1,540 bytes | **Lines:** ~40
- **Purpose:** Context provider for toast notifications in the admin panel.
- **Exports:** `ToastProvider`, `useToast`
- **Interface:** `showToast(message: string, type: 'success' | 'error' | 'info')`
- **State:** Array of toast objects; auto-dismisses after timeout

---

### `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx`
- **Category:** Business Component | **Size:** 3,048 bytes | **Lines:** ~75
- **Purpose:** Modal to reassign a job to a different technician.
- **Props:** `job`, `technicians`, `onClose`, `onSuccess`
- **Action:** Updates `jobs.technician_id` in Supabase

---

### `admin-panel/src/components/jobs/detail/OverviewTab.tsx`
- **Category:** Business Component | **Size:** 12,806 bytes | **Lines:** ~320
- **Purpose:** The "Overview" tab content within the Job Detail page — renders all job fields in a readable format.
- **Displays:** Job code, customer info, device details, status, priority, type, assignments, timestamps, materials summary, billing summary, onsite visits

---

### `admin-panel/src/components/salary/SalaryBreakdownCard.tsx`
- **Category:** Business Component | **Size:** 4,992 bytes | **Lines:** ~120
- **Purpose:** Displays the calculated salary breakdown in a readable card format.
- **Sections:** Attendance summary, Earnings table (present/halfday/OT pay), Deductions table (early/advance), Net salary box
- **Print Button:** Triggers `generateSalarySlipHtml(breakdown)` and `window.open()` + `print()`

---

### `admin-panel/src/components/salary/SalaryCalculatorForm.tsx`
- **Category:** Business Component | **Size:** 2,913 bytes | **Lines:** ~75
- **Purpose:** Form to select staff member, month, and working days — then calculate salary via Supabase queries.
- **Algorithm:**
  1. Fetch attendance records for user + month
  2. Fetch staff rate for user
  3. Fetch advance payments for user + month
  4. Calculate breakdown using confirmed salary formula
  5. Save or update `salary` table
  6. Call `onResult(breakdown)` prop

---

### `admin-panel/src/components/salary/StaffRateForm.tsx`
- **Category:** Business Component | **Size:** 4,847 bytes | **Lines:** ~120
- **Purpose:** Form to set/edit staff pay rates (base daily rate, OT rate, early deduction rate).
- **Action:** Upserts into `staff_rates` table on conflict of `user_id`

---

### `admin-panel/src/components/salary/AdvanceSalaryForm.tsx`
- **Category:** Business Component | **Size:** 4,682 bytes | **Lines:** ~115
- **Purpose:** Records advance salary payments into the `payments` table.
- **Fields:** Staff member, amount, description

---

### `admin-panel/src/components/staff/AddStaffModal.tsx`
- **Category:** Business Component | **Size:** 8,544 bytes | **Lines:** ~200
- **Purpose:** Modal to create a new staff account via Supabase Admin Auth.
- **Flow:** Name → Email → Password → Role → `supabase.auth.admin.createUser()` → Insert into `users` table
- **Note:** Requires service role key — may use a custom approach or anon key with a trigger

---

### `admin-panel/src/components/staff/AttendanceModal.tsx`
- **Category:** Business Component | **Size:** 6,233 bytes | **Lines:** ~155
- **Purpose:** Modal showing 30-day attendance history for a selected staff member.
- **Display:** Date, status badge (Present/Halfday/Leave/Absent), check-in time, check-out time

---

### `admin-panel/src/components/inventory/InventoryFormModal.tsx`
- **Category:** Business Component | **Size:** 6,456 bytes | **Lines:** ~160
- **Purpose:** Add or edit inventory item (create = no item prop; edit = item prop provided).
- **Fields:** Item name, quantity, unit (e.g., "pcs", "kg"), low stock threshold
- **Action:** Insert or update in `inventory` table

---

### `admin-panel/src/components/expenditure/ExpenditureForm.tsx`
- **Category:** Business Component | **Size:** 3,708 bytes | **Lines:** ~90
- **Purpose:** Form to record a new expenditure entry.
- **Fields:** Type (daily/materials/office), amount, description

---

### `admin-panel/src/components/InvoiceGenerator/InvoiceTemplate.tsx`
- **Category:** Document Component | **Size:** 6,207 bytes | **Lines:** ~150
- **Purpose:** React component rendering an invoice as styled JSX (used for web preview).
- **Note:** The `renderInvoice.ts` generates the equivalent HTML string for printing.

---

## Source Files — Types

---

### `admin-panel/src/types/index.ts`
- **Category:** Types | **Size:** 1,679 bytes | **Lines:** 70
- **Exports:**
  - `Role` — `'admin' | 'receptionist' | 'technician'`
  - `JobStatus` — `'Received' | 'In Progress' | 'Waiting for Materials' | 'Completed'`
  - `JobPriority` — `'Normal' | 'High' | 'Urgent'`
  - `JobType` — `'Inhouse' | 'Onsite'`
  - `AttendanceStatus` — `'Present' | 'Halfday' | 'Leave' | 'Absent'`
  - `User` — full user interface with id, name, email, phone, role, is_active, expo_push_token
  - `Job` — full job interface with optional technician join `{ name: string } | null`
  - `JobMaterial` — id, job_id, material_name, quantity, unit_cost, total_cost
  - `Attendance` — id, user_id, date, check times, selfie_url, GPS, ot_hours, early_hours, status
  - `InventoryItem` — id, item_name, quantity, unit, low_stock_threshold, last_updated

---

### `admin-panel/src/types/salary.ts`
- **Category:** Types | **Size:** 1,702 bytes | **Lines:** 74
- **Exports:**
  - `PaymentType` — `'advance_salary' | 'materials_purchase' | 'daily_expenditure' | 'office_development'`
  - `StaffRate` — user_id, base_daily_rate, ot_rate_per_hour, early_deduction_per_hour
  - `SalaryRecord` — complete monthly payroll record
  - `SalaryBreakdown` — extended record with employee info + calculated fields for display
  - `Payment` — financial transaction record with optional user join

---

## Source Files — Utilities

---

### `admin-panel/src/utils/billing.ts`
- **Category:** Utility | **Size:** 705 bytes | **Lines:** ~20
- **Exports:** `calculatePartsTotal(materials)`, `calculateGrandTotal(parts, labour, tax, discount)`, `roundMoney(value)`
- **Formula:** `grand_total = (parts + labour) × (1 + tax/100) - discount`
- **Note:** Exact same logic as `RepairShopApp/src/utils/billing.ts` — two separate implementations of the same formula.

---

### `admin-panel/src/utils/csv.ts`
- **Category:** Utility | **Size:** 1,162 bytes | **Lines:** ~30
- **Exports:** `exportJobsToCSV(jobs: Job[])`
- **Algorithm:** Maps jobs to CSV rows → creates Blob → downloads via `<a>` tag with `href=URL.createObjectURL(blob)`
- **Columns:** Job Code, Customer, Contact, Device, Status, Priority, Technician, Created Date

---

### `admin-panel/src/utils/formatCurrency.ts`
- **Category:** Utility | **Size:** 496 bytes | **Lines:** ~15
- **Exports:** `formatCurrency(amount: number): string`
- **Output Format:** `₹1,234.56` (Indian locale, 2 decimal places)
- **Also exports:** `roundMoney(value: number): number`

---

### `admin-panel/src/utils/formatDate.ts`
- **Category:** Utility | **Size:** 640 bytes | **Lines:** ~20
- **Exports:** `formatDate(dateStr: string): string`, `formatMonthLabel(monthStr: string): string`
- **formatDate:** `2026-01-15` → `"Jan 15, 2026"` (or similar locale format)
- **formatMonthLabel:** `2026-01-01` → `"January 2026"`

---

### `admin-panel/src/utils/receiptHtml.ts`
- **Category:** Utility | **Size:** 2,841 bytes | **Lines:** ~70
- **Purpose:** Generates an HTML string for a printable job receipt.
- **Used by:** Admin print flow

---

### `admin-panel/src/utils/salarySlipHtml.ts`
- **Category:** Utility | **Size:** 6,872 bytes | **Lines:** 126
- **Exports:** `generateSalarySlipHtml(breakdown: SalaryBreakdown): string`
- **Purpose:** Generates a complete HTML salary slip document for browser printing.
- **Content:** Header, employee info, pay period, attendance summary, earnings table, deductions table, net salary box, signature lines
- **Branding:** "RepairShop" header and footer

---

### `admin-panel/src/shared/documents/DocumentRenderer.ts`
- **Category:** Shared Utility (cross-app) | **Purpose:** Single HTML document renderer for receipt and invoice.
- **Exports:** `generateDocumentHtml(type: 'receipt' | 'invoice', job, materials, billing?): string`
- **Used by:**
  - Mobile `JobAssignmentScreen` — prints receipt after job creation
  - Mobile `BillingScreen` — prints invoice
  - Admin `JobDetailPage` — generates invoice HTML for print page
