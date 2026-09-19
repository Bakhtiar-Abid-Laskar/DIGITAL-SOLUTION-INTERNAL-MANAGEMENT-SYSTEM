# Module 09: System Security, Row Level Security (RLS) & Production Deployment

**Module:** Threat Modeling, PostgreSQL Row Level Security (RLS) Audit, Role Boundaries, Storage Bucket Policies, Edge Function Secrets & Production Deployment Pipeline  
**Surfaces Covered:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Tier (`packages/shared`), Database & Edge Functions (`supabase`)  
**Status:** Audit Complete — Read-and-Document Only

---

## 1. Security Architecture & Threat Model

RepairShop operates under a strict principle of **Zero-Trust Client Access**. In accordance with `GEMINI.md` hard rules:
1. **Client Isolation:** Mobile and Web clients possess only the `anon` public key and access data strictly through PostgreSQL Row Level Security (RLS) and Postgres functions.
2. **Service Role Quarantine:** The `service_role` administrative key is restricted exclusively to Deno Edge Functions through secure environment secret injection. It is never bundled into client JavaScript.
3. **Defense-in-Depth:** UI hiding is explicitly categorized as visual affordance, not security. Unauthorized API requests return zero rows or throw database-level exceptions.

```text
                                  [Public Internet]
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         [Expo Mobile Client]                           [Next.js Admin Panel]
         (EXPO_PUBLIC_ANON_KEY)                         (NEXT_PUBLIC_ANON_KEY)
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          │ (JWT Bearer Token)
                                          ▼
                         [Supabase PostgreSQL Database]
                                          │
                         [Row Level Security (RLS) Engine]
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
   [Technician Context]          [Receptionist Context]          [Admin Context]
   (auth.uid() = Tech ID)        (role = 'receptionist')         (role = 'admin')
   - Only assigned jobs          - All jobs & invoices           - Unrestricted access
   - Only assigned materials     - Cannot see salary/rates       - All financial tables
   - Zero billing access         - Cannot see expenditures       - User management
            │                             │                             │
            └─────────────────────────────┴─────────────────────────────┘
                                          │
                                          ▼
                          [Supabase Edge Functions Tier]
                         (SUPABASE_SERVICE_ROLE_KEY)
   - Privileged operations: user provisioning, salary computation, Google Drive uploads
   - External gateways: Resend email, Meta WhatsApp Cloud API, Expo Push server
```

---

## 2. Row Level Security (RLS) Policy Matrix (Table-by-Table)

| Table Name | RLS Status | Technician Permissions | Receptionist Permissions | Admin Permissions | Unauthenticated (Anon) |
|---|---|---|---|---|---|
| `public.users` | **ENABLED** | SELECT (Active staff only), UPDATE (Own phone/avatar only). | SELECT (Active staff), UPDATE (Own row). | SELECT, INSERT, UPDATE, DELETE (All). | DENIED |
| `public.jobs` | **ENABLED** | SELECT: Only assigned jobs (`technician_id = auth.uid()` or via `job_technicians`). UPDATE: Only `status` and `work_notes` on assigned jobs. | SELECT, INSERT, UPDATE: All jobs. | SELECT, INSERT, UPDATE, DELETE: All jobs. | DENIED |
| `public.job_materials` | **ENABLED** | SELECT, INSERT: Only for assigned jobs. UPDATE: Only `used_qty` and `remaining_qty`. | SELECT, INSERT, UPDATE: All. | Full access. | DENIED |
| `public.attendance` | **ENABLED** | SELECT, INSERT, UPDATE: Own rows only (`user_id = auth.uid()`). | SELECT, INSERT, UPDATE: Own rows only. | Full access (all staff records). | DENIED |
| `public.inventory` | **ENABLED** | SELECT: Active catalog items only. Writes DENIED. | SELECT: All items. Writes via approved RPCs. | Full access. | DENIED |
| `public.invoices` | **ENABLED** | **DENIED** (Zero read/write access). | SELECT, INSERT, UPDATE: All customer invoices. | Full access. | DENIED |
| `public.invoice_items` | **ENABLED** | **DENIED** (Zero access). | SELECT, INSERT, UPDATE: All lines. | Full access. | DENIED |
| `public.salary` | **ENABLED** | **DENIED** (Reads/writes blocked; previews routed via Edge Function). | **DENIED** (Zero access). | Full access. | DENIED |
| `public.staff_rates` | **ENABLED** | **DENIED**. | **DENIED**. | Full access. | DENIED |
| `public.payments` | **ENABLED** | **DENIED**. | INSERT, SELECT: Customer receipts only. | Full access (Salary & Expenditures). | DENIED |
| `public.customers` | **ENABLED** | SELECT: Customers linked to assigned jobs. | Full read/write. | Full access. | DENIED |
| `public.geofence_settings`| **ENABLED** | SELECT: Allowed. Writes DENIED. | SELECT: Allowed. Writes DENIED. | Full access. | DENIED |
| `public.holidays` | **ENABLED** | SELECT: Allowed. Writes DENIED. | SELECT: Allowed. Writes DENIED. | Full access. | DENIED |
| `public.notifications` | **ENABLED** | SELECT, UPDATE: Own notifications only (`recipient_user_id = auth.uid()`). | Own only. | Full access. | DENIED |

---

## 3. Storage Bucket Security Audit

| Bucket Name | Public Access | Upload Policy | Read Policy | File Size Limit |
|---|---|---|---|---|
| `attendance-selfies` | **PRIVATE** | Authenticated staff can upload to own folder path (`{user_id}/*`). | Admin full access; staff can read own uploads. | 5 MB (WebP compressed) |
| `onsite-visits` | **PRIVATE** | Technician can upload only to folder corresponding to assigned `job_id`. | Admin and assigned technician only. | 5 MB |
| `invoices` | **PRIVATE** | Admin and Receptionist can upload invoice receipts. | Admin and Receptionist only. Signed URLs generated for display. | 10 MB |
| `avatars` | **PUBLIC** | Authenticated user can upload to `{user_id}/*`. | Public read access with caching headers. | 2 MB |

---

## 4. Edge Functions Security & Secrets Management

- **Execution Context:** Edge Functions run on Deno deploy isolated workers outside the client browser runtime.
- **Service Role Hygiene:**
  - Zero presence of `SUPABASE_SERVICE_ROLE_KEY` in `admin-panel/.env.local`, `RepairShopApp/.env`, or repository git commits.
  - Secret keys are configured strictly through Supabase CLI or project dashboard secret settings:
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `RESEND_API_KEY`
    - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
    - `GOOGLE_PRIVATE_KEY`
    - `APP_WEBHOOK_SECRET`
- **Webhook Ingress Verification:** Webhooks triggered by database changes validate `x-webhook-secret` or bearer tokens before processing payloads.

---

## 5. Production Deployment Architecture

```text
[Repository Trunk: main]
       │
       ├── Web Deployment (Vercel)
       │       │
       │       ├── Root Directory: admin-panel
       │       ├── Build Command: npm run build (Next.js 16 SSG/SSR)
       │       ├── Environment: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
       │       └── Output File Tracing: Configured in next.config.ts for hybrid monorepo
       │
       ├── Mobile Deployment (Expo EAS Build)
       │       │
       │       ├── Project Root: RepairShopApp
       │       ├── Profiles (eas.json):
       │       │       ├── preview: Standalone Android APK for internal testing
       │       │       └── production: Google Play AAB & iOS App Store IPA
       │       └── Native Config (app.json):
       │               ├── Package: com.repairshop.app
       │               ├── Hardware Permissions: Camera, Location, Push Notifications
       │               └── Target SDK: Android API 35 / iOS 17+
       │
       └── Supabase Infrastructure
               │
               ├── Migrations: supabase/migrations/ (Applied sequentially via Supabase CLI)
               └── Functions: supabase/functions/ (Deployed via supabase functions deploy)
```

---

## 6. System Findings & Technical Debt Log (Security & Deployment)

| ID | File / Location | Severity | Category | Description |
|---|---|---|---|---|
| **F-SEC-01** | `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx` | **LOW** | Client-Side WhatsApp Redirection | WhatsApp messages are launched via universal links (`wa.me`) using prefilled text. If customer changes their contact number before message is dispatched, verification occurs on-device rather than server-verified. |
| **F-SEC-02** | `supabase/functions/upload-attendance-selfie/index.ts:24-36` | **MEDIUM** | Token Renewal Resiliency | Google Service Account private key exchange acquires a new OAuth2 access token on each Edge Function invocation rather than caching the bearer token across its 1-hour validity window. |
| **F-SEC-03** | `admin-panel/src/app/(admin)/jobs/page.tsx:77-78` | **LOW** | Status Filtering Parity | Status tabs on web filter `Delivered` and `Cancelled`, while mobile client type definitions have not yet adopted these additional states. |
| **F-SEC-04** | `admin-panel/next.config.ts:18` | **LOW** | Remote Image Patterns | Remote pattern in Next.js config allows `lh3.googleusercontent.com` and `drive.google.com` wildcard hosts. Restricting to specific bucket origins improves Content Security Policy (CSP) posture. |
