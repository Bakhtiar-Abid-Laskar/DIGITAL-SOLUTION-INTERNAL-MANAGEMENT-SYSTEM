# RepairShop — UI/UX Design System & Screen Analysis

## 1. Design Philosophy

RepairShop uses a **warm neutral premium** aesthetic for mobile and a **clinical authority** aesthetic for web. The two apps share the same business logic but feel distinct in character — the mobile is warm and tactile, the admin panel is precise and professional.

### Mobile Design Keywords
- Warm neutrals (off-white `#FAFAF9`, warm beige undertones)
- Indigo primary (`#5B5BD6`)
- Dark near-black navigation bar (`#1C1917`)
- Card-first UI (everything in bordered, shadowed cards)
- Physics-based spring animations
- Touch-target sizes: minimum 44px height

### Admin Panel Design Keywords
- Pure white canvas (`#FFFFFF`)
- Purple accent (`#6D5BD0`)
- Dark sidebar (`#181B27`)
- Table-first layout
- Subtle fade/scale CSS animations (150ms ease-out)
- Desktop-first responsive (lg breakpoints)

---

## 2. Mobile Design System

### Color Palette
```
Background:   #FAFAF9 (warm off-white — "parchment")
Surface:      #FFFFFF (card backgrounds)
Alt Surface:  #F5F4F2 (input fields, subtle backgrounds)
Border:       #E5E2DC (warm gray border)
Border Strong:#C8C4BC (stronger dividers)

Primary:      #5B5BD6 (indigo — brand color)
Primary Dark: #4747B8 (hover/pressed state)
Primary Dim:  rgba(91,91,214,0.10) (light tint for badges/buttons)

Text Primary:    #1C1917 (almost black — warm)
Text Secondary:  #78716C (warm gray)
Text Muted:      #A8A29E (lighter warm gray)
Text Inverse:    #FFFFFF (on dark backgrounds)

Nav Background:  #1C1917 (dark warm near-black)
Nav Active Text: #FFFFFF
Nav Border:      #5B5BD6 (indigo left border on active tab)

Success:     #22C55E (green)
Warning:     #F59E0B (amber)
Danger:      #EF4444 (red)

Status Colors:
  Received:       amber bg (#FFF4D6) + amber text (#B8860B)
  In Progress:    blue bg (#DCEBFA) + blue text (#2563A8)
  Completed:      green bg (#DFF3E3) + green text (#2E8B57)
  Urgent:         red bg (#FDE2E1) + red text (#C0392B)
  Pending:        amber (same as Received)
```

### Typography
```
h1: 32px / 700 weight / 40px line-height
h2: 22px / 700 weight / 30px line-height
body: 16px / 400 weight / 24px line-height
bodyBold: 16px / 600 weight / 24px line-height
label: 13px / 600 weight / 18px line-height / 0.3 letter-spacing
caption: 12px / 400 weight / 16px line-height
captionBold: 12px / 600 weight / 16px line-height
```

### Spacing Scale
```
xs: 4dp   sm: 8dp   md: 12dp
lg: 16dp  xl: 24dp  xxl: 32dp
```

### Border Radius
```
sm: 8dp    md: 12dp    lg: 20dp
xl: 28dp   pill: 100dp
```

### Shadows
```
card: shadowColor:#000, offset:(0,2), opacity:0.06, radius:8, elevation:3
nav:  shadowColor:#000, offset:(0,4), opacity:0.15, radius:16, elevation:8
modal: shadowColor:#000, offset:(0,8), opacity:0.20, radius:24, elevation:12
```

### Animation
```
spring.default: { damping: 18, stiffness: 200 }  — smooth, no bounce
spring.bouncy:  { damping: 12, stiffness: 250 }  — subtle bounce
FadeInUp: Reanimated preset entering animation
```

---

## 3. Admin Panel Design System

### Color Palette
```
Canvas:         #FFFFFF (pure white — non-negotiable)
Surface:        #FFFFFF (cards, topbar, modals)
Subtle:         #F5F6F8 (table headers, input bg)
Hover:          #EEF0F3 (row hover)
Dark (backdrop):#181B27 (modal overlays)

Accent:         #6D5BD0 (purple primary)
Accent Dim:     rgba(109,91,208,0.10) (light purple tint)
Accent Dark:    #5A49B8 (hover state)

Text Primary:   #1B1E2B (dark blue-gray)
Text Secondary: #6B7280 (medium gray)
Text Muted:     #6B7280 (same as secondary)

Border:         #E5E7EB (light gray)
Border Strong:  #D1D5DB (medium gray)

Sidebar BG:     #181B27 (near-black)
Sidebar Text:   #9CA3AF (cool gray)
Sidebar Active: #FFFFFF
Sidebar Active BG: rgba(124,92,246,0.16) (purple wash)
Sidebar Accent Border: #6D5BD0 (4px left border)

Status:
  pending-bg: #FFF4D6 / pending-fg: #B8860B
  progress-bg: #DCEBFA / progress-fg: #2563A8
  completed-bg: #DFF3E3 / completed-fg: #2E8B57
  urgent-bg: #FDE2E1 / urgent-fg: #C0392B

danger: #C0392B / danger-dim: #FDE2E1
success: #2E8B57 / success-dim: #DFF3E3
warning: #B8860B / warning-dim: #FFF4D6
```

### Border Radius
```
sm: 8px   md: 14px   lg: 20px   xl: 24px
```

### Shadows
```
subtle: 0 4px 16px -4px rgba(17,24,39,0.04)
card:   0 4px 16px -4px rgba(17,24,39,0.08)
modal:  0 8px 24px -4px rgba(17,24,39,0.16)
```

### Animations
```
fade-in:  opacity 0→1, 150ms ease-out
scale-in: opacity 0→1, scale 0.95→1, 150ms ease-out
```

---

## 4. Mobile Screen-by-Screen Analysis

### LoginScreen
- **Layout:** Centered card on off-white background
- **Elements:**
  - Logo/icon at top
  - Three role selection cards (Receptionist, Technician, Admin) — horizontal layout
  - Active card gets indigo border highlight
  - Email + Password text inputs (white bg, border, `md` radius)
  - "Sign In" primary button (indigo bg, white text, full width)
  - Error handling: toast at bottom of screen
- **Animations:** FadeInUp on card entry
- **UX Notes:** Role cards are purely visual — actual role comes from DB; prevents user confusion from wrong role selection

---

### DashboardScreen (Receptionist)
- **Layout:** ScrollView with padding, SafeArea aware
- **Elements:**
  1. Greeting header (name from auth)
  2. 4 KPI tiles in 2×2 grid:
     - Today's Jobs (count badge)
     - Pending (amber bg)
     - In Progress (blue bg)
     - Completed (green bg)
  3. "New Job" primary CTA button (full width, indigo)
  4. Recent Jobs section (last 5 jobs as `JobCard` list)
- **Realtime:** KPIs update live via Supabase Realtime
- **Navigation:** "New Job" → CustomerIntakeScreen, job cards → JobDetail

---

### CustomerIntakeScreen (Receptionist)
- **Layout:** KeyboardAvoidingView + ScrollView (keyboard pushes content up)
- **Elements:**
  1. AppHeader ("New Job", back button)
  2. SectionLabel "CUSTOMER DETAILS"
  3. Customer Name input (required indicator)
  4. Contact Number input (numeric keyboard, `+91` prefix hint)
  5. Email input (optional, email keyboard)
  6. SectionLabel "DEVICE DETAILS"
  7. Device Type picker/Dropdown
  8. Reported Issue multiline TextInput
  9. Remarks multiline TextInput (optional)
  10. SectionLabel "JOB SETTINGS"
  11. Job Type SegmentedControl: [Inhouse] [Onsite]
  12. Priority SegmentedControl: [Normal] [High] [Urgent]
  13. Footer "Next →" button (fixed at bottom)
- **Validation:** Red error text under invalid fields on submit attempt
- **UX Notes:** Contact uses numeric keyboard; email input uses email keyboard type

---

### JobAssignmentScreen (Receptionist)
- **Layout:** ScrollView + fixed footer buttons
- **Elements:**
  1. AppHeader ("Job Assignment", back)
  2. SectionLabel "JOB OVERVIEW"
  3. InfoRow card: Job ID (auto-generate note), Priority, Job Type, Customer, Device, Issue
  4. SectionLabel "ASSIGNMENT (OPTIONAL)"
  5. Technician picker button (shows selected name or "Unassigned")
  6. Fixed footer: [Print Receipt] [Create Job] buttons side-by-side
  7. TechnicianPicker modal (slides up)
  8. Success Modal (full overlay, spring animation):
     - Green circle check icon
     - "Job Created!" title
     - Job code in amber pill chip
     - "Print Receipt" dark button
     - "View Job Details" outlined button
     - "Create Another" text button
- **State Transitions:**
  - Before create: "Create Job" enabled, "Print Receipt" disabled (greyed out)
  - After create: "Create Job" disabled/shows "Created", "Print Receipt" enabled

---

### JobListScreen (Receptionist)
- **Layout:** Full-screen with sticky filter bar + FlatList
- **Elements:**
  1. AppHeader ("Jobs")
  2. Filter tab bar (horizontal scroll): All | Received | In Progress | Waiting | Completed
  3. Search input (placeholder: "Search jobs...")
  4. FlatList of `JobCard` components
  5. Pull-to-refresh (refreshControl prop)
  6. Empty state when no results
  7. Loading state (SkeletonCard placeholders)
- **Realtime:** Auto-refreshes on Supabase channel events
- **Navigation:** Tap card → JobDetail with jobId param

---

### JobDetailScreen (Receptionist)
- **Layout:** ScrollView with sections
- **Elements:**
  1. AppHeader with "Job Detail" + back
  2. Job header card: job code, status badge, priority badge
  3. Customer info section (name, contact with WhatsApp button, email)
  4. Device info section
  5. Assignment section (technician, reassign button)
  6. Timeline/status section
  7. Materials summary (read-only count)
  8. Action buttons: "Bill This Job", "WhatsApp Ready", "Change Status"
- **WhatsApp Button:** Opens WhatsApp app with pre-filled "ready for pickup" message
- **Billing Button:** Navigates to BillingScreen

---

### BillingScreen (Receptionist)
- **Layout:** ScrollView with sticky footer
- **Elements:**
  1. AppHeader ("Invoice")
  2. Customer/Job summary card
  3. Materials list (read-only) with parts total
  4. Billing form card:
     - Labour Charge input (₹, numeric)
     - Tax % input (numeric, default 18)
     - Discount input (₹, numeric)
  5. Grand Total display (auto-calculated, large font, indigo color)
  6. Payment status toggle: "Unpaid" / "Paid" pill button
  7. Action buttons row:
     - Save Invoice
     - Print Invoice
     - Email Invoice
     - WhatsApp Ready
- **Calculations:** Update on every input change (live formula)
- **Visual:** Grand total prominently displayed, currency formatted

---

### UpdateWorkScreen (Technician)
- **Layout:** KeyboardAvoidingView + JobDetailShell (shared scroll wrapper)
- **Elements:**
  1. JobDetailShell header: job code, customer, device, status badge
  2. Materials section with "+ Add Item" button (hidden when completed)
  3. MaterialList (each item: name | qty × cost = total | delete button)
  4. Total materials cost row
  5. Work Notes multiline text input
  6. Status dropdown (tap to open BottomSheet)
  7. "Update & Notify" primary button (success green color)
  8. (All disabled when status = 'Completed')
- **Lock State:** When job is `Completed`, entire form goes read-only, button disappears

---

### AttendanceScreen (Shared)
- **Layout:** SafeAreaView → TabView (Today / History) or single ScrollView
- **Today Panel:**
  1. Date display
  2. Check-In status card:
     - Time display if checked in
     - GPS coordinates display
     - Selfie thumbnail
     - "Check In" button (if not done) or "Checked In ✓" (if done)
  3. Check-Out status card (same structure)
  4. "Check Out" button
- **History Panel:**
  1. 30-day list (FlatList)
  2. Each row: date, status badge (Present/Halfday/Leave/Absent), check-in/out times
  3. Pull-to-refresh
- **Camera Overlay (SelfieCapture):**
  - Full-screen camera view
  - Front-facing camera
  - Large circular capture button
  - Cancel button (top-left)
  - Preview captured photo with "Retake" / "Use Photo" options

---

### CustomTabBar — Visual Design
- **Container:** Dark near-black (`#1C1917`) rounded pill, 64px height, 16px from screen edges
- **Active Tab:** White text, 4px indigo left border, subtle white tint background
- **Inactive Tab:** Gray text (`#9CA3AF`), no highlight
- **Icon:** Lucide icons 22px, color transitions with animation
- **Animation:** Spring-physics sliding indicator transitions between tabs
- **Floating Effect:** Shadow below (`shadow.nav`) + gap between bar and screen edge

---

## 5. Admin Panel Screen-by-Screen Analysis

### Login Page (`/login`)
- **Layout:** Full-height centered card on purple-tinted background
- **Elements:**
  - Logo + "RepairShop Admin" heading
  - Email input (full width)
  - Password input (with show/hide toggle)
  - "Sign In" primary purple button
  - Error message inline (below inputs)
- **On Success:** Redirects to `/`

---

### Admin Layout (Shell)
- **Sidebar (Desktop):**
  - 256px wide, dark (`#181B27`), rounded pill shape (`my-6 ml-6`)
  - Logo + "RepairShop" wordmark at top
  - Navigation items with icon + label
  - Active item: purple left border + purple wash background
  - User info footer: avatar initial + name + role
- **Topbar:**
  - Full width, white bg, border-b
  - Hamburger icon (mobile only)
  - "RepairShop Admin" title
  - Global search input (decorative)
  - Notifications bell icon (→ dropdown)
  - User avatar + dropdown (name, sign out)
- **Main Content:** `px-6 py-6` padded, scrollable

---

### Overview Dashboard (`/`)
- **Layout:** Vertical sections with grid cards
- **Elements:**
  1. Gradient greeting banner (purple gradient, white text, decorative diagonal element)
  2. 4 KPI stat cards (2×2 on mobile, 4×1 on desktop):
     - Jobs Today (amber)
     - Completed This Week (green)
     - Active Technicians (blue/purple)
     - Pending Approvals (red)
  3. System Alerts card (left col on desktop):
     - Alert items with icon (warning/info/urgent)
     - Pending user approvals
     - Low-stock inventory items
  4. Today's Jobs Donut Chart (right col, 2/3 width):
     - Recharts PieChart, innerRadius=60, outerRadius=80
     - Total count in center
     - Color legend below
  5. Recent Jobs Table (full width):
     - Columns: Job Code, Customer, Device, Technician, Status, Priority
     - Clickable rows → navigate to job detail
     - "View All →" link
- **Realtime:** Both jobs + users channels subscribed

---

### Jobs Management (`/jobs`)
- **Layout:** Full-height flex column
- **Elements:**
  1. PageHeader: "Jobs Management" + Export CSV button
  2. Status Tab bar: All | Received | In Progress | Completed | Waiting (with counts)
  3. Filter card (below tabs, connected visually):
     - Search input with search icon
     - Date range (from/to date pickers)
     - Technician filter dropdown
     - Priority filter dropdown
     - "Clear Filters" ghost button
  4. Jobs table (sticky header):
     - Columns: Job Code, Customer+Contact, Device, Technician (with reassign edit icon), Status badge, Priority badge
     - Hover: row highlights with cursor pointer
     - Click row: navigate to /jobs/:id
     - Unassigned tech: "Assign Tech" indigo link button
  5. Pagination controls (bottom)
  6. ReassignTechnicianModal (when reassign clicked)
- **UX Notes:** Tab bar has negative margin to visually connect with filter card below; creates seamless panel effect

---

### Job Detail (`/jobs/:id`)
- **Layout:** Page with Tabs
- **Tabs:** Overview | Materials | Billing | Notes
- **Overview Tab:**
  - Job info grid: code, status, priority, type
  - Customer section: name, contact, email
  - Device section: type, issue, remarks
  - Assignment: receptionist, technician
  - Timeline: created, completed
  - Edit mode: toggles all fields to inputs
- **Materials Tab:**
  - Add material form (inline): name, qty, unit cost → adds row
  - Materials table: name | qty | unit cost | total | delete button
  - Parts total display
- **Billing Tab:**
  - Labour charge input
  - Tax % input
  - Discount input
  - Live grand total calculation
  - Save Invoice button
  - Is Paid toggle
  - Print Invoice button
  - Email Invoice button
- **Notes Tab:**
  - Work notes textarea
  - Save notes button
- **Header Actions:** Print, Edit/Save toggle, Back button

---

### Staff Management (`/staff`)
- **Layout:** Table with filter bar
- **Elements:**
  1. PageHeader: "Staff Management" + Add Staff button
  2. Filter bar: Role filter, Status filter, Search
  3. Staff table:
     - Columns: Name, Email, Phone, Role badge, Status badge, Join Date, Actions
     - Actions: View Attendance (calendar icon), Approve/Block (check/ban icon)
     - Approve: green check — opens confirm modal (not destructive)
     - Block: red ban — opens confirm modal (destructive — red confirm button)
  4. AttendanceModal (view 30-day history)
  5. AddStaffModal (create account)
  6. ConfirmationModal

---

### Salary Management (`/salary`)
- **Layout:** Tab-based
- **Access Guard:** If not admin, shows Lock icon + "Access Denied"
- **Calculate Tab:**
  - Staff selector dropdown
  - Month picker (YYYY-MM input)
  - Working days input
  - Calculate button
  - Breakdown card (shown after calculation):
    - Attendance summary grid
    - Earnings table (present/halfday/OT)
    - Deductions table (early/advance)
    - Net salary display box
    - Print Salary Slip button
- **Rates Tab:**
  - Per-staff rate form: base rate, OT rate, early deduction
  - Save button per staff (or global save)
- **Advance Tab:**
  - Staff selector
  - Amount input
  - Description input
  - Month input
  - Submit button

---

### Inventory (`/inventory`)
- **Layout:** Grid cards or table + search
- **Elements:**
  1. PageHeader + "Add Item" button
  2. Search input
  3. Inventory grid/table:
     - Each item: name, quantity, unit, low-stock threshold
     - Low-stock badge (red "Low Stock") when qty ≤ threshold
     - Edit + Delete icons
  4. InventoryFormModal (add/edit)
  5. ConfirmationModal (delete)

---

### Reports (`/reports`)
- **Layout:** Tabs
- **Technician Performance Tab:**
  - Month selector (YYYY-MM)
  - Bar chart: technician name vs. completed jobs count (Recharts BarChart)
  - Table below chart with same data
- **Customer History Tab:**
  - Search input: customer name or phone
  - "Search" button
  - Results table: all matching jobs with status, device, date
  - Export CSV option
- **Revenue Tab:**
  - KPI cards: Total Revenue, Total Labour, Total Parts
  - Recent billing records table

---

## 6. Component Library Summary

### Mobile Components
| Component | Category | Key Props | Notes |
|---|---|---|---|
| `AppHeader` | Navigation | title, showBack, rightElement | Handles safe area |
| `BottomSheet` | Overlay | visible, onClose | Slides from bottom |
| `Button` | Form | label, variant, loading, disabled | primary/secondary |
| `SectionLabel` | Typography | title, rightElement | Uppercase caps style |
| `SkeletonCard` | Loading | — | Animated shimmer effect |
| `Toast` | Feedback | title, message, type | Auto-dismisses |
| `JobCard` | Business | job, onPress | Animated FadeInUp |
| `JobDetailShell` | Layout | job, children | Scrollable job header |
| `TechnicianPicker` | Selection | visible, onSelect | Modal list |
| `AddMaterialModal` | Form | visible, jobId, onAdded | Bottom sheet form |
| `MaterialList` | Data | materials, canEdit | Delete with confirm |
| `SegmentedControl` | Input | options, selectedIndex | Animated indicator |
| `SelfieCapture` | Camera | onCapture, onCancel | Full-screen overlay |
| `StatusBadge` | Display | status | Color-coded pill |
| `PriorityBadge` | Display | priority | Color-coded pill |

### Admin Components
| Component | Category | Key Props | Notes |
|---|---|---|---|
| `Button` | Form | variant, isLoading, leftIcon | primary/outline/ghost/danger |
| `Card` | Layout | noAccentLine, className | Purple left accent default |
| `Input` | Form | standard HTML input props | Styled consistently |
| `Select` | Form | standard HTML select props | Styled consistently |
| `Textarea` | Form | standard HTML textarea props | Styled consistently |
| `StatusBadge` | Display | status | Color-coded pill |
| `PriorityBadge` | Display | priority | Color-coded pill |
| `Badge` | Display | variant | Generic badge |
| `Tabs` | Navigation | items, activeId, onChange | Horizontal tabs |
| `Pagination` | Navigation | currentPage, totalPages | Previous/next/numbered |
| `PageHeader` | Layout | title, description, actions | Page top header |
| `LoadingState` | Feedback | message | Centered spinner |
| `EmptyState` | Feedback | icon, heading, subtext | No-data placeholder |
| `ErrorState` | Feedback | message, onRetry | Error with retry |
| `ConfirmationModal` | Overlay | isDestructive, onConfirm | With backdrop |
| `Toast` | Feedback | message, type | Fixed position |

---

## 7. Accessibility & UX Patterns

### Mobile
- Minimum touch target: 52px height for interactive elements (`minHeight: 52`)
- Numeric keyboard for contact/cost inputs (`keyboardType="numeric"`)
- `TextInput.editable={false}` and `disabled` for completed jobs (read-only state)
- `scrollEnabled={false}` on nested ScrollViews to prevent scroll conflicts
- Safe area insets accounted for via `useSafeAreaInsets()` in all headers/footers
- `keyboardShouldPersistTaps="handled"` on all ScrollViews with inputs

### Admin Panel
- Hover states on all interactive elements
- `cursor-pointer` on clickable rows
- `transition-colors` for smooth hover transitions
- Sticky table headers with `z-10` for long lists
- Overflow-x-auto on tables for mobile horizontal scrolling
- ARIA labels on icon-only buttons (`aria-label="Reassign Technician"`)

### Error States
- Network errors: `ErrorState` component with retry button
- Form validation: toast notification with error message
- Missing data: `EmptyState` component with icon + message
- Loading: `LoadingState` spinner OR `SkeletonCard` for lists

---

## 8. Responsive Design

### Mobile App
- Fixed portrait orientation (enforced in `app.json`)
- `flex: 1` pattern for full-height layouts
- SafeAreaView for notch/navigation bar handling
- `Platform.OS === 'ios'` checks for keyboard behavior differences

### Admin Panel
- Mobile-first Tailwind breakpoints: `sm:` `md:` `lg:`
- Sidebar: hidden on mobile, slides in with backdrop
- Grid layouts: 1-column mobile → 2 → 4 column desktop
- Tables: `overflow-x-auto` for horizontal scrolling on mobile
- PageHeader actions: stack on mobile, inline on desktop
