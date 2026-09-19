# Module 06: Staff Administration, Customer CRM & Authentication

**Module:** Identity Management, Role-Based Access Control (RBAC), Staff Lifecycle, Customer Directory, Financial Ledgers & Security Boundaries  
**Surfaces Covered:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Tier (`packages/shared`), Database & Edge Functions (`supabase`)  
**Status:** Audit Complete — Read-and-Document Only

---

## 1. Module Overview & Lifecycle Map

The **Staff, Customers & Authentication** module secures identity and access across RepairShop. It integrates Supabase Auth with PostgreSQL `users` profiles, enforces strict role routing (`admin`, `receptionist`, `technician`), manages staff activation/deactivation via Edge Functions, blocks inactive users at runtime, tracks customer repair and retail purchase histories, normalizes Indian phone numbers, and maintains double-entry customer financial ledgers.

```text
[Staff Onboarding]
       │
       ▼
[Web Admin: StaffPage] ──Calls Edge Function──► [admin-create-user]
                                                     │ (Service Role Secret)
                                                     ├── Provisions Supabase Auth User
                                                     ├── Inserts [public.users] (role, is_active=true)
                                                     └── Sets default [public.staff_rates]
       │
       ▼
[Authentication & Session Lifecycle]
       │
       ├── Web / Mobile Login ──────► Supabase Auth (email / password)
       │                              │
       │                              ▼
       └── Identity Validation ─────► Queries [public.users] (WHERE id = auth.uid())
                                      │
                                      ├── is_active == false ──► Routes to [InactiveUserScreen] (BLOCKED)
                                      ├── role == 'admin'    ──► Routes to [AdminStack]
                                      ├── role == 'receptionist'► Routes to [ReceptionistStack]
                                      └── role == 'technician'─► Routes to [TechnicianStack]
       │
       ▼
[Customer CRM & Directory]
       │
       ├── Intake / Search ─────────► RPC: [public.search_customers_v2] (Fuzzy name / clean phone)
       │                            └── RPC: [public.find_or_create_customer]
       ▼
[Customer Financial Ledger]
       │
       ├── Debit Transactions ──────► Invoices generated (Job & Retail Counter Sales)
       ├── Credit Transactions ─────► Payments recorded via [public.record_payment]
       └── Ledger Inspection ───────► Running balance computed in [public.customer_ledgers]
```

---

## 2. Web Admin Panel (`admin-panel`)

### `admin-panel/src/app/(admin)/staff/page.tsx`
- **Purpose:** Primary staff management workspace for administrators to view all employees, filter by role/status, provision new staff accounts, toggle active/inactive access, and delete staff.
- **Key Exports:**
  - `default function StaffPage()`: Staff management console.
- **Inputs & Outputs:**
  - Props: None (App Router Page).
  - Output: Paginated staff table (Name, Role, Email, Phone, Status badge, Creation Date, Action triggers for Edit, Activate/Deactivate, Delete, and Attendance history links).
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`PageHeader`, `SearchFilterBar`, `Card`, `Badge`, `Button`, `Select`, `DataTableSkeleton`, `EmptyState`, `ConfirmationModal`, `Pagination`), `@/components/staff/AddStaffModal`, `@/utils/formatDate`, `@/lib/edgeFunctions`.
  - External: `@repairshop/shared` (`User`, `useDebounceValue`), `lucide-react`.
  - Database: Queries `users`. Calls RPC `public.admin_manage_staff_status`. Calls Edge Functions `admin-create-user` and `admin-delete-user`.
- **Side Effects:**
  - Toggles employee login access via RPC `admin_manage_staff_status`.
  - Hard-deletes users through server-side Edge Function.
- **Callers:**
  - Next.js route: `/staff`.
- **Observations / Debt:**
  - Destructive Safety: Staff deactivation and deletion require explicit confirmation via `ConfirmationModal`.

---

### `admin-panel/src/app/(admin)/customers/page.tsx`
- **Purpose:** Centralized Customer Relationship Management (CRM) directory. Displays total customer count, lifetime repair jobs, retail purchase frequency, running balance, and customer financial ledgers.
- **Key Exports:**
  - `default function CustomersPage()`: CRM dashboard component.
- **Inputs & Outputs:**
  - Props: None.
  - Output: Metric summary cards, debounced search bar, customer table with detail drawer showing lifetime repair jobs, counter sales, ledger history, and audit logs (`CustomerAuditLog`).
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`PageHeader`, `StatCard`, `Card`, `SearchFilterBar`, `Pagination`, `DataTableSkeleton`, `Button`, `Input`, `Textarea`, `Badge`, `Modal`, `EmptyState`, `ErrorState`), `@/components/customers/CustomerLedgerTab`, `@/utils/formatDate`.
  - External: `@tanstack/react-query`, `@repairshop/shared` (`Customer`, `CustomerAuditLog`, `formatCurrency`, `useDebounceValue`), `lucide-react`, `next/dynamic`.
  - Database: Calls RPC `public.search_customers_v2`. Queries `customers`, `jobs`, `invoices`, `customer_audit_log`.
- **Callers:**
  - Next.js route: `/customers`.
- **Observations / Debt:**
  - Clean Server Search: Backed by `search_customers_v2` RPC which cleans non-numeric characters from contact numbers before matching, enabling instant phone lookup regardless of dashes, spaces, or country code formatting.

---

### `admin-panel/src/context/AuthContext.tsx`
- **Purpose:** Client-side authentication provider for the Web Admin panel. Subscribes to Supabase Auth state changes, reads profile from `public.users`, and enforces administrative access guards.
- **Key Exports:**
  - `export function AuthProvider({ children })`: Context provider.
  - `export function useAuth()`: Hook returning `{ user, profile, role, isLoading, signOut }`.
- **Side Effects:**
  - Listens to `supabase.auth.onAuthStateChange`.
  - Redirects unauthenticated or non-admin users away from administrative routes.

---

## 3. Mobile Application (`RepairShopApp`)

### `RepairShopApp/src/navigation/RootNavigator.tsx`
- **Purpose:** Primary application gateway and role-based router. Dictates which navigation stack is rendered based on authentication state, account activation status, and role assignment.
- **Key Exports:**
  - `default function RootNavigator()`: Root navigation container.
- **Inputs & Outputs:**
  - Props: None.
  - Output: Conditionally mounts one of five terminal stacks:
    - `isPasswordRecovery` -> `ResetPasswordScreen`
    - `!session` -> `LoginScreen`
    - `!isActive` -> `InactiveUserScreen` (Account blocked)
    - `role === 'admin'` -> `AdminStack`
    - `role === 'receptionist'` -> `ReceptionistStack`
    - `role === 'technician'` -> `TechnicianStack`
- **Dependencies:**
  - Internal: `@/context/AuthContext`, `@/hooks/usePushNotifications`, `@/screens/auth/*`, `@/screens/shared/*`, `@/navigation/*`.
  - External: `@react-navigation/native`, `@react-navigation/native-stack`.
- **Observations / Debt:**
  - Robust Role Boundary: Fulfills `GEMINI.md` mandate that role routing cannot be bypassed client-side. Inactive staff are immediately trapped in `InactiveUserScreen` even if an active session token exists.

---

### `RepairShopApp/src/screens/admin/AdminCreateStaffScreen.tsx`
- **Purpose:** Mobile administrative workflow for registering new technicians and receptionists directly from an owner's smartphone.
- **Key Exports:**
  - `default function AdminCreateStaffScreen()`: Form component.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/ToastContext`, `@/tokens`, `@/components/common/AppHeader`.
  - External: `lucide-react-native`.
  - Database: Calls Edge Function `admin-create-user`.

---

### `RepairShopApp/src/screens/receptionist/CustomersScreen.tsx`
- **Purpose:** Mobile customer directory and intake tool for receptionists. Enables fast customer lookup by name or phone during in-person workshop check-in.
- **Key Exports:**
  - `default function CustomersScreen()`: Customer list screen.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/tokens`, `@/components/common/*` (`AppHeader`, `EmptyState`, `SkeletonList`).
  - External: `@repairshop/shared` (`Customer`, `createWhatsAppUrl`, `formatCurrency`), `lucide-react-native`.
  - Database: Calls RPC `public.search_customers_v2`.

---

### `RepairShopApp/src/screens/shared/ProfileScreen.tsx`
- **Purpose:** User profile inspection and credential management screen for all staff roles. Allows users to view their assigned role, update phone contact, and upload profile pictures.
- **Key Exports:**
  - `default function ProfileScreen()`: Profile screen.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/utils/compressImage`, `@/tokens`.
  - External: `expo-image-picker`, `expo-image`, `lucide-react-native`.
  - Database: Updates `public.users.phone` and `avatar_url`. Calls Edge Function `upload-avatar`.

---

## 4. Shared Utilities & Domain Tier (`packages/shared`)

### `packages/shared/src/phone.ts`
- **Purpose:** Comprehensive phone number normalization and WhatsApp URL generation engine tailored to the Indian telecom numbering plan.
- **Key Exports:**
  - `export function validateAndNormalizeIndianPhone(input: string): { isValid: boolean; normalized: string; error?: string }`:
    - Strips leading `0`, `+91`, spaces, hyphens, and parentheses.
    - Validates 10-digit format starting with digits `6`, `7`, `8`, or `9`.
    - Returns standardized 10-digit number.
  - `export function createWhatsAppUrl(phone: string, message: string): string`:
    - Normalizes phone with country code `91` and generates URL-encoded WhatsApp link (`https://wa.me/91XXXXXXXXXX?text=...`).
- **Callers:**
  - Used in all customer forms (`CreateJobPage`, `CustomerIntakeScreen`, `NewSaleScreen`, `PendingPaymentsPage`).

---

## 5. Database Schema, RPCs & Edge Functions (`supabase`)

### Database Tables (`public`)

| Table Name | Key Columns & Types | Referenced By | Permitted Operations |
|---|---|---|---|
| `public.users` | `id` (uuid, PK, matches auth.users.id), `name` (text), `email` (text, UNIQUE), `phone` (text), `role` (text: 'admin'/'receptionist'/'technician'), `is_active` (boolean), `avatar_url` (text), `expo_push_token` (text), `last_login_at` (timestamptz), `created_at` (timestamptz). | All screens, `RootNavigator.tsx`, AuthContext. | SELECT (All authenticated), UPDATE (Own row or Admin) |
| `public.customers` | `id` (uuid, PK), `name` (text), `phone` (text), `phone_clean` (text, generated), `email` (text), `address` (text), `gstin` (text), `notes` (text), `created_by` (uuid, FK users), `created_at` (timestamptz). | `CustomersPage.tsx`, `CreateJobPage.tsx`, `CreateSalePage.tsx`. | SELECT, INSERT, UPDATE |
| `public.customer_ledgers` | `id` (uuid, PK), `customer_id` (uuid, FK customers), `transaction_type` (text: 'invoice'/'payment'/'credit_note'), `reference_id` (uuid), `reference_code` (text), `debit` (numeric), `credit` (numeric), `running_balance` (numeric), `created_at` (timestamptz). | `CustomerLedgerTab.tsx`, `record_payment`. | SELECT, INSERT |

---

### Stored Database Functions (RPCs)

1. `public.search_customers_v2(p_query text, p_limit int, p_offset int)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`, `STABLE`.
   - **Returns:** Table of matched customers with attached job and sales counts.
   - **Logic:** Matches customer name via `ILIKE` or clean numeric phone via `phone_clean LIKE %...%`.
   - **Callers:** Web `CustomersPage.tsx`, Mobile `CustomersScreen.tsx`.

2. `public.find_or_create_customer(p_name text, p_phone text, p_email text, p_address text, p_gstin text)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Returns:** `uuid` of existing or newly inserted customer.
   - **Callers:** `CreateJobPage.tsx`, `CreateSalePage.tsx`.

3. `public.admin_manage_staff_status(target_user_id uuid, new_status boolean)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Logic:** Verifies caller has `role = 'admin'`, updates `users.is_active = new_status`, and terminates open user sessions if deactivated.
   - **Callers:** `StaffPage.tsx:100`.

---

### Supabase Edge Functions

1. `supabase/functions/admin-create-user/index.ts`
   - **Trigger:** Authenticated HTTP POST from Web Admin or Mobile Admin.
   - **Purpose:** Securely creates a new Supabase Auth user with password using the `SUPABASE_SERVICE_ROLE_KEY`. Inserts matching row into `public.users` and initializes baseline row in `public.staff_rates`.
   - **Authentication:** Admin role check.

2. `supabase/functions/admin-delete-user/index.ts`
   - **Trigger:** Authenticated HTTP POST from Web Admin.
   - **Purpose:** Safely detaches foreign keys, archives user records, and deletes Auth user from Supabase Auth service.

3. `supabase/functions/upload-avatar/index.ts`
   - **Trigger:** Direct upload from `ProfileScreen.tsx`.
   - **Purpose:** Compresses and uploads user avatar images to storage bucket `avatars`.

---

## 6. Module Findings & Technical Debt Log (Staff & CRM)

| ID | File / Location | Severity | Category | Description |
|---|---|---|---|---|
| **F-STF-01** | `RepairShopApp/src/screens/shared/ProfileScreen.tsx:95` | **MEDIUM** | Storage Bucket Public Access | The `avatars` bucket is configured as public in local config, allowing unauthenticated image reads. While common for profile pictures, avatars should have controlled signed URLs or public cache headers explicitly documented. |
| **F-STF-02** | `supabase/functions/admin-delete-user/index.ts:45` | **HIGH** | Referential Integrity Cascade | Deleting a staff user who has historical attendance, salary records, or created invoices requires careful soft-deletion. Force-deleting an auth user can cause foreign key violations or leave orphaned rows if not soft-deleted. |
| **F-STF-03** | `packages/shared/src/phone.ts:18` | **LOW** | Landline Formatting | Phone normalization strictly requires 10-digit mobile numbers starting with 6-9. Landlines with STD codes or toll-free numbers are flagged as invalid, which can hinder corporate customer intake. |
| **F-STF-04** | `admin-panel/src/app/(admin)/customers/page.tsx:83-99` | **LOW** | Metric Aggregation | Global directory stats execute three parallel `head: true` count queries on `customers`, `jobs`, and `invoices` on every page mount rather than reading from a pre-aggregated database view. |
| **F-STF-05** | `RepairShopApp/src/screens/auth/LoginScreen.tsx` | **LOW** | Offline State Handling | If staff launch the mobile app without internet connectivity, the login screen displays a generic network error rather than indicating that offline cached credentials cannot be validated. |
