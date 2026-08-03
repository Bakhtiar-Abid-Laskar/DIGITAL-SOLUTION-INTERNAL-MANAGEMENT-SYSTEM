# RepairShop — Complete Directory Structure

## Root Level

```
Project/
├── .agents/                        # AI agent configuration
│   └── skills/
│       └── repairshop-master/
│           └── SKILL.md            # Phase-by-phase implementation instructions
├── .vscode/                        # VS Code workspace settings
├── Audit reports/                  # External audit documents (not committed)
├── GEMINI.md                       # Global rules for AI agents on this project
├── SKILL.md                        # Master skill document (same as .agents/skills)
├── Updates/                        # Change log / update notes folder
├── admin-panel/                    # Web admin application (Next.js)
├── RepairShopApp/                  # Mobile application (Expo React Native)
├── supabase/                       # Supabase backend (Edge Functions)
├── docs/                           # Additional documentation
├── ref/                            # Reference files / designs
├── scripts/                        # Utility scripts
├── reset_users.sql                 # SQL script to reset users (dev utility)
├── invoice.png                     # Sample invoice image (reference)
├── mobile_app_ui_ux_specification.md  # UI/UX specification document
├── master_prompt_mobile_regeneration.md  # AI prompts for mobile regen
└── repair_shop_app_guide.pdf       # Business usage guide
```

---

## Admin Panel — Full Directory Tree

```
admin-panel/
├── .env.example                    # Example env vars template (safe to commit)
├── .env.local                      # Actual secrets (gitignored)
├── .gitignore                      # Git ignore rules
├── AGENTS.md                       # Agent rules for admin panel
├── CLAUDE.md                       # Claude-specific instructions
├── README.md                       # Admin panel README
├── confirm_admin.js                # Script to set a user as admin in DB
├── eslint.config.mjs               # ESLint configuration
├── next-env.d.ts                   # Next.js TypeScript declarations
├── next.config.ts                  # Next.js configuration
├── package.json                    # NPM dependencies
├── package-lock.json               # Locked dependency versions
├── postcss.config.mjs              # PostCSS config (for Tailwind)
├── test_edge.js                    # Dev script to test edge functions
├── test_fetch.js                   # Dev script to test Supabase fetch
├── test_insert.js                  # Dev script to test insert operations
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.tsbuildinfo            # TypeScript build cache
├── public/                         # Static assets served at root URL
└── src/
    ├── app/                        # Next.js App Router
    │   ├── globals.css             # Global CSS + Tailwind v4 theme tokens
    │   ├── layout.tsx              # Root layout (providers wrapping)
    │   ├── favicon.ico             # Browser tab icon
    │   ├── (admin)/                # Route group: all protected admin pages
    │   │   ├── layout.tsx          # Admin layout (Sidebar + Topbar)
    │   │   ├── page.tsx            # /  → Overview Dashboard
    │   │   ├── jobs/
    │   │   │   ├── page.tsx        # /jobs → Jobs List
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx    # /jobs/new → Create Job
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx    # /jobs/:id → Job Detail
    │   │   │       └── print/
    │   │   │           └── page.tsx # /jobs/:id/print → Print Invoice
    │   │   ├── staff/
    │   │   │   └── page.tsx        # /staff → Staff Management
    │   │   ├── salary/
    │   │   │   └── page.tsx        # /salary → Salary Management
    │   │   ├── inventory/
    │   │   │   └── page.tsx        # /inventory → Inventory Management
    │   │   ├── reports/
    │   │   │   └── page.tsx        # /reports → Reports (Technician/Revenue/Customer)
    │   │   ├── expenditure/
    │   │   │   └── page.tsx        # /expenditure → Expenditure Tracking
    │   │   └── settings/
    │   │       └── page.tsx        # /settings → System Settings
    │   └── login/
    │       └── page.tsx            # /login → Login Page
    │
    ├── components/
    │   ├── common/                 # Reusable UI primitives
    │   │   ├── Badge.tsx           # Status/label badge component
    │   │   ├── Button.tsx          # Primary button (variants: primary/outline/ghost)
    │   │   ├── Card.tsx            # Card container with optional accent line
    │   │   ├── ConfirmationModal.tsx # Reusable confirm/cancel dialog
    │   │   ├── EmptyState.tsx      # Empty state placeholder with icon + text
    │   │   ├── ErrorState.tsx      # Error display with retry button
    │   │   ├── Input.tsx           # Text input field
    │   │   ├── LoadingState.tsx    # Spinner + message loading indicator
    │   │   ├── PageHeader.tsx      # Page title + description + actions slot
    │   │   ├── Pagination.tsx      # Page navigation (prev/next/numbered)
    │   │   ├── PriorityBadge.tsx   # Priority pill (Normal/High/Urgent)
    │   │   ├── Select.tsx          # Dropdown select element
    │   │   ├── StatusBadge.tsx     # Job status pill badge
    │   │   ├── Tabs.tsx            # Horizontal tab navigation
    │   │   ├── Textarea.tsx        # Multiline text area
    │   │   ├── Toast.tsx           # Single toast notification
    │   │   └── ToastProvider.tsx   # Toast context + stack manager
    │   │
    │   ├── layout/                 # App shell layout components
    │   │   ├── AdminLayout.tsx     # Main layout: Sidebar + Topbar + content
    │   │   ├── NotificationsDropdown.tsx # Bell icon → notification panel
    │   │   ├── Sidebar.tsx         # Dark navigation sidebar (collapsible)
    │   │   └── Topbar.tsx          # Top bar with hamburger + search + user menu
    │   │
    │   ├── jobs/                   # Job-specific components
    │   │   ├── ReassignTechnicianModal.tsx  # Modal to change technician
    │   │   └── detail/
    │   │       └── OverviewTab.tsx  # Job detail overview tab content
    │   │
    │   ├── salary/                 # Salary module components
    │   │   ├── AdvanceSalaryForm.tsx       # Record advance salary payment
    │   │   ├── SalaryBreakdownCard.tsx     # Display calculated salary breakdown
    │   │   ├── SalaryCalculatorForm.tsx    # Input form to calculate salary
    │   │   └── StaffRateForm.tsx           # Set/edit staff pay rates
    │   │
    │   ├── staff/                  # Staff management components
    │   │   ├── AddStaffModal.tsx   # Form to create new staff account
    │   │   └── AttendanceModal.tsx # View staff attendance records
    │   │
    │   ├── inventory/              # Inventory components
    │   │   └── InventoryFormModal.tsx # Add/edit inventory item form
    │   │
    │   ├── expenditure/            # Expenditure components
    │   │   ├── ExpenditureForm.tsx        # Record an expenditure
    │   │   ├── ExpenditureSummaryCards.tsx # Summary KPI cards
    │   │   └── ExpenditureTable.tsx        # List of expenditure records
    │   │
    │   ├── InvoiceGenerator/       # Invoice template system
    │   │   ├── index.ts            # Re-exports
    │   │   ├── constants.ts        # Tax rates, defaults
    │   │   ├── invoice-field-map.ts # Field name → label mapping
    │   │   ├── InvoiceTemplate.tsx # React component (for preview)
    │   │   ├── renderInvoice.ts    # HTML string generator function
    │   │   └── types.ts            # Invoice data types
    │   │
    │   └── screens/                # Empty directory (reserved for future)
    │
    ├── context/
    │   └── AuthContext.tsx         # Auth state provider + route guards
    │
    ├── lib/
    │   ├── supabase.ts             # Supabase client initialization
    │   ├── tokens.ts               # Design system color/style tokens
    │   └── utils.ts                # cn() utility (clsx + tailwind-merge)
    │
    ├── shared/                     # Code shared with mobile app
    │   └── documents/              # Shared document rendering
    │       └── DocumentRenderer.ts # Generates HTML for receipt + invoice
    │
    ├── styles/                     # CSS modules
    │   ├── expenditure.module.css  # Expenditure page styles
    │   └── salary.module.css       # Salary page styles
    │
    ├── types/
    │   ├── index.ts                # Core types: User, Job, JobMaterial, Attendance, InventoryItem
    │   └── salary.ts               # Salary types: StaffRate, SalaryRecord, SalaryBreakdown, Payment
    │
    └── utils/
        ├── billing.ts              # calculatePartsTotal, calculateGrandTotal
        ├── csv.ts                  # exportJobsToCSV utility
        ├── formatCurrency.ts       # formatCurrency(amount: number) → "₹1,234.56"
        ├── formatDate.ts           # formatDate, formatMonthLabel helpers
        ├── receiptHtml.ts          # HTML string for printed receipt
        └── salarySlipHtml.ts       # HTML string for salary slip print
```

---

## Mobile App — Full Directory Tree

```
RepairShopApp/
├── .env                            # Environment variables (gitignored)
├── .env.example                    # Template for environment variables
├── .gitignore                      # Git ignore rules
├── .expo/                          # Expo managed state (gitignored)
├── .claude/                        # Claude AI configuration
├── AGENTS.md                       # Agent rules for mobile app
├── CLAUDE.md                       # Claude-specific instructions
├── LICENSE                         # MIT License
├── App.tsx                         # Root component (providers + RootNavigator)
├── app.json                        # Expo configuration (permissions, plugins, EAS)
├── eas.json                        # EAS Build profiles (dev/preview/production)
├── index.ts                        # Entry point (imports App.tsx)
├── metro.config.js                 # Metro bundler configuration
├── package.json                    # NPM dependencies
├── package-lock.json               # Locked dependency versions
├── tsconfig.json                   # TypeScript configuration
├── replaceAlerts.js                # Dev script: replaces native Alert calls
├── test_login.js                   # Dev script to test login flow
│
├── android/                        # Android native project
│   └── app/
│       ├── src/main/
│       │   ├── AndroidManifest.xml  # App permissions manifest
│       │   └── res/                 # Android resources (icons, colors)
│       └── build.gradle             # Android build configuration
│
├── assets/                         # Static image assets
│   ├── icon.png                    # App icon (1024×1024)
│   ├── splash-icon.png             # Splash screen icon
│   ├── favicon.png                 # Web favicon
│   ├── android-icon-foreground.png # Android adaptive icon foreground
│   ├── android-icon-background.png # Android adaptive icon background
│   └── android-icon-monochrome.png # Android monochrome icon
│
├── supabase/                       # Local Supabase config (mirrors main)
│   └── (config files)
│
└── src/
    ├── tokens.ts                   # Master design system file (colors, spacing, typography, shadows, spring)
    │
    ├── context/
    │   ├── AuthContext.tsx         # Auth state: user, session, role, isActive
    │   └── ToastContext.tsx        # Toast notification state and showToast()
    │
    ├── lib/
    │   ├── supabase.ts             # Supabase client (with SecureStore adapter)
    │   └── auth.ts                 # fetchUserRow() helper function
    │
    ├── navigation/
    │   ├── RootNavigator.tsx       # Root stack navigator (auth gating)
    │   ├── AdminTabs.tsx           # Bottom tabs for admin role
    │   ├── ReceptionistTabs.tsx    # Bottom tabs for receptionist role
    │   ├── TechnicianTabs.tsx      # Bottom tabs for technician role
    │   ├── ReceptionistJobsStack.tsx # Stack within receptionist Jobs tab
    │   ├── TechnicianJobsStack.tsx # Stack within technician My Jobs tab
    │   └── CustomTabBar.tsx        # Custom floating pill tab bar
    │
    ├── screens/
    │   ├── auth/
    │   │   └── LoginScreen.tsx     # Role selection + email/password login
    │   │
    │   ├── shared/                 # Used by multiple roles
    │   │   ├── AttendanceScreen.tsx      # Check-in/out + 30-day history
    │   │   ├── ComingSoonScreen.tsx      # Placeholder for unimplemented features
    │   │   ├── InactiveUserScreen.tsx    # Shown when is_active = false
    │   │   ├── LoadingScreen.tsx         # Splash loading indicator
    │   │   └── NotificationsScreen.tsx  # Notification log viewer
    │   │
    │   ├── receptionist/
    │   │   ├── DashboardScreen.tsx       # Receptionist home with KPI tiles
    │   │   ├── CustomerIntakeScreen.tsx  # Step 1: Enter customer + job details
    │   │   ├── JobAssignmentScreen.tsx   # Step 2: Assign technician + submit job
    │   │   ├── JobListScreen.tsx         # List of all jobs (filterable)
    │   │   ├── JobDetailScreen.tsx       # Job detail for receptionist
    │   │   └── BillingScreen.tsx         # Invoice builder + print/WhatsApp/email
    │   │
    │   ├── technician/
    │   │   ├── TechnicianDashboardScreen.tsx  # Overview KPIs for technician
    │   │   ├── MyJobsScreen.tsx               # List of assigned jobs
    │   │   ├── UpdateWorkScreen.tsx           # Update status + materials + notes
    │   │   └── OnsiteVisitScreen.tsx          # Onsite arrival/departure flow
    │   │
    │   └── admin/
    │       ├── AdminJobsScreen.tsx       # Redirect to jobs tab (admin mobile)
    │       ├── InventoryScreen.tsx       # Inventory management (mobile admin)
    │       ├── OverviewScreen.tsx        # Admin KPI dashboard (mobile)
    │       ├── ReportsScreen.tsx         # Reports view (mobile admin)
    │       └── StaffScreen.tsx           # Staff list + approval (mobile admin)
    │
    ├── components/
    │   ├── common/                 # Reusable primitives
    │   │   ├── AppHeader.tsx       # Screen header with back button + title
    │   │   ├── BottomSheet.tsx     # Modal sliding up from bottom
    │   │   ├── Button.tsx          # Touchable button (primary/secondary variants)
    │   │   ├── EmptyState.tsx      # Icon + heading + subtext placeholder
    │   │   ├── ErrorState.tsx      # Error display with retry action
    │   │   ├── LoadingState.tsx    # Centered activity indicator
    │   │   ├── ModalShell.tsx      # Generic modal wrapper
    │   │   ├── SectionLabel.tsx    # Section title label (UPPERCASE style)
    │   │   ├── SkeletonCard.tsx    # Loading skeleton placeholder card
    │   │   └── Toast.tsx           # In-app toast notification
    │   │
    │   ├── jobs/                   # Job-specific components
    │   │   ├── JobCard.tsx         # Job list item card
    │   │   ├── JobDetailShell.tsx  # Shared scrollable job detail layout
    │   │   ├── JobList.tsx         # Reusable job list (FlatList + filter)
    │   │   ├── PriorityBadge.tsx   # Priority pill (Normal/High/Urgent)
    │   │   ├── StatusBadge.tsx     # Status pill badge
    │   │   └── TechnicianPicker.tsx # Modal to select a technician
    │   │
    │   ├── materials/              # Materials logging components
    │   │   ├── AddMaterialModal.tsx # Form to add a material/part
    │   │   └── MaterialList.tsx    # List of materials with delete option
    │   │
    │   ├── shared/                 # Shared between roles
    │   │   ├── Dropdown.tsx        # Native-style dropdown picker
    │   │   ├── LineItemTable.tsx   # Tabular line-item display for billing
    │   │   ├── RoleDashboard.tsx   # Shared dashboard template (KPI cards + quick actions)
    │   │   ├── SegmentedControl.tsx # Segmented button group (e.g. Inhouse/Onsite)
    │   │   └── SelfieCapture.tsx   # Camera flow: permission → capture → compress → upload
    │   │
    │   ├── onsite/                 # Empty (placeholder for future onsite components)
    │   └── ui/                     # Empty (placeholder for future UI components)
    │
    ├── hooks/
    │   ├── useBottomInsetPadding.ts  # Safe area bottom padding for nav
    │   ├── useCameraPermission.ts    # Camera permission request hook
    │   ├── useLocationPermission.ts  # Location permission request hook
    │   └── usePushNotifications.ts   # Push token registration + sync to DB
    │
    ├── types/
    │   ├── attendance.ts           # AttendanceStatus, AttendanceRecord
    │   ├── billing.ts              # Billing interface
    │   ├── job.ts                  # Job, JobMaterial, JobStatus, JobPriority, etc.
    │   ├── onsiteVisit.ts          # OnsiteVisit interface
    │   └── user.ts                 # User, UserRole, TechnicianSummary
    │
    └── utils/
        ├── billing.ts              # calculatePartsTotal, calculateGrandTotal, roundMoney
        ├── compressImage.ts        # Compress image to 70% quality, resize to max 1280px
        ├── date.ts                 # getTodayDateString, formatTime, formatDate
        ├── formatCurrency.ts       # formatCurrency(n) → "₹1,234.56"
        ├── phone.ts                # cleanPhoneNumber, formatIndianPhoneForWhatsApp, createWhatsAppUrl
        └── storagePaths.ts         # getAttendanceStoragePath() path builder
```

---

## Supabase — Directory Tree

```
supabase/
├── .temp/                          # Temporary Supabase CLI files
└── functions/
    ├── notify-on-job-created/
    │   └── index.ts                # Webhook handler: new job → push + WhatsApp
    ├── notify-on-status-change/
    │   └── index.ts                # Webhook handler: status change → push + WhatsApp
    └── send-invoice-email/
        └── index.ts                # HTTP endpoint: send invoice email via Resend
```

---

## Folder Purpose Summary

| Folder | App | Purpose |
|---|---|---|
| `admin-panel/src/app/` | Admin | Next.js App Router pages and layouts |
| `admin-panel/src/components/` | Admin | Reusable React components |
| `admin-panel/src/context/` | Admin | React Context providers |
| `admin-panel/src/lib/` | Admin | Supabase client + design tokens + utilities |
| `admin-panel/src/shared/` | Both | Code shared with mobile app (DocumentRenderer) |
| `admin-panel/src/styles/` | Admin | CSS Modules for specific pages |
| `admin-panel/src/types/` | Admin | TypeScript type definitions |
| `admin-panel/src/utils/` | Admin | Pure utility functions |
| `RepairShopApp/src/navigation/` | Mobile | React Navigation structure |
| `RepairShopApp/src/screens/` | Mobile | Full screen components (organized by role) |
| `RepairShopApp/src/components/` | Mobile | Reusable UI components |
| `RepairShopApp/src/context/` | Mobile | React Context providers |
| `RepairShopApp/src/hooks/` | Mobile | Custom React hooks |
| `RepairShopApp/src/lib/` | Mobile | Supabase client + auth helper |
| `RepairShopApp/src/types/` | Mobile | TypeScript type definitions |
| `RepairShopApp/src/utils/` | Mobile | Pure utility functions |
| `RepairShopApp/assets/` | Mobile | App icons and images |
| `supabase/functions/` | Backend | Deno-based serverless Edge Functions |
