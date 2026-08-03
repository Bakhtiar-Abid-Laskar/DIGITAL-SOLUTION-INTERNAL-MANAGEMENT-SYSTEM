# RepairShop — Component Hierarchy

## Mobile App — Component Tree

```
App.tsx
├── GestureHandlerRootView
│   └── SafeAreaProvider
│       └── AuthProvider (context: user, session, role, isActive, signOut)
│           └── ToastProvider (context: showToast)
│               └── NavigationContainer
│                   └── RootNavigator
│                       │
│                       ├── [isLoading] LoadingScreen
│                       │   └── ActivityIndicator + Text
│                       │
│                       ├── [!session] LoginScreen
│                       │   ├── ScrollView
│                       │   ├── RoleCard × 3 (Receptionist / Technician / Admin)
│                       │   ├── TextInput (email)
│                       │   ├── TextInput (password)
│                       │   └── Button (Sign In)
│                       │
│                       ├── [session && !isActive] InactiveUserScreen
│                       │   ├── Icon
│                       │   ├── Text (Awaiting Approval)
│                       │   └── Button (Sign Out)
│                       │
│                       ├── [role = 'admin'] AdminTabs
│                       │   └── BottomTabNavigator (CustomTabBar)
│                       │       ├── Tab: Overview → OverviewScreen
│                       │       ├── Tab: Jobs → AdminJobsScreen
│                       │       ├── Tab: Staff → StaffScreen
│                       │       ├── Tab: Inventory → InventoryScreen
│                       │       └── Tab: Reports → ReportsScreen
│                       │
│                       ├── [role = 'receptionist'] ReceptionistTabs
│                       │   └── BottomTabNavigator (CustomTabBar)
│                       │       ├── Tab: Dashboard → DashboardScreen
│                       │       │   ├── AppHeader
│                       │       │   ├── KPI Grid (StatCard × 4)
│                       │       │   ├── Button (New Job)
│                       │       │   └── FlatList
│                       │       │       └── JobCard × n
│                       │       │
│                       │       ├── Tab: Jobs → ReceptionistJobsStack
│                       │       │   └── StackNavigator
│                       │       │       ├── Screen: JobList → JobListScreen
│                       │       │       │   ├── AppHeader
│                       │       │       │   ├── FilterTabs
│                       │       │       │   ├── SearchInput
│                       │       │       │   └── FlatList
│                       │       │       │       └── JobCard × n
│                       │       │       │
│                       │       │       ├── Screen: JobDetail → JobDetailScreen
│                       │       │       │   ├── AppHeader
│                       │       │       │   ├── ScrollView
│                       │       │       │   │   ├── JobHeaderCard
│                       │       │       │   │   │   ├── StatusBadge
│                       │       │       │   │   │   └── PriorityBadge
│                       │       │       │   │   ├── SectionLabel (Customer)
│                       │       │       │   │   ├── InfoCard
│                       │       │       │   │   ├── SectionLabel (Device)
│                       │       │       │   │   ├── InfoCard
│                       │       │       │   │   ├── SectionLabel (Assignment)
│                       │       │       │   │   └── InfoCard (with reassign button)
│                       │       │       │   ├── Footer Action Buttons
│                       │       │       │   └── BottomSheet (status selector)
│                       │       │       │
│                       │       │       ├── Screen: New Job → CustomerIntakeScreen
│                       │       │       │   ├── AppHeader
│                       │       │       │   ├── KeyboardAvoidingView
│                       │       │       │   │   └── ScrollView
│                       │       │       │   │       ├── SectionLabel (Customer)
│                       │       │       │   │       ├── TextInput × 3
│                       │       │       │   │       ├── SectionLabel (Device)
│                       │       │       │   │       ├── Dropdown (device type)
│                       │       │       │   │       ├── TextInput (issue, remarks)
│                       │       │       │   │       ├── SegmentedControl (job type)
│                       │       │       │   │       └── SegmentedControl (priority)
│                       │       │       │   └── Footer Button (Next)
│                       │       │       │
│                       │       │       ├── Screen: Job Assignment → JobAssignmentScreen
│                       │       │       │   ├── AppHeader
│                       │       │       │   ├── ScrollView
│                       │       │       │   │   ├── SectionLabel (Job Overview)
│                       │       │       │   │   ├── Card (InfoRow × 6)
│                       │       │       │   │   ├── SectionLabel (Assignment)
│                       │       │       │   │   └── TechnicianPickerButton
│                       │       │       │   ├── Footer (Print Receipt + Create Job)
│                       │       │       │   ├── TechnicianPicker (Modal)
│                       │       │       │   │   └── FlatList of technician names
│                       │       │       │   └── Success Modal (Animated.View)
│                       │       │       │       ├── Icon (CheckCircle2)
│                       │       │       │       ├── Job Code Chip
│                       │       │       │       ├── Button (Print Receipt)
│                       │       │       │       ├── Button (View Job)
│                       │       │       │       └── Button (Create Another)
│                       │       │       │
│                       │       │       └── Screen: Billing → BillingScreen
│                       │       │           ├── AppHeader
│                       │       │           ├── ScrollView
│                       │       │           │   ├── SectionLabel (Customer)
│                       │       │           │   ├── InfoCard
│                       │       │           │   ├── SectionLabel (Materials)
│                       │       │           │   ├── MaterialList (read-only)
│                       │       │           │   ├── SectionLabel (Billing)
│                       │       │           │   ├── BillingForm
│                       │       │           │   │   ├── TextInput (labour)
│                       │       │           │   │   ├── TextInput (tax %)
│                       │       │           │   │   ├── TextInput (discount)
│                       │       │           │   │   └── GrandTotalDisplay
│                       │       │           │   └── PaymentToggle
│                       │       │           └── Footer Action Buttons Row
│                       │       │
│                       │       ├── Tab: Attendance → AttendanceScreen (Shared)
│                       │       │   ├── AppHeader
│                       │       │   ├── TodayPanel
│                       │       │   │   ├── CheckInCard
│                       │       │   │   │   ├── TimeDisplay
│                       │       │   │   │   ├── GPSDisplay
│                       │       │   │   │   ├── SelfieThumb
│                       │       │   │   │   └── Button (Check In/Out)
│                       │       │   │   └── CheckOutCard (same structure)
│                       │       │   ├── HistoryLabel
│                       │       │   └── FlatList
│                       │       │       └── AttendanceHistoryCard × n
│                       │       │           ├── DateLabel
│                       │       │           ├── StatusBadge
│                       │       │           └── TimeDisplay
│                       │       │
│                       │       └── Tab: Notifications → NotificationsScreen
│                       │           ├── AppHeader
│                       │           └── FlatList
│                       │               └── NotificationCard × n
│                       │
│                       └── [role = 'technician'] TechnicianTabs
│                           └── BottomTabNavigator (CustomTabBar)
│                               ├── Tab: Dashboard → TechnicianDashboardScreen
│                               │   ├── AppHeader
│                               │   ├── KPI Grid (StatCard × 3)
│                               │   └── Button (View My Jobs)
│                               │
│                               ├── Tab: My Jobs → TechnicianJobsStack
│                               │   └── StackNavigator
│                               │       ├── Screen: MyJobs → MyJobsScreen
│                               │       │   ├── AppHeader
│                               │       │   ├── FilterTabs
│                               │       │   └── FlatList
│                               │       │       └── JobCard × n
│                               │       │
│                               │       ├── Screen: UpdateWork → UpdateWorkScreen
│                               │       │   └── KeyboardAvoidingView
│                               │       │       ├── JobDetailShell (scrollable)
│                               │       │       │   ├── Header Card
│                               │       │       │   │   ├── StatusBadge
│                               │       │       │   │   └── PriorityBadge
│                               │       │       │   ├── SectionLabel (Materials)
│                               │       │       │   ├── Card
│                               │       │       │   │   ├── MaterialList
│                               │       │       │   │   │   └── MaterialItem × n
│                               │       │       │   │   │       └── DeleteButton
│                               │       │       │   │   └── TotalRow
│                               │       │       │   ├── SectionLabel (Notes)
│                               │       │       │   ├── Card
│                               │       │       │   │   └── TextInput (multiline)
│                               │       │       │   ├── SectionLabel (Status)
│                               │       │       │   ├── Card
│                               │       │       │   │   └── StatusDropdown
│                               │       │       │   └── Button (Update & Notify)
│                               │       │       ├── AddMaterialModal
│                               │       │       │   ├── BottomSheet
│                               │       │       │   ├── TextInput (name)
│                               │       │       │   ├── TextInput (qty)
│                               │       │       │   ├── TextInput (unit cost)
│                               │       │       │   └── Button (Add)
│                               │       │       ├── BottomSheet (status selector)
│                               │       │       │   └── TouchableOpacity × 3 (status options)
│                               │       │       └── BottomSheet (delete confirm)
│                               │       │           ├── Text (confirm message)
│                               │       │           ├── Button (Cancel)
│                               │       │           └── Button (Delete, red)
│                               │       │
│                               │       └── Screen: OnsiteVisit → OnsiteVisitScreen
│                               │           ├── AppHeader
│                               │           ├── Phase display (Idle/Arrived/Departed)
│                               │           ├── SelfieCapture (modal overlay)
│                               │           │   ├── Camera preview (expo-camera)
│                               │           │   ├── CaptureButton
│                               │           │   └── CancelButton
│                               │           └── Action Buttons
│                               │
│                               ├── Tab: Attendance → AttendanceScreen (same as above)
│                               │
│                               └── Tab: Notifications → NotificationsScreen (same as above)
│
└── Toast (global overlay, from ToastContext)
    ├── Text (title)
    └── Text (message)
```

---

## Admin Panel — Component Tree

```
layout.tsx (root)
└── <html>
    └── <body>
        └── ToastProvider
            ├── Toast (global overlay)
            └── AuthProvider
                └── (admin)/layout.tsx
                    └── AdminLayout
                        ├── Sidebar
                        │   ├── Logo + "RepairShop" wordmark
                        │   ├── <nav>
                        │   │   └── NavItem × 8
                        │   │       ├── Icon (Lucide)
                        │   │       └── Label
                        │   └── UserFooter
                        │       ├── Avatar (letter)
                        │       ├── Name
                        │       └── Role label
                        │
                        ├── Topbar
                        │   ├── HamburgerButton (mobile)
                        │   ├── Logo (mobile)
                        │   ├── SearchInput (decorative)
                        │   ├── NotificationsDropdown
                        │   │   ├── BellIcon button
                        │   │   └── Dropdown panel
                        │   │       └── NotificationItem × n
                        │   └── UserDropdown
                        │       ├── Avatar
                        │       └── Menu
                        │           ├── Name + role
                        │           └── Sign Out button
                        │
                        └── <main>
                            ├── page.tsx → OverviewPage
                            │   ├── GreetingBanner (gradient card)
                            │   ├── StatCard × 4 (grid)
                            │   │   ├── IconBadge
                            │   │   ├── Title
                            │   │   └── Value (count)
                            │   ├── Card (Alerts)
                            │   │   └── AlertItem × n
                            │   │       ├── Icon
                            │   │       └── Text
                            │   ├── Card (Donut Chart)
                            │   │   ├── ResponsiveContainer
                            │   │   │   └── PieChart
                            │   │   │       ├── Pie (innerRadius=60)
                            │   │   │       │   └── Cell × n (colors)
                            │   │   │       └── Tooltip
                            │   │   ├── CenterLabel (total count)
                            │   │   └── Legend
                            │   └── Card (Recent Jobs Table)
                            │       ├── CardHeader
                            │       │   ├── Title
                            │       │   └── "View All" link
                            │       └── <table>
                            │           ├── <thead>
                            │           └── <tbody>
                            │               └── <tr> × n (clickable)
                            │                   ├── job_code
                            │                   ├── customer_name
                            │                   ├── device_type
                            │                   ├── technician.name
                            │                   ├── StatusBadge
                            │                   └── PriorityBadge
                            │
                            ├── jobs/page.tsx → JobsPage
                            │   ├── PageHeader
                            │   │   ├── Title + Description
                            │   │   └── Export CSV Button
                            │   ├── Tabs (status filter)
                            │   ├── Card (filter bar)
                            │   │   ├── SearchInput
                            │   │   ├── DateRangePicker (from/to)
                            │   │   ├── Select (technician)
                            │   │   ├── Select (priority)
                            │   │   └── Clear Filters button
                            │   ├── Card (table)
                            │   │   ├── <table>
                            │   │   │   ├── <thead> (sticky)
                            │   │   │   └── <tbody>
                            │   │   │       └── <tr> × n
                            │   │   │           ├── job_code
                            │   │   │           ├── customer (name + contact)
                            │   │   │           ├── device_type
                            │   │   │           ├── Technician (name + reassign button)
                            │   │   │           ├── StatusBadge
                            │   │   │           └── PriorityBadge
                            │   │   └── Pagination
                            │   └── ReassignTechnicianModal (conditional)
                            │       ├── Backdrop
                            │       └── Modal Card
                            │           ├── Title
                            │           ├── Select (technician)
                            │           ├── Cancel Button
                            │           └── Reassign Button
                            │
                            ├── jobs/[id]/page.tsx → JobDetailPage
                            │   ├── PageHeader
                            │   │   ├── Back button
                            │   │   ├── Job code + badges
                            │   │   └── Action buttons (Print, Edit)
                            │   ├── Tabs (Overview | Materials | Billing | Notes)
                            │   ├── [overview] Card grid
                            │   │   ├── OverviewTab component
                            │   │   │   ├── CustomerSection
                            │   │   │   ├── DeviceSection
                            │   │   │   ├── AssignmentSection
                            │   │   │   └── TimelineSection
                            │   │   └── Edit mode: inline inputs
                            │   ├── [materials] MaterialsSection
                            │   │   ├── AddMaterialForm (inline)
                            │   │   ├── <table> (materials list)
                            │   │   └── Parts Total display
                            │   ├── [billing] BillingSection
                            │   │   ├── Input (labour)
                            │   │   ├── Input (tax %)
                            │   │   ├── Input (discount)
                            │   │   ├── GrandTotal (display)
                            │   │   ├── IsPaid toggle
                            │   │   └── Action buttons
                            │   ├── [notes] NotesSection
                            │   │   ├── Textarea (work notes)
                            │   │   └── Save button
                            │   └── ConfirmationModal (conditional)
                            │
                            ├── staff/page.tsx → StaffPage
                            │   ├── PageHeader + Add Staff button
                            │   ├── Filter bar (role, status, search)
                            │   ├── Card (staff table)
                            │   │   └── <tbody>
                            │   │       └── <tr> × n
                            │   │           ├── Name
                            │   │           ├── Email
                            │   │           ├── Phone
                            │   │           ├── Role Badge
                            │   │           ├── Status Badge
                            │   │           └── Action Buttons (Approve, Block, Attendance)
                            │   ├── AttendanceModal (conditional)
                            │   │   └── <table> (30-day attendance)
                            │   ├── AddStaffModal (conditional)
                            │   │   ├── Name input
                            │   │   ├── Email input
                            │   │   ├── Password input
                            │   │   └── Role select
                            │   └── ConfirmationModal (conditional)
                            │
                            ├── salary/page.tsx → SalaryPage
                            │   ├── [role !== 'admin'] AccessDenied (EmptyState)
                            │   └── [role === 'admin']
                            │       ├── PageHeader
                            │       ├── Tabs (Calculate | Rates | Advance)
                            │       ├── [calculate] SalaryCalculatorForm
                            │       │   ├── Staff selector
                            │       │   ├── Month input
                            │       │   ├── Working days input
                            │       │   └── Calculate button
                            │       ├── [calculate + result] SalaryBreakdownCard
                            │       │   ├── AttendanceSummaryGrid
                            │       │   ├── EarningsTable
                            │       │   ├── DeductionsTable
                            │       │   ├── NetSalaryBox
                            │       │   └── Print Salary Slip button
                            │       ├── [rates] StaffRateForm
                            │       │   └── Rate inputs per staff member
                            │       └── [advance] AdvanceSalaryForm
                            │           ├── Staff selector
                            │           ├── Amount input
                            │           ├── Month input
                            │           └── Submit button
                            │
                            ├── inventory/page.tsx → InventoryPage
                            │   ├── PageHeader + Add Item button
                            │   ├── Search input
                            │   ├── Card (inventory grid/table)
                            │   │   └── InventoryRow × n
                            │   │       ├── Item name
                            │   │       ├── Quantity + Unit
                            │   │       ├── Low Stock Badge (conditional)
                            │   │       └── Edit + Delete buttons
                            │   ├── InventoryFormModal (conditional)
                            │   │   ├── Name input
                            │   │   ├── Quantity input
                            │   │   ├── Unit input
                            │   │   └── Threshold input
                            │   └── ConfirmationModal (conditional)
                            │
                            ├── reports/page.tsx → ReportsPage
                            │   ├── PageHeader + Export button
                            │   ├── Tabs (Technician | Customer | Revenue)
                            │   ├── [tech] TechPerformanceSection
                            │   │   ├── Month selector
                            │   │   ├── ResponsiveContainer
                            │   │   │   └── BarChart
                            │   │   │       ├── Bar (completed jobs)
                            │   │   │       ├── XAxis (tech names)
                            │   │   │       ├── YAxis (count)
                            │   │   │       └── Tooltip
                            │   │   └── Data table
                            │   ├── [customer] CustomerHistorySection
                            │   │   ├── SearchInput + Button
                            │   │   └── Results table
                            │   └── [revenue] RevenueSection
                            │       ├── KPI Cards (3)
                            │       └── Recent Bills table
                            │
                            └── expenditure/page.tsx → ExpenditurePage
                                ├── PageHeader
                                ├── ExpenditureSummaryCards
                                │   └── KPI Card × 3 (by type)
                                ├── ExpenditureForm
                                │   ├── Type select
                                │   ├── Amount input
                                │   └── Description input
                                └── ExpenditureTable
                                    └── Payment rows × n
```

---

## Context Provider Tree

### Mobile (Full Provider Stack)
```
GestureHandlerRootView
  SafeAreaProvider          (react-native-safe-area-context)
    AuthContext.Provider    (user, session, role, isActive, signOut, pushState)
      ToastContext.Provider (showToast)
        NavigationContainer (react-navigation)
          [screens/stacks...]
          Toast             (rendered as overlay via context)
```

### Admin Panel (Full Provider Stack)
```
<html>
  <body>
    ToastContext.Provider    (showToast)
      Toast                  (global overlay)
      AuthContext.Provider   (profile, role, isLoading, signOut)
        (admin)/layout
          AdminLayout
            [pages...]
```

---

## Shared Module Bridge

```
RepairShopApp/src/screens/receptionist/BillingScreen.tsx
    │
    └── import { generateDocumentHtml } from
        '../../../../admin-panel/src/shared/documents/DocumentRenderer'
            │
            └── admin-panel/src/shared/documents/DocumentRenderer.ts
                    │
                    └── Also imported by:
                        admin-panel/src/app/(admin)/jobs/[id]/page.tsx
                        (admin-panel uses same function for web invoice display)
```

This cross-application import is bridged by the Metro bundler configuration in `metro.config.js` for the mobile app.
