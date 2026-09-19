# Module 01: Jobs Management (Sample Module Audit)

**Module:** Jobs Intake, Workflow, Assignment, Status Transitions & Operational Documentation  
**Surfaces Covered:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Tier (`packages/shared`), Database & Edge Functions (`supabase`)  
**Status:** Audit Complete — Read-and-Document Only

---

## 1. Module Overview & Lifecycle Map

The **Jobs** module is the central operational backbone of RepairShop. It governs customer intake, device diagnosis, multi-technician assignment, parts allocation, progress updates, onsite visits, status transitions, and operational Job Card documentation.

```text
[Customer / Intake]
       │
       ▼
[Intake Screens] ──RPC find_or_create_customer──► [public.customers]
       │         ──RPC find_or_create_device_type► [public.ui_device_types]
       │         ──RPC generate_job_code────────► [public.jobs (Status: 'Received')]
       ▼
[Job Card Print] (Zero Financial Data)
       │
       ▼
[Technician Assignment] ──Insert / Update────────► [public.job_technicians]
       │                ──Webhook Trigger────────► [Edge Function: notify-on-job-created]
       ▼
[Diagnosis & Repair]   ──Insert / Delete────────► [public.job_materials]
                       ──Update Work Notes──────► [jobs.work_notes]
                       ──Onsite GPS / Selfies───► [public.onsite_visits]
       │
       ▼
[Reconciliation]       ──RPC complete_job_materials► (Reconciles used vs returned inventory)
       │
       ▼
[Status: 'Completed']  ──Timestamp set──────────► [jobs.completed_at]
       │
       ▼
[Handover / Billing]   ──Decoupled Action───────► [Invoice & Tax Bill Generation]
```

---

## 2. Web Admin Panel (`admin-panel`)

### `admin-panel/src/app/(admin)/jobs/page.tsx`
- **Purpose:** Primary administrative job listing, filtering, search, pagination, status tab counting, CSV export, and technician reassignment trigger.
- **Key Exports:**
  - `default function JobsPage()`: Main page component rendering the jobs management dashboard.
- **Inputs & Outputs:**
  - Props: None (Next.js App Router Page).
  - Output: Full-screen table of jobs with search bar, collapsible secondary filters, status tabs, pagination, and quick actions.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (PageHeader, Card, Button, Input, Select, StatusBadge, PriorityBadge, Tabs, Pagination, DataTableSkeleton, ErrorState, EmptyState, ActiveFiltersBar), `@/components/jobs/ReassignTechnicianModal`, `@/utils/csv` (`exportJobsToCSV`), `@/utils/formatDate`, `@/lib/utils` (`cn`).
  - External: `@repairshop/shared` (`Job`, `User`, `useDebounceValue`), `lucide-react`, `next/navigation` (`useRouter`, `useSearchParams`).
  - Database: Queries `jobs` (joined with `users` and `job_technicians`), `users` (`role = 'technician'`), RPC `get_job_status_counts` (with 7 parallel query fallback).
- **Side Effects:**
  - Subscribes to Supabase Realtime channel `admin-joblist-changes` on table `jobs`.
  - Downloads client CSV export (`exportJobsToCSV`).
  - Updates URL query params via Next.js navigation.
- **Callers:**
  - Next.js App Router route: `/jobs`.
  - Linked from sidebar navigation (`Sidebar.tsx`), dashboard summary links, and detail screen back buttons.
- **Observations / Debt:**
  - Status counts trigger RPC `get_job_status_counts`. If the RPC fails, it falls back to 7 parallel database round trips.

---

### `admin-panel/src/app/(admin)/jobs/new/page.tsx`
- **Purpose:** Form controller for registering new repair jobs in the workshop. Gathers customer info, device issue, service catalog selection, and technician assignments.
- **Key Exports:**
  - `default function CreateJobPage()`: Main page component for job intake.
- **Inputs & Outputs:**
  - Props: None.
  - Output: Multi-card intake form or success card upon completion.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (PageHeader, Button, Card, Input), `@/components/jobs/new/*` (CustomerInfoCard, ServiceCatalogCard, DeviceIssueCard, AssignmentCard, JobSuccessCard), `./reducer` (`createJobReducer`, `initialState`).
  - External: `@repairshop/shared` (`User`, `JobTypeCatalogItem`, `validateAndNormalizeIndianPhone`), `lucide-react`, `next/navigation`.
  - Database: Queries `users` (active technicians), `job_types`, `ui_device_types`. Calls RPCs: `generate_job_code`, `find_or_create_device_type`, `find_or_create_customer`. Inserts into `jobs` and `job_technicians`.
- **Side Effects:**
  - Generates sequence-driven job codes via database sequence.
  - Inserts new customer directory records if not existing.
  - Inserts primary job record and auxiliary records into `job_technicians`.
  - Subscribes to Realtime channel `new-job-users-realtime` on table `users`.
- **Callers:**
  - Next.js App Router route: `/jobs/new`.
  - Triggered via "Create Job" button on `JobsPage.tsx` and quick action bar.
- **Observations / Debt:**
  - Single-responsibility compliance: Server generates job code via RPC `generate_job_code` conforming to `GEMINI.md`.

---

### `admin-panel/src/app/(admin)/jobs/new/reducer.ts`
- **Purpose:** Pure state reducer managing the intake form values, validation errors, catalog state, and submission flags.
- **Key Exports:**
  - `interface CreateJobFormState`: Type definition for all input fields of new job registration.
  - `interface CreateJobState`: Complete reducer state including lookup arrays and flags.
  - `type CreateJobAction`: Discriminated union of reducer actions.
  - `const initialFormState`, `const initialState`: Default states.
  - `function createJobReducer(state, action)`: Pure reducer function.
- **Inputs & Outputs:**
  - `(state: CreateJobState, action: CreateJobAction) => CreateJobState`.
- **Dependencies:**
  - External: `@repairshop/shared` (`User`, `Job`, `JobTypeCatalogItem`).
- **Side Effects:** None (pure functional reducer).
- **Callers:**
  - Imported and used in `admin-panel/src/app/(admin)/jobs/new/page.tsx`.

---

### `admin-panel/src/app/(admin)/jobs/[id]/page.tsx`
- **Purpose:** Comprehensive job details hub displaying operational device info, live material ledger, onsite visit logs, technician work notes, assignment controls, and decoupled billing.
- **Key Exports:**
  - `default function JobDetailPage({ params })`: Dynamic route component for viewing/editing a job.
- **Inputs & Outputs:**
  - Inputs: `params: Promise<{ id: string }>`.
  - Output: Two-column operational dashboard with sticky right-side configuration and billing summary.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (PageHeader, Card, Button, JobDetailSkeleton, EmptyState, ErrorState, ConfirmationModal, PrintProgressModal), `@/components/jobs/detail/*` (JobInfoCard, JobConfigCard, JobMaterialsCard, JobBillingCard, JobNotesCard, OnsiteDetailsCard), `@/components/jobs/ReassignTechnicianModal`, `@/lib/jobCardClient` (`openJobCardPrint`), `./reducer` (`jobDetailReducer`, `initialState`).
  - External: `@repairshop/shared` (`Job`), `lucide-react`, `next/navigation`.
  - Database: Queries `jobs`, `job_materials`, `invoices`, `users`, `onsite_visits`, RPC `get_unique_device_types`. Updates `jobs`.
- **Side Effects:**
  - Subscribes to Supabase Realtime channels `admin-job-detail-{id}` for `jobs` and `job_materials`.
  - Triggers browser print dialog via hidden iframe for Job Card generation.
- **Callers:**
  - Next.js App Router route: `/jobs/[id]`.
  - Navigated to from `JobsPage.tsx`, `JobSuccessCard.tsx`, notifications, and global search.

---

### `admin-panel/src/app/(admin)/jobs/[id]/reducer.ts`
- **Purpose:** Pure state reducer managing job details, edit modal toggles, material items, billing values, and confirmation modals.
- **Key Exports:**
  - `interface JobDetailState`: State model for detail view.
  - `type JobDetailAction`: Actions for data fetching, editing, materials, and notes.
  - `const initialState`: Default state.
  - `function jobDetailReducer(state, action)`: Pure reducer function.
- **Inputs & Outputs:**
  - `(state: JobDetailState, action: JobDetailAction) => JobDetailState`.
- **Dependencies:**
  - External: `@repairshop/shared` (`Job`, `JobMaterial`, `User`).
- **Side Effects:** None.
- **Callers:**
  - Imported in `admin-panel/src/app/(admin)/jobs/[id]/page.tsx`.

---

### `admin-panel/src/app/(admin)/job-types/page.tsx`
- **Purpose:** Service catalog management page allowing administrators to define standard repair packages, customer prices, and technician incentive rates.
- **Key Exports:**
  - `default function JobTypesPage()`: Catalog table and editor.
- **Inputs & Outputs:**
  - Props: None.
  - Output: CRUD data table for job types.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/types/salary` (`JobTypeItem`), `@/components/catalog/JobTypeFormModal`, `@/components/common/*` (PageHeader, SearchFilterBar, DataTable, Button, EmptyState, ConfirmationModal).
  - External: `@repairshop/shared` (`useDebounceValue`), `lucide-react`.
  - Database: Queries, updates (`is_active`), and deletes rows from `public.job_types`.
- **Side Effects:**
  - Mutates `public.job_types`.
- **Callers:**
  - Next.js App Router route: `/job-types`.

---

### `admin-panel/src/components/jobs/ReassignTechnicianModal.tsx`
- **Purpose:** Modal dialog to assign, reassign, or multi-allocate technicians to an existing job.
- **Key Exports:**
  - `default function ReassignTechnicianModal({ job, technicians, onClose, onSuccess })`: Modal component.
- **Inputs & Outputs:**
  - Props: `job: Job`, `technicians: User[]`, `onClose: () => void`, `onSuccess: () => void`.
  - Output: Modal with selectable technician list and save button.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `../common/Button`.
  - External: `@repairshop/shared` (`Job`, `User`), `lucide-react`.
  - Database: Inserts/updates `public.job_technicians` (sets `removed_at`), updates `jobs.technician_id`.
- **Side Effects:**
  - Soft-deletes unselected technicians by setting `removed_at = now()`.
  - Inserts newly selected technician rows.
- **Callers:**
  - `JobsPage.tsx`, `JobDetailPage.tsx`.
- **Observations / Debt:**
  - Multi-technician architecture: Keeps legacy `jobs.technician_id` synced to the primary technician while allocating team members in `job_technicians`.

---

### `admin-panel/src/components/jobs/detail/JobInfoCard.tsx`
- **Purpose:** Displays customer and device metadata. Provides inline editing controls and prefilled WhatsApp link generation.
- **Key Exports:**
  - `export function JobInfoCard(props: JobInfoCardProps)`: Component card.
- **Inputs & Outputs:**
  - Props: `job`, `technicians`, `isEditing`, `setIsEditing`, `onJobUpdated`, `billing`, `deviceTypes`, `materials`, `onUpdateMaterials`.
  - Output: Form view (when editing) or read-only customer and device info card.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (Card, Button, Input, Select, Textarea, StatusBadge, PriorityBadge), `./MaterialReconciliationModal`.
  - External: `@repairshop/shared` (`Job`, `User`, `JobMaterial`), `lucide-react`.
  - Database: Mutates `public.jobs`.
- **Side Effects:**
  - Updates `jobs` table on save.
  - Opens external browser window for WhatsApp customer communication (`wa.me`).
- **Callers:**
  - `JobDetailPage.tsx`.
- **Observations / Debt:**
  - Hardcoded Branding: Line 83 contains hardcoded legacy string: `at Digital Solution.` which violates the RepairShop branding constraint.

---

### `admin-panel/src/components/jobs/detail/JobConfigCard.tsx`
- **Purpose:** Manages job status, priority, service location (Inhouse/Onsite), and assigned staff roster.
- **Key Exports:**
  - `export function JobConfigCard(props: JobConfigCardProps)`: Config card component.
- **Inputs & Outputs:**
  - Props: `job`, `isEditing`, `setIsEditing`, `editForm`, `setEditForm`, `technicians`, `onSaveJob`, `onManageTechnicians`.
- **Dependencies:**
  - Internal: `@/context/AppConfigContext`, `@/components/common/*` (Card, Button, Select, StatusBadge, PriorityBadge).
  - External: `@repairshop/shared` (`Job`, `User`), `lucide-react`.
- **Side Effects:** Modifies parent edit state and triggers save action.
- **Callers:**
  - `JobDetailPage.tsx`.

---

### `admin-panel/src/components/jobs/detail/JobMaterialsCard.tsx`
- **Purpose:** Tabular ledger of parts and materials consumed by the repair. Provides inline row addition and deletion.
- **Key Exports:**
  - `export function JobMaterialsCard(props: JobMaterialsCardProps)`: Materials management card.
- **Inputs & Outputs:**
  - Props: `jobId`, `job`, `materials`, `newMaterial`, `addingMaterial`, callbacks.
  - Output: Interactive table of logged materials with unit costs and total amounts.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (Card, Button, Input).
  - External: `@repairshop/shared` (`JobMaterial`, `formatCurrency`), `lucide-react`.
  - Database: Inserts into and deletes from `public.job_materials`.
- **Side Effects:**
  - Inserts new material row with `checkout_status = 'checked_out'`.
  - Deletes material rows upon confirmation.
- **Callers:**
  - `JobDetailPage.tsx`.

---

### `admin-panel/src/components/jobs/detail/JobNotesCard.tsx`
- **Purpose:** Compact card for saving technician diagnosis and internal repair notes (`work_notes`).
- **Key Exports:**
  - `export function JobNotesCard(props: JobNotesCardProps)`: Notes card component.
- **Inputs & Outputs:**
  - Props: `jobId`, `notes`, `notesSaving`, callbacks.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (Card, Button, Textarea).
  - External: `lucide-react`.
  - Database: Updates `jobs.work_notes`.
- **Side Effects:** Direct update query to `public.jobs`.
- **Callers:**
  - `JobDetailPage.tsx`.

---

### `admin-panel/src/components/jobs/detail/JobBillingCard.tsx`
- **Purpose:** Billing preview and invoice generation/synchronization card. Supports two-way GST line calculation and cash/online payment recording.
- **Key Exports:**
  - `export function JobBillingCard(props: JobBillingCardProps)`: Billing interface card.
- **Inputs & Outputs:**
  - Props: `jobId`, `job`, `jobCode`, `materials`, `billing`, `billingForm`, `billingSaving`, callbacks.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/billing/PaymentRecordingBox`, `@/lib/invoiceClient` (`openInvoicePrint`), `@/components/common/PrintProgressModal`, `@/components/inventory/SerialSelectionDropdown`.
  - External: `@repairshop/shared` (`formatCurrency`, `calculateBillingTotals`, `forwardCalcLine`, `reverseCalcLineFromTotal`, `recalcBill`, `reverseCalcBillFromGrandTotal`, `LineItem`), `lucide-react`.
  - Database: Calls RPC `create_invoice`. Directly mutates `public.invoices` and `public.invoice_items`.
- **Side Effects:**
  - Creates or modifies invoices.
  - Opens branded SVG letterhead tax invoice in print dialog.
- **Callers:**
  - `JobDetailPage.tsx`.
- **Observations / Debt:**
  - Single-RPC Violation: When an invoice already exists, updates are performed via direct client writes (`supabase.from('invoices').update()` and `supabase.from('invoice_items').delete()`) rather than an atomic financial RPC.

---

### `admin-panel/src/components/jobs/detail/OnsiteDetailsCard.tsx`
- **Purpose:** Displays technician arrival/departure timestamps, GPS locations (with Google Maps deep links), and verification photos for onsite jobs.
- **Key Exports:**
  - `export function OnsiteDetailsCard(props: OnsiteDetailsCardProps)`: Onsite tracking card.
- **Inputs & Outputs:**
  - Props: `onsiteVisits: any[]`.
  - Output: Visual timeline of arrival, departure, and device photos with zoomable lightbox.
- **Dependencies:**
  - Internal: `@/components/common/Card`, `@/components/common/EmptyState`.
  - External: `next/image`, `lucide-react`.
- **Side Effects:** None (read-only presentation).
- **Callers:**
  - `JobDetailPage.tsx`.

---

### `admin-panel/src/components/jobs/detail/MaterialReconciliationModal.tsx`
- **Purpose:** Reconciles parts used vs parts returned when transitioning a job to 'Completed'. Returns unused stock to inventory.
- **Key Exports:**
  - `export function MaterialReconciliationModal(props: MaterialReconciliationModalProps)`: Reconciliation dialog.
- **Inputs & Outputs:**
  - Props: `isOpen`, `onClose`, `job`, `materials`, `onReconciled`.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (Modal, Button, Input, Textarea, Badge).
  - External: `@repairshop/shared` (`Job`, `JobMaterial`, `formatCurrency`), `lucide-react`.
  - Database: Calls RPC `complete_job_materials`. Queries `public.job_materials`.
- **Side Effects:**
  - Executes server-side inventory reconciliation and marks job as 'Completed' atomically.
- **Callers:**
  - `JobInfoCard.tsx`.

---

### `admin-panel/src/components/jobs/new/CustomerInfoCard.tsx`
- **Purpose:** Customer contact and identity input block with real-time typeahead search against the customer directory.
- **Key Exports:**
  - `export function CustomerInfoCard(props: CustomerInfoCardProps)`: Customer form card.
- **Inputs & Outputs:**
  - Props: `form`, `errors`, `onChange`, `onAutoFillCustomer`, `onClearCustomer`.
- **Dependencies:**
  - Internal: `@/components/common/*` (Card, Input, Textarea), `@/components/customers/CustomerTypeahead`.
  - External: `@repairshop/shared` (`Customer`, `formatPhoneInput`), `lucide-react`.
- **Side Effects:** Triggers customer directory search.
- **Callers:**
  - `CreateJobPage.tsx`.

---

### `admin-panel/src/components/jobs/new/DeviceIssueCard.tsx`
- **Purpose:** Input block for device category selection (with auto-suggest dropdown) and detailed reported issue text.
- **Key Exports:**
  - `export function DeviceIssueCard(props: DeviceIssueCardProps)`: Device issue form card.
- **Inputs & Outputs:**
  - Props: `form`, `errors`, `deviceTypes`, `onChange`.
- **Dependencies:**
  - Internal: `@/components/common/*` (Card, Input, Textarea).
  - External: `lucide-react`.
- **Side Effects:** None.
- **Callers:**
  - `CreateJobPage.tsx`.

---

### `admin-panel/src/components/jobs/new/ServiceCatalogCard.tsx`
- **Purpose:** Allows intake staff to select a pre-configured service package from the catalog, locking in base charge and technician incentive snapshots.
- **Key Exports:**
  - `export function ServiceCatalogCard(props: ServiceCatalogCardProps)`: Service package selector.
- **Inputs & Outputs:**
  - Props: `form`, `catalogItems`, `catalogLoading`, `onSelectServiceCatalog`.
- **Dependencies:**
  - Internal: `@/components/common/*` (Card, Select).
  - External: `@repairshop/shared` (`JobTypeCatalogItem`, `formatCurrency`), `lucide-react`.
- **Side Effects:** Updates selected catalog snapshots.
- **Callers:**
  - `CreateJobPage.tsx`.

---

### `admin-panel/src/components/jobs/new/AssignmentCard.tsx`
- **Purpose:** Configures service location (Inhouse vs Onsite), priority, and technician checkboxes. Houses the final submission button.
- **Key Exports:**
  - `export function AssignmentCard(props: AssignmentCardProps)`: Assignment card component.
- **Inputs & Outputs:**
  - Props: `form`, `technicians`, `loading`, `onChange`.
- **Dependencies:**
  - Internal: `@/components/common/*` (Card, Select, Button).
  - External: `@repairshop/shared` (`User`), `lucide-react`.
- **Side Effects:** Submits parent form.
- **Callers:**
  - `CreateJobPage.tsx`.

---

### `admin-panel/src/components/jobs/new/JobSuccessCard.tsx`
- **Purpose:** Displayed immediately upon job creation. Features prominent "Print Job Card" action, decoupled "Generate Bill" navigation, and "Create Another" reset.
- **Key Exports:**
  - `export function JobSuccessCard(props: JobSuccessCardProps)`: Post-intake confirmation screen.
- **Inputs & Outputs:**
  - Props: `createdJob: Job`, `form: CreateJobFormState`, `onCreateAnother: () => void`.
- **Dependencies:**
  - Internal: `@/lib/jobCardClient` (`openJobCardPrint`), `@/components/common/*` (Card, Button, PrintProgressModal).
  - External: `@repairshop/shared` (`Job`, `formatCurrency`), `lucide-react`, `next/navigation`.
- **Side Effects:** Triggers operational Job Card print dialog.
- **Callers:**
  - `CreateJobPage.tsx`.

---

### `admin-panel/src/lib/jobCardClient.ts`
- **Purpose:** Web client engine for printing the operational Job Card document via a hidden in-page `<iframe>`.
- **Key Exports:**
  - `openJobCardPrint(options: PrintJobCardOptions): Promise<void>`: Fetches complete job metadata and triggers native browser printing.
  - `type PrintProgressCallback`, `interface PrintJobCardOptions`.
- **Inputs & Outputs:**
  - Parameters: `{ jobId, preloadedJob, materials, onProgress }`.
  - Output: Opens `window.print()` inside an iframe.
- **Dependencies:**
  - Internal: `@/lib/supabase`.
  - External: `@repairshop/shared` (`generateJobCardHtml`, `JobCardData`, `JobCardMaterialItem`).
  - Database: Queries `jobs` (joined with technicians, receptionist, job_types) and `job_materials`.
- **Side Effects:** Creates/manages `#admin-job-card-print-frame` DOM element and triggers print spooler.
- **Callers:**
  - `JobSuccessCard.tsx`, `JobDetailPage.tsx`.

---

## 3. Mobile Application (`RepairShopApp`)

### `RepairShopApp/src/screens/receptionist/JobListScreen.tsx`
- **Purpose:** Mobile receptionist job list screen with status filtering tabs, server-side search, pull-to-refresh, infinite scroll pagination, and realtime updates.
- **Key Exports:**
  - `default function JobListScreen()`: Screen component.
- **Inputs & Outputs:**
  - Props: None (React Navigation Stack screen).
  - Output: Animated list of `JobCard` components with pull-to-refresh.
- **Dependencies:**
  - Internal: `../../lib/supabase`, `../../types/job` (`Job`), `../../components/jobs/JobList`, `../../hooks/useRealtimeSubscription`.
  - External: `@repairshop/shared` (`useDebounceValue`), `@react-navigation/native`.
  - Database: Calls RPC `get_job_status_counts` (with 6 parallel query fallback), queries `jobs` joined with `technician:technician_id(name)`.
- **Side Effects:** Subscribes to Supabase Realtime table `jobs`.
- **Callers:**
  - Registered in `ReceptionistJobsStack.tsx` as `"JobList"`.

---

### `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx`
- **Purpose:** Mobile post-intake review and assignment screen. Finalizes job registration, invokes sequence RPC, links customer, and presents success modal with "Job Card" and "Generate Bill" options.
- **Key Exports:**
  - `default function JobAssignmentScreen()`: Screen component.
- **Inputs & Outputs:**
  - Route Params: `{ formState: NewJobFormValues }`.
- **Dependencies:**
  - Internal: `../../lib/supabase`, `../../context/AuthContext`, `../../context/ToastContext`, `../../types/job`, `../../components/jobs/TechnicianPicker`, `../../components/common/*` (AppHeader, SectionLabel, DetailRow, Button, ScreenScrollView, AppPressable), `../../lib/jobCardService` (`printJobCard`).
  - External: `@repairshop/shared` (`cleanPhoneNumber`, `createWhatsAppUrl`), `lucide-react-native`, `react-native-reanimated`.
  - Database: Calls RPCs `generate_job_code`, `find_or_create_customer`, `find_or_create_device_type`. Inserts into `jobs` and `job_technicians`.
- **Side Effects:**
  - Writes new records to database.
  - Launches native AirPrint / Android Print Spooler for Job Card.
  - Opens native WhatsApp application.
- **Callers:**
  - Navigated from `CustomerIntakeScreen.tsx`.

---

### `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx`
- **Purpose:** Mobile receptionist job detail view. Displays customer, device, materials, technician re-assignment modal trigger, ready-for-pickup WhatsApp link, and decoupled Job Card vs Generate Bill actions.
- **Key Exports:**
  - `default function JobDetailScreen()`: Screen component.
- **Inputs & Outputs:**
  - Route Params: `{ jobId: string }`.
- **Dependencies:**
  - Internal: `../../lib/supabase`, `../../types/job` (`Job`, `JobMaterial`), `../../components/jobs/*` (JobDetailShell, TechnicianPicker), `../../components/common/*` (SectionLabel, SkeletonList, ErrorState, Button, AppHeader, AppPressable), `../../lib/jobCardService` (`printJobCard`), `../../hooks/useRealtimeSubscription`.
  - External: `@repairshop/shared` (`createWhatsAppUrl`), `lucide-react-native`, `@react-navigation/native`.
  - Database: Queries `jobs`, `job_technicians`, `job_materials`. Updates `jobs` and `job_technicians`.
- **Side Effects:**
  - Subscribes to realtime changes for `jobs` and `job_materials`.
  - Triggers native mobile print sheet.
  - Opens WhatsApp app with pre-filled message.
- **Callers:**
  - `JobListScreen.tsx`, push notification deep link (`screen: 'JobDetail'`).
- **Observations / Debt:**
  - Hardcoded Branding: Line 128 contains hardcoded message: `Please visit Digital Solution with your receipt.`.

---

### `RepairShopApp/src/screens/technician/MyJobsScreen.tsx`
- **Purpose:** Technician-specific job queue screen. Filters jobs strictly assigned to the logged-in technician (via `job_technicians` inner join) to maintain role isolation.
- **Key Exports:**
  - `default function MyJobsScreen()`: Screen component.
- **Inputs & Outputs:**
  - Route Params: Optional `{ filter?: string }`.
- **Dependencies:**
  - Internal: `../../lib/supabase`, `../../types/job` (`Job`), `../../context/AuthContext`, `../../components/jobs/JobList`, `../../hooks/useRealtimeSubscription`.
  - External: `@repairshop/shared` (`useDebounceValue`), `@react-navigation/native`.
  - Database: Queries `jobs` joined with `job_technicians!inner(technician_id, removed_at)` filtered to `user.id`. Calls RPC `get_job_status_counts(p_technician_id)`.
- **Side Effects:**
  - Realtime subscription scoped to technician jobs.
- **Callers:**
  - Registered in `TechnicianJobsStack.tsx` as `"MyJobsList"`.

---

### `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx`
- **Purpose:** Primary operational screen for technicians. Allows updating job status ('In Progress', 'Waiting for Materials', 'Completed'), adding materials, selecting diagnosed service catalog items, writing work notes, capturing arrival/completion selfies, and triggering material usage reconciliation.
- **Key Exports:**
  - `default function UpdateWorkScreen()`: Screen component.
- **Inputs & Outputs:**
  - Route Params: `{ jobId: string }`.
- **Dependencies:**
  - Internal: `../../lib/supabase`, `../../types/job`, `../../context/AuthContext`, `../../context/ToastContext`, `../../components/jobs/JobDetailShell`, `../../components/materials/*` (AddMaterialModal, MaterialList), `../../components/work/*` (ArrivalSelfieBanner, CompletionSelfieBanner, MaterialUsageModal).
  - External: `@repairshop/shared` (`formatCurrency`), `lucide-react-native`, `@react-navigation/native`.
  - Database: Queries `jobs`, `job_materials`, `job_types`. Updates `jobs`. Calls RPC `complete_job_materials`.
- **Side Effects:**
  - Updates status and work notes.
  - Adds/removes materials.
  - Captures and uploads verification selfies to Supabase Storage.
- **Callers:**
  - Navigated to from `MyJobsScreen.tsx` when a technician taps a job card.

---

### `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx`
- **Purpose:** Flow for onsite repair visits. Handles GPS location verification and front-camera selfie capture upon technician arrival and departure.
- **Key Exports:**
  - `default function OnsiteVisitScreen()`: Screen component.
- **Inputs & Outputs:**
  - Route Params: `{ jobId: string }`.
- **Dependencies:**
  - Internal: `../../lib/supabase`, `../../context/AuthContext`, `../../types/job`, `../../types/onsiteVisit`, `../../components/jobs/JobDetailShell`, `../../components/shared/SelfieCapture`.
  - External: `@repairshop/shared` (`formatTime`), `lucide-react-native`, `@react-navigation/native`.
  - Database: Queries and updates `public.onsite_visits` and `public.jobs`.
- **Side Effects:**
  - Uploads photo to Supabase Storage bucket `onsite-visits`.
  - Inserts/updates `onsite_visits` with coordinates and timestamp.
- **Callers:**
  - Navigated from `MyJobsScreen.tsx` or `UpdateWorkScreen.tsx` for 'Onsite' jobs.

---

### `RepairShopApp/src/screens/admin/AdminJobsScreen.tsx`
- **Purpose:** Mobile admin jobs overview screen with global search, status counts, and navigation to admin detail.
- **Key Exports:**
  - `default function AdminJobsScreen()`: Screen component.
- **Inputs & Outputs:**
  - Output: Paginated mobile job list.
- **Dependencies:**
  - Internal: `../../lib/supabase`, `../../types/job`, `../../components/jobs/JobList`.
  - External: `@repairshop/shared` (`useDebounceValue`), `@react-navigation/native`.
  - Database: Queries `jobs` joined with `technician:technician_id(name)`. Calls RPC `get_job_status_counts`.
- **Side Effects:** None.
- **Callers:**
  - Registered in `AdminJobsStack.tsx`.

---

### `RepairShopApp/src/screens/admin/AdminJobDetailScreen.tsx`
- **Purpose:** Mobile admin job detail view providing read-only inspection of materials, technician assignment details, and status.
- **Key Exports:**
  - `default function AdminJobDetailScreen()`: Screen component.
- **Inputs & Outputs:**
  - Route Params: `{ jobId: string }`.
- **Dependencies:**
  - Internal: `../../lib/supabase`, `../../types/job`, `../../components/jobs/*` (JobDetailShell, TechnicianPicker), `../../components/shared/LineItemTable`.
  - External: `lucide-react-native`, `@react-navigation/native`.
  - Database: Queries `jobs`, `job_technicians`, `job_materials`. Updates `jobs` on reassignment.
- **Side Effects:** Realtime subscriptions.
- **Callers:**
  - `AdminJobsScreen.tsx`.

---

### `RepairShopApp/src/components/jobs/JobCard.tsx`
- **Purpose:** Shared mobile job card item with spring touch feedback, priority accent borders, status badge, customer name, device issue, and timestamp.
- **Key Exports:**
  - `const JobCard = React.memo(...)`: Animated card component.
  - `interface JobCardProps`.
- **Inputs & Outputs:**
  - Props: `job: Job & { technician_name?: string }`, `onPress: (id: string) => void`, `index?: number`, `isTechnicianView?: boolean`, `suppressEnter?: boolean`.
  - Output: Rendered animated Pressable card.
- **Dependencies:**
  - Internal: `../../tokens` (`colors`, `radius`, `spacing`, `SPRING`, `getStatusCard`, `getPriorityCard`), `./StatusBadge`.
  - External: `react-native-reanimated`, `react-native`.
- **Side Effects:** None.
- **Callers:**
  - `JobList.tsx`.

---

### `RepairShopApp/src/components/jobs/JobList.tsx`
- **Purpose:** Reusable scrollable list view with search bar, status tabs, empty states, and pull-to-refresh.
- **Key Exports:**
  - `export default function JobList(props: JobListProps)`: Container component.
  - `interface TabDefinition`, `interface JobListProps`.
- **Inputs & Outputs:**
  - Props: `jobs`, `loading`, `refreshing`, `onRefresh`, `onLoadMore`, `hasMore`, `onJobPress`, `searchQuery`, `onSearchChange`, `activeTab`, `onTabChange`, `tabs`.
- **Dependencies:**
  - Internal: `../../tokens`, `./JobCard`, `../common/EmptyState`, `../common/SkeletonCard`.
  - External: `react-native`, `lucide-react-native`.
- **Side Effects:** None.
- **Callers:**
  - `JobListScreen.tsx`, `MyJobsScreen.tsx`, `AdminJobsScreen.tsx`.

---

### `RepairShopApp/src/components/jobs/JobDetailShell.tsx`
- **Purpose:** Shared mobile layout wrapper for job details. Renders top app header, pastel status banner, customer information card, and device issue card.
- **Key Exports:**
  - `export default function JobDetailShell(props: JobDetailShellProps)`: Layout shell.
  - `interface JobDetailShellProps`.
- **Inputs & Outputs:**
  - Props: `job: Job`, `feedbackMessage?: string`, `children?: ReactNode`, `contentContainerStyle?: StyleProp<ViewStyle>`.
- **Dependencies:**
  - Internal: `../../tokens`, `./StatusBadge`, `./PriorityBadge`, `../common/*` (AppHeader, SectionLabel, DetailRow, AppPressable), `../../hooks/useBottomInsetPadding`.
  - External: `@repairshop/shared` (`formatDate`, `formatTime`), `react-native`, `react-native-reanimated`, `lucide-react-native`.
- **Side Effects:** Links to device phone dialer (`tel:`).
- **Callers:**
  - Receptionist `JobDetailScreen.tsx`, Technician `UpdateWorkScreen.tsx`, Technician `OnsiteVisitScreen.tsx`, Admin `AdminJobDetailScreen.tsx`.

---

### `RepairShopApp/src/components/jobs/StatusBadge.tsx` & `PriorityBadge.tsx`
- **Purpose:** Visual pill badges conveying job lifecycle status ('Received', 'In Progress', 'Waiting for Materials', 'Completed') and priority ('Normal', 'High', 'Urgent').
- **Key Exports:**
  - `export default function StatusBadge({ status, isUrgent })`: Status badge.
  - `export default function PriorityBadge({ priority })`: Priority badge.
- **Inputs & Outputs:**
  - Props: Status string or Priority string.
  - Output: Styled React Native `View` and `Text`.
- **Dependencies:**
  - Internal: `../../tokens` (`getStatusCard`, `getPriorityCard`, `typography`, `radius`).
- **Callers:**
  - `JobCard.tsx`, `JobDetailShell.tsx`, `JobListScreen.tsx`.

---

### `RepairShopApp/src/components/jobs/TechnicianPicker.tsx`
- **Purpose:** Bottom-sheet modal for selecting one or multiple active technicians to assign to a job.
- **Key Exports:**
  - `export default function TechnicianPicker(props: TechnicianPickerProps)`: Picker modal.
- **Inputs & Outputs:**
  - Props: `visible: boolean`, `onClose: () => void`, `onSelect: (ids: string[], names: string[]) => void`, `initialSelectedIds?: string[]`.
- **Dependencies:**
  - Internal: `../../lib/supabase`, `../../tokens`, `../common/*` (Button, AppPressable).
  - External: `react-native`, `lucide-react-native`.
  - Database: Queries `users` (`role = 'technician'`, `is_active = true`).
- **Side Effects:** None.
- **Callers:**
  - `JobAssignmentScreen.tsx`, `JobDetailScreen.tsx`, `AdminJobDetailScreen.tsx`.

---

### `RepairShopApp/src/lib/jobCardService.ts`
- **Purpose:** Mobile Job Card operational document service. Formats metadata and triggers native system printing or PDF sharing.
- **Key Exports:**
  - `printJobCard(options: MobilePrintJobCardOptions): Promise<void>`: Launches iOS AirPrint / Android Print Spooler.
  - `shareJobCard(options: MobilePrintJobCardOptions): Promise<void>`: Generates PDF and triggers native share sheet.
  - `type JobCardProgressCallback`, `interface MobilePrintJobCardOptions`.
- **Inputs & Outputs:**
  - Parameters: `{ jobId, preloadedJob, materials, onProgress }`.
  - Output: Opens hardware print preview sheet (`Print.printAsync`) or share dialog.
- **Dependencies:**
  - Internal: `./supabase`.
  - External: `expo-print`, `expo-sharing`, `@repairshop/shared` (`generateJobCardHtml`, `JobCardData`, `JobCardMaterialItem`).
  - Database: Queries `jobs` and `job_materials`.
- **Side Effects:**
  - Uses `expo-print` and `expo-sharing` to generate and share files.
- **Callers:**
  - `JobAssignmentScreen.tsx`, `JobDetailScreen.tsx`.

---

### `RepairShopApp/src/types/job.ts`
- **Purpose:** Mobile domain models for repair jobs, material items, and intake form values.
- **Key Exports:**
  - `type JobStatus`, `type JobPriority`, `type JobType`, `type DeviceType`.
  - `interface Job`, `interface JobMaterial`, `interface NewJobFormValues`.
- **Dependencies:** None.
- **Callers:**
  - Imported across all mobile screens and components.

---

### `RepairShopApp/src/navigation/ReceptionistJobsStack.tsx` & `TechnicianJobsStack.tsx`
- **Purpose:** Native stack navigators defining screen transitions and deep links for receptionist and technician workflows.
- **Key Exports:**
  - `default function ReceptionistJobsStack()`: Stack navigator.
  - `default function TechnicianJobsStack()`: Stack navigator.
- **Dependencies:**
  - External: `@react-navigation/native-stack`.
  - Internal: Role-specific screen components.
- **Callers:**
  - Registered in `RootNavigator.tsx` within role-specific bottom tab navigators.

---

## 4. Shared Document Engine (`packages/shared`)

### `packages/shared/src/jobCardTemplate.ts` (and mirror `RepairShopApp/src/lib/shared/src/jobCardTemplate.ts`)
- **Purpose:** Standalone, deterministic HTML generator for operational Job Cards. Strictly enforces zero-financial presentation (no rates, no taxes, no currency, no totals).
- **Key Exports:**
  - `generateJobCardHtml(data: JobCardData): string`: Pure function returning complete A4/receipt HTML document with inline CSS `@media print`.
  - `interface JobCardData`, `interface JobCardMaterialItem`, `interface JobCardCompanyInfo`.
- **Inputs & Outputs:**
  - Input: `data: JobCardData` (customer details, device specs, reported issue, parts allocated by quantity only, terms of service).
  - Output: High-contrast HTML string with escape-sanitized inputs.
- **Dependencies:** None (zero external dependencies).
- **Side Effects:** None.
- **Callers:**
  - Web: `admin-panel/src/lib/jobCardClient.ts`.
  - Mobile: `RepairShopApp/src/lib/jobCardService.ts`.
  - Tests: `packages/shared/src/jobCardTemplate.test.ts` (5/5 automated unit tests pass).

---

## 5. Database Schema, RPCs & Edge Functions (`supabase`)

### Tables Touched

| Table | Columns / Constraints | Accessing Files | Operation |
|---|---|---|---|
| `public.jobs` | `id` (uuid, PK), `job_code` (text, unique), `customer_id` (uuid, FK), `customer_name` (text), `customer_contact` (text), `customer_email` (text), `device_type_id` (text), `reported_issue` (text), `remarks` (text), `work_notes` (text), `job_type` (text: 'Inhouse'/'Onsite'), `priority` (text), `status` (text: 'Received', 'In Progress', 'Waiting for Materials', 'Completed', 'Delivered', 'Cancelled'), `receptionist_id` (uuid, FK), `technician_id` (uuid, FK), `job_type_ref_id` (uuid, FK), `snap_technician_incentive` (numeric), `created_at` (timestamptz), `completed_at` (timestamptz). | `JobsPage.tsx`, `CreateJobPage.tsx`, `JobDetailPage.tsx`, `JobListScreen.tsx`, `JobAssignmentScreen.tsx`, `JobDetailScreen.tsx`, `MyJobsScreen.tsx`, `UpdateWorkScreen.tsx`. | SELECT, INSERT, UPDATE |
| `public.job_technicians` | `id` (uuid, PK), `job_id` (uuid, FK cascade), `technician_id` (uuid, FK cascade), `assigned_at` (timestamptz), `removed_at` (timestamptz). Unique: `(job_id, technician_id)`. | `CreateJobPage.tsx`, `JobDetailPage.tsx`, `ReassignTechnicianModal.tsx`, `JobAssignmentScreen.tsx`, `JobDetailScreen.tsx`, `MyJobsScreen.tsx`, `AdminJobsScreen.tsx`. | SELECT, INSERT, UPDATE (`removed_at`) |
| `public.job_materials` | `id` (uuid, PK), `job_id` (uuid, FK cascade), `material_name` (text), `quantity` (numeric), `added_qty` (numeric), `used_qty` (numeric), `remaining_qty` (numeric), `unit_cost` (numeric), `total_cost` (numeric generated), `technician_id` (uuid, FK), `checkout_status` (text), `product_id` (uuid, FK). | `JobDetailPage.tsx`, `JobMaterialsCard.tsx`, `MaterialReconciliationModal.tsx`, `JobDetailScreen.tsx`, `UpdateWorkScreen.tsx`. | SELECT, INSERT, UPDATE, DELETE |
| `public.job_types` | `id` (uuid, PK), `title` (text), `customer_charge_amount` (numeric), `technician_incentive` (numeric), `is_active` (boolean), `created_at` (timestamptz). | `JobTypesPage.tsx`, `ServiceCatalogCard.tsx`, `CreateJobPage.tsx`, `JobDetailPage.tsx`, `UpdateWorkScreen.tsx`. | SELECT, INSERT, UPDATE, DELETE |
| `public.onsite_visits` | `id` (uuid, PK), `job_id` (uuid, FK cascade), `technician_id` (uuid, FK), `arrival_drive_file_id` (text), `arrival_time` (timestamptz), `arrival_gps_lat` (numeric), `arrival_gps_lng` (numeric), `departure_drive_file_id` (text), `departure_time` (timestamptz), `departure_gps_lat` (numeric), `departure_gps_lng` (numeric). | `JobDetailPage.tsx`, `OnsiteDetailsCard.tsx`, `OnsiteVisitScreen.tsx`. | SELECT, INSERT, UPDATE |

---

### Stored Database Functions (RPCs)

1. `public.generate_job_code()`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Returns:** `text`.
   - **Logic:** Increments `public.job_code_seq` and formats prefix `DS-YYYY-XXXX` (Note: formerly `RS-YYYY-XXXX`).
   - **Callers:** Web `CreateJobPage.tsx:166`, Mobile `JobAssignmentScreen.tsx:63`.

2. `public.get_job_status_counts(p_technician_id uuid DEFAULT NULL)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Returns:** `jsonb` (`{ total, urgent, counts: { Received, "In Progress", ... } }`).
   - **Logic:** Aggregates status counts across all jobs or filters to `p_technician_id` via `job_technicians`.
   - **Callers:** Web `JobsPage.tsx:69`, Mobile `JobListScreen.tsx:38`, `MyJobsScreen.tsx:46`, `AdminJobsScreen.tsx:40`.

3. `public.complete_job_materials(p_job_id uuid, p_materials jsonb, p_work_notes text, p_technician_id uuid)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Logic:** Atomically loops through materials, sets `used_qty`, computes `remaining_qty`, increments inventory stock for unused parts, updates `jobs.status = 'Completed'`, and records `completed_at = now()`.
   - **Callers:** Web `MaterialReconciliationModal.tsx:76`, Mobile `UpdateWorkScreen.tsx` (via `MaterialUsageModal`).

---

### Supabase Edge Functions

1. `supabase/functions/notify-on-job-created/index.ts`
   - **Trigger:** Webhook on `INSERT` to table `jobs`.
   - **Purpose:** Dispatches Expo Push Notifications to assigned technicians (`technician_id` and additional technicians in `job_technicians`). Sends WhatsApp confirmation message to customer.
   - **Authentication:** Validates webhook signature (`x-webhook-secret`), bearer service role key, or valid JWT.
   - **Side Effects:** Calls Expo Push Notification API and Twilio/WhatsApp API; logs record to `public.notifications`.

---

## 6. Module Findings & Technical Debt Log (Jobs)

| ID | File / Location | Severity | Category | Description |
|---|---|---|---|---|
| **F-JOB-01** | `supabase/migrations/20260909143000_rename_job_code_prefix_to_ds.sql:24` | **HIGH** | Spec Divergence | `GEMINI.md` mandates that all jobs use the prefix `RS` (`RS-YYYY-XXXX`). Migration `20260909143000` renamed existing jobs and replaced `generate_job_code()` to output `DS-YYYY-XXXX`. |
| **F-JOB-02** | `admin-panel/src/components/jobs/detail/JobInfoCard.tsx:83` | **MEDIUM** | Branding Violation | Hardcoded legacy branding: `at Digital Solution.` used in WhatsApp customer message generator. |
| **F-JOB-03** | `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx:128` | **MEDIUM** | Branding Violation | Hardcoded legacy branding: `Please visit Digital Solution with your receipt.` in WhatsApp message generator. |
| **F-JOB-04** | `admin-panel/src/components/jobs/detail/JobBillingCard.tsx:229-245` | **HIGH** | Single-RPC Violation | Invoice creation uses `create_invoice` RPC, but invoice update bypasses stored procedures, executing direct `UPDATE` on `public.invoices` and `DELETE` on `public.invoice_items`. |
| **F-JOB-05** | `RepairShopApp/src/types/job.ts:1` vs `admin-panel/src/app/(admin)/jobs/page.tsx:77-78` | **MEDIUM** | Schema Drift | Mobile `JobStatus` type union only defines `'Received' \| 'In Progress' \| 'Waiting for Materials' \| 'Completed'`, whereas web admin and DB define and filter `'Delivered'` and `'Cancelled'`. |
| **F-JOB-06** | `packages/shared/src/jobCardTemplate.ts:75-83` | **LOW** | Config Hardcoding | Default company header and terms of service in the shared job card template are hardcoded with legacy company name and address rather than pulled from application settings. |
| **F-JOB-07** | `RepairShopApp/src/screens/technician/MyJobsScreen.tsx:46` | **MEDIUM** | Fallback Dependency | If the database was not migrated to `20260906163500`, calling `get_job_status_counts` with `{ p_technician_id }` fails and falls back to 7 parallel queries on every screen focus. |
