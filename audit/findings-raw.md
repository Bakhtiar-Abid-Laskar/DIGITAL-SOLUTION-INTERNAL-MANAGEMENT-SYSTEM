# Raw Audit Findings — RepairShopApp Monorepo

**Audited Systems:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Libraries (`packages/shared`), Supabase Database & 23 Edge Functions  
**Audit Standard:** Gravitas Cognitive Reliability Protocol  
**Audit Date:** 2026-10-26  

---

## 1. Security & Authentication Findings (SEC / RLS)

### Finding SEC-001: Public Anon Key Authorizes Administrative Notification Edge Functions
- **Severity**: CRITICAL
- **Location**: [`supabase/functions/notify-on-status-change/index.ts:27-28`](file:///d:/Digital%20Solution/supabase/functions/notify-on-status-change/index.ts#L27-L28) and [`supabase/functions/notify-on-job-created/index.ts:27-28`](file:///d:/Digital%20Solution/supabase/functions/notify-on-job-created/index.ts#L27-L28)
- **Evidence**:
  ```ts
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  ...
  if (token && anonKey && token === anonKey) {
    isAuthorized = true
  }
  ```
- **Why it's a problem**: The public anon key (`EXPO_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) is embedded in client bundles and publicly readable by design. By granting authorization when `token === anonKey`, anyone on the public internet can craft POST requests to these edge functions, spoofing arbitrary job status changes, spamming customers via WhatsApp, and triggering automated staff push notifications using the backend's `SUPABASE_SERVICE_ROLE_KEY`.
- **How to reproduce**:
  Send a POST request to `https://<project-ref>.supabase.co/functions/v1/notify-on-status-change` with header `Authorization: Bearer <public_anon_key>` and a custom payload. The edge function logs `Received payload:` and processes the request rather than returning 401 Unauthorized.
- **Recommended fix**:
  Remove the `token === anonKey` clause entirely. Require either `webhookSecret && signature === webhookSecret` (for database webhooks) or verify a valid authenticated user JWT whose role is `admin` or `receptionist`.
- **Effort**: S
- **Module**: Notifications / Security

---

### Finding SEC-002: Meta WhatsApp Cloud API Inbound Webhook Signature Verification Bypass
- **Severity**: HIGH
- **Location**: [`supabase/functions/whatsapp-webhook/index.ts:28`](file:///d:/Digital%20Solution/supabase/functions/whatsapp-webhook/index.ts#L28)
- **Evidence**:
  ```ts
  async function verifyMetaSignature(
    rawBody: string,
    signatureHeader: string | null,
    appSecret: string
  ): Promise<boolean> {
    if (!signatureHeader || !appSecret) return true; // If secret not set yet, proceed in dev mode
  ```
- **Why it's a problem**: If `WHATSAPP_APP_SECRET` is not set, or if an attacker sends an inbound webhook POST request omitting the `X-Hub-Signature-256` header entirely, `!signatureHeader` evaluates to `true`. The signature verification check returns `true`, allowing unauthenticated attackers to forge delivery status receipts (`delivered`, `read`, `failed`) and inject fraudulent incoming customer messages into `public.whatsapp_messages` and `public.whatsapp_logs`.
- **How to reproduce**:
  Send a POST request to `/functions/v1/whatsapp-webhook` without an `X-Hub-Signature-256` header containing a JSON payload with `entry[0].changes[0].value.messages`. The webhook accepts and inserts the message.
- **Recommended fix**:
  Reject requests immediately if `!signatureHeader || !appSecret`. In production, signature validation must fail closed (`return false` when credentials or headers are missing).
- **Effort**: S
- **Module**: WhatsApp / Security

---

### Finding SEC-003: Missing Server-Side Next.js Edge Middleware for Route Access Control
- **Severity**: HIGH
- **Location**: [`admin-panel`](file:///d:/Digital%20Solution/admin-panel) (No `middleware.ts` exists)
- **Evidence**:
  Neither `admin-panel/src/middleware.ts` nor `admin-panel/middleware.ts` exists. Route protection is handled strictly on the client side in [`AdminLayout.tsx:11-64`](file:///d:/Digital%20Solution/admin-panel/src/components/layout/AdminLayout.tsx#L11-L64) using React state (`role`, `isActive`, `isLoading`).
- **Why it's a problem**: Next.js App Router renders and transmits page chunks to the client before the React client runtime boots and checks `useAuth()`. An unauthorized user or crawler making a direct HTTP GET request to `/reports`, `/salary`, or `/expenditure` receives the HTML/JS bundle without an immediate server-side HTTP 307 redirect or HTTP 403 Forbidden header.
- **How to reproduce**:
  Disable JavaScript in the browser and navigate directly to `http://localhost:3000/reports`. The page shell loads without server-side middleware intervention.
- **Recommended fix**:
  Implement Next.js Edge Middleware (`admin-panel/src/middleware.ts`) that inspects the Supabase session cookie (`sb-<ref>-auth-token`), validates the user's role on protected paths (`/staff/*`, `/reports/*`, `/salary/*`, `/expenditure/*`, `/settings/*`), and issues server-side redirects to `/login` or returns 403.
- **Effort**: M
- **Module**: Web Admin / Security

---

### Finding SEC-004: Missing Page-Level Role Guards on Sensitive Web Pages
- **Severity**: HIGH
- **Location**: [`admin-panel/src/app/(admin)/reports/page.tsx`](file:///d:/Digital%20Solution/admin-panel/src/app/(admin)/reports/page.tsx) and [`admin-panel/src/app/(admin)/expenditure/page.tsx`](file:///d:/Digital%20Solution/admin-panel/src/app/(admin)/expenditure/page.tsx)
- **Evidence**:
  In [`Sidebar.tsx:100-105`](file:///d:/Digital%20Solution/admin-panel/src/components/layout/Sidebar.tsx#L100-L105):
  ```ts
  if (profile?.role === 'receptionist') {
    const adminOnlyPrefixes = ['/staff', '/reports', '/salary', '/expenditure', '/settings'];
    return !adminOnlyPrefixes.some(prefix => item.href.startsWith(prefix));
  }
  ```
  However, [`reports/page.tsx`](file:///d:/Digital%20Solution/admin-panel/src/app/(admin)/reports/page.tsx) and [`expenditure/page.tsx`](file:///d:/Digital%20Solution/admin-panel/src/app/(admin)/expenditure/page.tsx) contain no check for `role === 'admin'`. Because `AdminLayout` allows both `admin` and `receptionist`, a receptionist can directly type `/reports` or `/expenditure` in the address bar.
- **Why it's a problem**:
  - On `/reports`, a receptionist can view business revenue charts, labour vs parts breakdown, and customer job histories.
  - On `/expenditure`, a receptionist can view the expenditure tracking UI and summary cards.
- **How to reproduce**:
  Log in as a receptionist, then enter `/reports` into the browser URL bar. The page renders revenue totals and technician performance metrics.
- **Recommended fix**:
  Add an explicit role check at the top of both pages:
  ```tsx
  if (role !== 'admin') {
    return <AccessDenied message="Only administrators have permission to access financial reports." />;
  }
  ```
- **Effort**: S
- **Module**: Web Admin / Financial Privacy

---

### Finding SEC-005: Public Read Access on `purchase-invoices` Storage Bucket
- **Severity**: HIGH
- **Location**: [`supabase/migrations/20260821300000_inventory_purchase_intake_module.sql:109-120`](file:///d:/Digital%20Solution/supabase/migrations/20260821300000_inventory_purchase_intake_module.sql#L109-L120)
- **Evidence**:
  ```sql
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('purchase-invoices', 'purchase-invoices', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  CREATE POLICY "purchase_invoices_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'purchase-invoices');
  ```
- **Why it's a problem**: The `purchase-invoices` bucket stores wholesale supplier bills, purchase receipts, and distributor payment vouchers. Marking the bucket `public: true` and applying an unrestricted `SELECT` policy permits anyone who discovers the file URL to download confidential supplier pricing, tax invoices, and vendor contact info.
- **How to reproduce**:
  Fetch any uploaded purchase invoice image URL via an unauthenticated browser incognito tab or `curl`. The file is returned with HTTP 200 without authentication.
- **Recommended fix**:
  Set `public = false` on `purchase-invoices` bucket. Update the SELECT policy to `USING (bucket_id = 'purchase-invoices' AND (SELECT public.is_admin()))`, and access files via short-lived signed URLs.
- **Effort**: S
- **Module**: Inventory / Storage Security

---

## 2. Database & Schema Findings (DB)

### Finding DB-001: Schema Drift Between Supabase Migrations and TypeScript Definitions
- **Severity**: MEDIUM
- **Location**: [`types.ts:1-2343`](file:///d:/Digital%20Solution/types.ts)
- **Evidence**:
  `types.ts` defines only 13 database functions under `graphql_public` and `public.Functions`, whereas the 54 migration files define over 35 active RPCs (e.g. `search_customers_v2`, `claim_invoice_serials`, `assign_job_technicians`, `record_installment_payment`, `deposit_customer_advance`, `complete_job_materials`, `get_job_status_counts`).
- **Why it's a problem**: Frontend and edge code calling `.rpc('search_customers_v2')` or `.rpc('claim_invoice_serials')` cannot use strictly typed RPC arguments or return types from generated definitions, forcing developers to use `(supabase as any).rpc(...)` or untyped response shapes.
- **How to reproduce**:
  Inspect `types.ts` under `Database['public']['Functions']`; `search_customers_v2` is absent.
- **Recommended fix**:
  Run `npx supabase gen types typescript --project-id <ref> > types.ts` against the migrated database instance to regenerate complete typed definitions for all 35+ RPCs.
- **Effort**: S
- **Module**: Database / TypeScript

---

### Finding DB-002: Missing Uniqueness Constraint on Customer Phone Number
- **Severity**: MEDIUM
- **Location**: [`supabase/migrations/20260820200000_customers_module.sql:10-22`](file:///d:/Digital%20Solution/supabase/migrations/20260820200000_customers_module.sql#L10-L22)
- **Evidence**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    ...
  );
  CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
  ```
- **Why it's a problem**: While an index exists on `phone`, there is no `UNIQUE` constraint or unique index on `customers(phone)`. Concurrent customer creations during intake (`find_or_create_customer`) or point-of-sale checkouts can insert duplicate customer records with identical phone numbers, fragmenting customer repair history and customer ledger balances.
- **How to reproduce**:
  Execute two simultaneous `find_or_create_customer` calls with the same phone number. Two distinct customer UUIDs can be created.
- **Recommended fix**:
  Create a unique index `CREATE UNIQUE INDEX idx_customers_phone_unique ON public.customers (regexp_replace(phone, '[^0-9]', '', 'g'));` and rely on `ON CONFLICT` in `find_or_create_customer`.
- **Effort**: S
- **Module**: Customers CRM

---

### Finding DB-003: Unindexed Foreign Keys on High-Volume Junction Tables
- **Severity**: MEDIUM
- **Location**: [`supabase/migrations/20260819000000_baseline_schema.sql`](file:///d:/Digital%20Solution/supabase/migrations/20260819000000_baseline_schema.sql)
- **Evidence**:
  Foreign keys on `invoice_items.product_id` and `sale_items.product_id` lack dedicated B-tree indexes.
- **Why it's a problem**: When inventory products are queried for transaction history or deleted/updated, PostgreSQL must execute sequential table scans on `invoice_items` and `sale_items`, degrading performance as sales volume expands.
- **How to reproduce**:
  Inspect `pg_stat_user_tables` or query execution plans on `SELECT * FROM invoice_items WHERE product_id = '...'`.
- **Recommended fix**:
  Add `CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON public.invoice_items (product_id);` and `CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items (product_id);`.
- **Effort**: S
- **Module**: Performance / Database

---

## 3. Inventory, Stock & Material Tracking Findings (INV / MAT)

### Finding INV-001: Concurrency Race Condition in Serial Number Claiming
- **Severity**: HIGH
- **Location**: [`supabase/migrations/20260906180000_serial_number_inventory_tracking.sql:120-155`](file:///d:/Digital%20Solution/supabase/migrations/20260906180000_serial_number_inventory_tracking.sql#L120-L155)
- **Evidence**:
  In `claim_invoice_serials`:
  ```sql
  SELECT id INTO v_serial_id
  FROM public.inventory_serial_numbers
  WHERE serial_number = v_serial
    AND product_id = p_product_id
    AND status = 'in_stock';
  ```
  The select query does not use `FOR UPDATE` or `FOR UPDATE SKIP LOCKED`.
- **Why it's a problem**: If two cashiers sell the same product at the same moment and enter the same serial number, both transactions can read `status = 'in_stock'` simultaneously before either transaction's `UPDATE` commits. One sale can overwrite the serial link of the other sale or trigger an unhandled conflict.
- **How to reproduce**:
  Issue two concurrent RPC calls to `claim_invoice_serials` referencing the same serial number.
- **Recommended fix**:
  Append `FOR UPDATE` to the select query:
  ```sql
  SELECT id INTO v_serial_id
  FROM public.inventory_serial_numbers
  WHERE serial_number = v_serial
    AND product_id = p_product_id
    AND status = 'in_stock'
  FOR UPDATE;
  ```
- **Effort**: S
- **Module**: Inventory / Serial Tracking

---

### Finding MAT-001: Material Return Reconciliation Lacks Stock Quantity Lock
- **Severity**: MEDIUM
- **Location**: [`supabase/migrations/20260820100000_allocated_materials_lifecycle.sql:180-210`](file:///d:/Digital%20Solution/supabase/migrations/20260820100000_allocated_materials_lifecycle.sql#L180-L210)
- **Evidence**:
  In `return_allocated_material`:
  ```sql
  UPDATE public.products
  SET stock_quantity = stock_quantity + v_return_qty
  WHERE id = v_product_id;
  ```
- **Why it's a problem**: While atomic addition (`stock_quantity + v_return_qty`) prevents lost updates in Postgres, there is no corresponding validation that `v_return_qty <= allocated_qty - used_qty`. A technician or UI bug submitting a return quantity exceeding what was originally allotted inflates product inventory above the true physical stock.
- **How to reproduce**:
  Call `return_allocated_material` with `p_quantity = 999` on an allotment of 1 unit.
- **Recommended fix**:
  Add an explicit guard:
  ```sql
  IF v_return_qty > (v_allotment.quantity - COALESCE(v_allotment.used_quantity, 0) - COALESCE(v_allotment.returned_quantity, 0)) THEN
    RAISE EXCEPTION 'Return quantity exceeds available unreturned allotment.';
  END IF;
  ```
- **Effort**: S
- **Module**: Material Tracking

---

## 4. Attendance, Mobile Hardware & File Storage Findings (ATT / MOB)

### Finding ATT-001: Check-in / Check-out Photo Filename Collision in Google Drive
- **Severity**: MEDIUM
- **Location**: [`supabase/functions/upload-attendance-selfie/index.ts:64`](file:///d:/Digital%20Solution/supabase/functions/upload-attendance-selfie/index.ts#L64)
- **Evidence**:
  ```ts
  const filename = `${sanitizeFilenameSegment(staffName)}_${dd}${monthStr}${yy}.webp`;
  ```
- **Why it's a problem**: The edge function accepts a `type` parameter (`checkin` vs `checkout`), but omits it from `filename`. When a staff member checks in and later checks out on the same date, both photos receive the exact same name (e.g. `John_Doe_261026.webp`). In Google Drive folders, this creates multiple files with identical names, causing ambiguity when inspecting drive logs.
- **How to reproduce**:
  Perform check-in, then perform check-out for the same staff member. Inspect the `STAFF_ATTENDCE_IMG/2026/10` folder; two identical filenames exist.
- **Recommended fix**:
  Include the action type:
  ```ts
  const filename = `${sanitizeFilenameSegment(staffName)}_${type}_${dd}${monthStr}${yy}.webp`;
  ```
- **Effort**: S
- **Module**: Attendance / Google Drive

---

### Finding MOB-001: Android Manifest Requests Unused `RECORD_AUDIO` Permission
- **Severity**: LOW
- **Location**: [`RepairShopApp/app.json:35`](file:///d:/Digital%20Solution/RepairShopApp/app.json#L35)
- **Evidence**:
  ```json
  "permissions": [
    "CAMERA",
    "ACCESS_COARSE_LOCATION",
    "ACCESS_FINE_LOCATION",
    "POST_NOTIFICATIONS",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_FINE_LOCATION"
  ]
  ```
- **Why it's a problem**: The app does not record audio or voice notes anywhere. Declaring `RECORD_AUDIO` triggers unnecessary privacy warnings on Android, raises scrutiny during Google Play Store privacy reviews, and risks Play Store rejection under Google Play's User Data policy.
- **How to reproduce**:
  Install the built APK on Android. The OS permissions screen lists "Microphone" as a requested permission.
- **Recommended fix**:
  Remove `"android.permission.RECORD_AUDIO"` from `RepairShopApp/app.json`.
- **Effort**: S
- **Module**: Mobile App Config

---

### Finding MOB-002: Missing Unit Test Configuration in Mobile App Package
- **Severity**: MEDIUM
- **Location**: [`RepairShopApp/package.json:60`](file:///d:/Digital%20Solution/RepairShopApp/package.json#L60)
- **Evidence**:
  ```json
  "scripts": {
    "build": "npx expo export --platform web",
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "eslint src && tsc --noEmit",
    "lint:fix": "eslint src --fix",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
  ```
- **Why it's a problem**: The mobile app codebase has no automated unit or integration test runner configured. While shared code is tested via `admin-panel/src`, mobile-specific components, state reducers, and navigation stacks are completely untested by automated CI pipelines.
- **How to reproduce**:
  Run `npm test` inside `RepairShopApp`. The process exits with code 1: `"Error: no test specified"`.
- **Recommended fix**:
  Configure Jest with `jest-expo` or React Native Testing Library to run unit tests on mobile helpers, formatters, and reducers.
- **Effort**: M
- **Module**: Mobile QA / Testing

---

## 5. Sales, Billing & Payments Findings (SAL-S / BIL)

### Finding BIL-001: Invoice Creation Allows Zero or Negative Total When Discount Exceeds Subtotal
- **Severity**: MEDIUM
- **Location**: [`supabase/migrations/20260822100000_itemized_billing_enhancements.sql:120-145`](file:///d:/Digital%20Solution/supabase/migrations/20260822100000_itemized_billing_enhancements.sql#L120-L145)
- **Evidence**:
  ```sql
  v_grand_total := (v_subtotal + v_tax_amount) - COALESCE(p_discount, 0);
  ```
- **Why it's a problem**: If a user inputs a discount greater than `subtotal + tax`, `v_grand_total` computes to a negative number. The database allows negative grand totals because there is no `CHECK (grand_total >= 0)` constraint on `public.invoices`. A negative invoice can distort accounting revenue totals and credit balances.
- **How to reproduce**:
  Create an invoice with subtotal ₹500 and discount ₹1000. `grand_total` is saved as `-500`.
- **Recommended fix**:
  Add `GREATEST(0, (v_subtotal + v_tax_amount) - COALESCE(p_discount, 0))` in the RPC and add a check constraint on `public.invoices`: `ALTER TABLE public.invoices ADD CONSTRAINT chk_invoice_grand_total_positive CHECK (grand_total >= 0);`.
- **Effort**: S
- **Module**: Billing / Financial Integrity

---

## 6. Code Quality, Performance & Maintenance Findings (QUAL / PERF / OPS)

### Finding QUAL-001: Leftover Scratch & Dump Files in Repository Root
- **Severity**: LOW
- **Location**: Monorepo root directory
- **Evidence**:
  Files present in repository root:
  - `admin_queries.txt` (24 KB)
  - `mobile_queries.txt` (32 KB)
  - `mobile_queries_utf8.txt` (16 KB)
  - `admin_tree.txt` (2.7 KB)
  - `mobile_tree.txt` (2.8 KB)
  - `supabase_tree.txt` (4.6 KB)
  - `extract_queries.js` (3 KB)
  - `extract_db_calls.js` (2.8 KB)
  - `temp_inventory.csv` (0 B)
- **Why it's a problem**: Temporary text dumps, query scratch files, and one-off extractor scripts clutter the repository root, increase git repo size, and create confusion for new engineers onboarding to the codebase.
- **How to reproduce**:
  Run `ls -l` at repository root.
- **Recommended fix**:
  Remove leftover `.txt` dumps and scratch extractors, and add `*.txt` query dumps to `.gitignore`.
- **Effort**: S
- **Module**: Repository Hygiene

---

### Finding PERF-001: Unbounded Query on `customer_reviews` and `notifications`
- **Severity**: LOW
- **Location**: [`admin-panel/src/app/(admin)/page.tsx`](file:///d:/Digital%20Solution/admin-panel/src/app/(admin)/page.tsx) and [`RepairShopApp/src/screens/shared/NotificationsScreen.tsx`](file:///d:/Digital%20Solution/RepairShopApp/src/screens/shared/NotificationsScreen.tsx)
- **Evidence**:
  Queries fetch all rows without an explicit `.limit()` or pagination window.
- **Why it's a problem**: As notifications and customer reviews accumulate over months of production operations, fetching unbounded result sets increases payload size, consumes excessive client memory, and degrades initial screen rendering speed.
- **How to reproduce**:
  Inspect network payload when notifications table exceeds 5,000 rows.
- **Recommended fix**:
  Apply standard `.limit(50)` with pagination / infinite scroll.
- **Effort**: S
- **Module**: Performance / Notifications
