# Phase 1.2 & 1.3: API Endpoints & Backend RPC Inventory

This document details all backend interfaces: **Supabase Edge Functions** (Serverless REST/HTTP), **PostgreSQL RPC Functions** (Client-callable database functions), and **Internal Trigger Functions**.

---

## 1. Supabase Edge Functions (`supabase/functions/`)

All Edge Functions run in a secure Deno runtime and have access to Supabase environment secrets.

| Function Name | Route / Path | Method | Auth / Caller Requirement | Request Body / Inputs | Expected Response | Side Effects | Idempotent |
|---|---|---|---|---|---|---|---|
| **admin-create-user** | `/functions/v1/admin-create-user` | `POST` | Authenticated (`admin` JWT) | `{ email, password, name, phone, role }` | `{ user: { id, email, name, role } }` | Creates Supabase Auth user & inserts row in `public.users` | No |
| **admin-delete-user** | `/functions/v1/admin-delete-user` | `POST` | Authenticated (`admin` JWT) | `{ userId }` | `{ success: true }` | Deletes user from Supabase Auth & cascades `public.users` | Yes |
| **calculate-monthly-salary** | `/functions/v1/calculate-monthly-salary` | `POST` | Authenticated (`admin` JWT) | `{ month: "YYYY-MM" }` | `{ success: true, count, records: [...] }` | Computes attendance, deductions, incentives, bonuses; upserts `salary` table; logs to `payroll_audit_log` | Yes |
| **generate-invoice** | `/functions/v1/generate-invoice` | `POST` | Authenticated (`admin`, `receptionist`) | `InvoiceDoc` (customer, items, totals, `jobId`) | `{ html, totals, driveLink? }` | Compiles HTML invoice with base64 letterhead, uploads to Google Drive, updates `billing.drive_link` | Yes |
| **notify-on-job-created** | `/functions/v1/notify-on-job-created` | `POST` | Webhook (`webhook-signature`) | Supabase Database Webhook Record (`jobs` insert) | `{ success: true }` | Dispatches Expo Push Notification to assigned technician; logs to `notifications` | Yes |
| **notify-on-status-change** | `/functions/v1/notify-on-status-change` | `POST` | Webhook (`webhook-signature`) | Supabase Database Webhook Record (`jobs` update) | `{ success: true }` | Dispatches Push Notifications to Admin & Receptionist; logs to `notifications` | Yes |
| **send-invoice-email** | `/functions/v1/send-invoice-email` | `POST` | Authenticated (`admin`, `receptionist`) | `{ job_id, customer_email, recipient_email? }` | `{ success: true, messageId }` | Sends branded HTML email via Resend API; rate limits 1 email/60s per job; logs to `notifications` | No |
| **export-monthly-data** | `/functions/v1/export-monthly-data` | `POST` | Authenticated (`admin` JWT or pg_cron) | `{ year?, month? }` (defaults to previous month) | `{ success: true, link, filename }` | Builds multi-sheet Excel workbook (Jobs, Sales, Inventory) and uploads to Google Drive; logs to `export_jobs` | Yes |
| **export-attendance-reports**| `/functions/v1/export-attendance-reports` | `POST` | Authenticated (`admin` JWT or pg_cron) | `{ year?, month? }` | `{ success: true, count, links }` | Compiles monthly attendance matrices into Excel sheets; uploads to Google Drive; logs to `export_jobs` | Yes |
| **process-pending-uploads** | `/functions/v1/process-pending-uploads` | `POST` | pg_cron / Service Role | Empty `{}` | `{ processed, successful, failed }` | Drains `pending_uploads` retry queue for failed Google Drive photo/invoice uploads | Yes |
| **upload-attendance-selfie**| `/functions/v1/upload-attendance-selfie` | `POST` | Authenticated (`staff` JWT) | `multipart/form-data`: `staffId`, `attendanceId`, `type`, `image` (WebP) | `{ success: true, driveLink, fileId }` | Uploads selfie WebP to Google Drive; updates `attendance.checkin/checkout_photo_drive_link` | Yes |
| **upload-job-photo** | `/functions/v1/upload-job-photo` | `POST` | Authenticated (`staff` JWT) | `multipart/form-data`: `jobId`, `type`, `image` (WebP) | `{ success: true, driveLink, fileId }` | Uploads onsite/material photo WebP to Google Drive; updates `onsite_visits` | Yes |
| **test-drive-auth** | `/functions/v1/test-drive-auth` | `POST` | Authenticated (`admin` JWT) | Empty `{}` | `{ success: true, email, driveConnected }` | Verifies Google Service Account JWT exchange and Google Drive root folder access | Yes |

---

## 2. Client-Callable Database RPCs (`@supabase/supabase-js .rpc()`)

| RPC Function Name | Security Mode | Grantee Role | Arguments | Return Type | Business Purpose |
|---|---|---|---|---|---|
| `generate_job_code` | `SECURITY DEFINER` | `authenticated` | None | `text` | Server-side sequence generator producing unique `RS-YYYY-XXXX` job numbers without client collision |
| `generate_sale_code` | `SECURITY DEFINER` | `authenticated` | None | `text` | Server-side sequence generator producing unique `SALE-YYYY-XXXX` invoice numbers |
| `update_my_push_token` | `SECURITY DEFINER` | `authenticated` | `new_token: text` | `void` | Securely stores Expo Push Token for the calling user (`auth.uid()`) without granting raw `UPDATE` access to `users` table |
| `get_unique_device_types` | `SECURITY DEFINER` | `authenticated` | None | `TABLE(device_type text)` | Distinct list of historical device categories for autocomplete dropdowns |
| `count_low_stock_items` | `SECURITY DEFINER` | `authenticated` | None | `integer` | Count of inventory items where `quantity <= low_stock_threshold` |
| `get_low_stock_items` | `SECURITY DEFINER` | `authenticated` | None | `SETOF inventory` | Full records of items needing restocking |
| `add_stock` | `SECURITY DEFINER` | `authenticated` (`admin`) | `(item_id, qty, reason)` | `void` | Restocks inventory item and creates audit trail in `inventory_transactions` |
| `create_product_with_opening_stock` | `SECURITY DEFINER` | `authenticated` (`admin`) | Product fields + opening stock | `uuid` | Creates new catalog item and initial ledger transaction atomically |
| `preview_invoice` | `SECURITY DEFINER` | `authenticated` | Items array, discount, tax | `jsonb` | Previews calculated totals without saving |
| `create_invoice` | `SECURITY DEFINER` | `authenticated` | Customer + items payload | `jsonb` | Atomically creates sale, sale items, deducts inventory, and returns created invoice |
| `use_material_allotment` | `SECURITY DEFINER` | `authenticated` (`technician`) | `allotment_id, job_id, qty` | `void` | Moves allotted material into a specific job's materials ledger |
| `return_material_allotment` | `SECURITY DEFINER` | `authenticated` (`technician`) | `allotment_id, qty` | `void` | Returns technician's allotted materials back to warehouse inventory |
| `is_admin`, `is_receptionist`, `is_technician`, `is_staff` | `SECURITY DEFINER` | `authenticated` | None | `boolean` | Role verification predicates evaluated inside RLS policies using cached token context |

---

## 3. Database Trigger Functions (Automated Business Logic)

| Trigger Function Name | Bound Table & Event | Timing | Security Mode | Business Behavior |
|---|---|---|---|---|
| `process_job_material_stock` | `job_materials` (`INSERT`, `UPDATE`, `DELETE`) | `BEFORE / AFTER` | `SECURITY DEFINER` | Automatically adjusts `inventory.quantity` when materials are added/removed from repair jobs; prevents negative stock |
| `process_sale_item_stock` | `sale_items` (`INSERT`, `UPDATE`, `DELETE`) | `BEFORE / AFTER` | `SECURITY DEFINER` | Automatically deducts `inventory.quantity` on POS retail sales; restores stock on item cancellation |
| `sync_sale_code_and_invoice` | `sales` (`BEFORE INSERT`) | `BEFORE` | `SECURITY INVOKER` | Ensures `sale_code` and `invoice_number` match and auto-generates if omitted |
| `recalculate_sale_totals` | `sale_items` (`AFTER INSERT/UPDATE/DELETE`) | `AFTER` | `SECURITY DEFINER` | Recalculates `subtotal`, `tax`, and `grand_total` on parent `sales` row |
| `accrue_job_incentives` | `jobs` (`AFTER UPDATE of status`) | `AFTER` | `SECURITY DEFINER` | When status becomes `Completed`, splits `snap_technician_incentive` evenly among assigned technicians in `job_technicians` and records to `staff_incentives` |
| `accrue_sale_incentives` | `sales` (`AFTER INSERT/UPDATE of status`) | `AFTER` | `SECURITY DEFINER` | When sale becomes `Paid`, awards `snap_receptionist_incentive` to the creator in `staff_incentives` |
| `sync_initial_technician` | `jobs` (`AFTER INSERT/UPDATE of technician_id`) | `AFTER` | `SECURITY DEFINER` | Bridges legacy single-technician `jobs.technician_id` column to multi-technician `job_technicians` table |
| `set_job_material_defaults` | `job_materials` (`BEFORE INSERT`) | `BEFORE` | `SECURITY DEFINER` | Injects `technician_id` from `auth.uid()` or parent job if not explicitly specified |
