# Phase 1.5: Database Schema & Storage Architecture

This document provides a comprehensive mapping of the PostgreSQL database schema, constraints, sequences, views, indexes, and storage buckets.

---

## 1. Relational Tables Inventory

### 1.1 Core Business Tables

| Table Name | Primary Key | Foreign Keys | Key Constraints & Checks | Purpose |
|---|---|---|---|---|
| **`users`** | `id uuid` (`= auth.users.id`) | None | `email UNIQUE NOT NULL`, `role IN ('admin','receptionist','technician')` | Staff user profile, role classification, push token, avatar |
| **`jobs`** | `id uuid` | `receptionist_id -> users(id)`, `technician_id -> users(id)`, `job_type_ref_id -> job_types(id)` | `job_code UNIQUE NOT NULL`, `status IN ('Received','In Progress','Waiting for Materials','Completed')`, `priority IN ('Normal','High','Urgent')`, `device_type IN ('Laptop','PC','Other')` | Core repair job intake, assignment, progress tracking, and customer contact |
| **`job_materials`** | `id uuid` | `job_id -> jobs(id) ON DELETE CASCADE`, `technician_id -> users(id)`, `inventory_id -> inventory(id)` | `quantity > 0`, `unit_cost >= 0`, `total_cost GENERATED ALWAYS (qty * cost)` | Parts/materials utilized during device repair |
| **`job_technicians`**| `id uuid` | `job_id -> jobs(id) ON DELETE CASCADE`, `technician_id -> users(id) ON DELETE CASCADE` | `UNIQUE(job_id, technician_id)` | Multi-technician assignment support per repair job |
| **`job_types`** | `id uuid` | None | `customer_charge_amount >= 0`, `receptionist_incentive >= 0`, `technician_incentive >= 0` | Service catalog, default customer charge, and incentive rates |
| **`onsite_visits`** | `id uuid` | `job_id -> jobs(id) ON DELETE CASCADE`, `technician_id -> users(id)` | Check-in/out GPS coords, arrival/departure timestamps and selfie URLs | Onsite field service verification and photo/GPS audit log |

---

### 1.2 Inventory & Point of Sale (POS)

| Table Name | Primary Key | Foreign Keys | Key Constraints & Checks | Purpose |
|---|---|---|---|---|
| **`inventory`** | `id uuid` | None | `quantity >= 0`, `cost_price >= 0`, `selling_price >= 0`, `low_stock_threshold >= 0` | Warehouse spare parts, retail accessories, and current live stock levels |
| **`sales`** | `id uuid` | `created_by -> users(id)`, `sale_type_id -> sale_types(id)` | `sale_code UNIQUE`, `status IN ('Draft','Paid','Cancelled')`, `subtotal >= 0`, `grand_total >= 0` | Direct retail sales and counter invoice transactions |
| **`sale_items`** | `id uuid` | `sale_id -> sales(id) ON DELETE CASCADE`, `inventory_id -> inventory(id)` | `quantity > 0`, `unit_price >= 0`, `total_price GENERATED ALWAYS` | Itemized products associated with a counter sale |
| **`sale_types`** | `id uuid` | None | `customer_charge_amount >= 0`, `receptionist_incentive >= 0` | POS product categories and receptionist commission rates |
| **`billing`** | `id uuid` | `job_id -> jobs(id) ON DELETE CASCADE UNIQUE` | `parts_total >= 0`, `labour_charge >= 0`, `tax_percent >= 0`, `discount >= 0`, `doc_type IN ('invoice','receipt')` | Final repair billing, labour charge, taxes, discounts, and PDF Drive link |

---

### 1.3 Staff Operations & Attendance

| Table Name | Primary Key | Foreign Keys | Key Constraints & Checks | Purpose |
|---|---|---|---|---|
| **`attendance`** | `id uuid` | `user_id -> users(id) ON DELETE CASCADE`, `approved_by -> users(id)` | `UNIQUE(user_id, date)`, `status IN ('Present','Halfday','Leave','Absent')`, `review_status IN ('pending','approved','rejected')` | Daily staff check-in/out selfies, GPS coordinates, geofence status, OT, late/early minutes |
| **`geofence_settings`**| `id uuid` | `updated_by -> users(id)` | `lat NOT NULL`, `lng NOT NULL`, `radius > 0` (default 50m) | Central workshop coordinates for geofenced attendance verification |
| **`holidays`** | `id uuid` | None | `date UNIQUE NOT NULL` | Official workshop calendar holidays (used for working day calculation in payroll) |
| **`employee_leave`** | `id uuid` | `user_id -> users(id) ON DELETE CASCADE`, `approved_by -> users(id)` | `status IN ('pending','approved','rejected')` | Staff leave requests and administrative approval workflow |
| **`customer_reviews`**| `id uuid` | `user_id -> users(id) ON DELETE CASCADE`, `job_id -> jobs(id)` | `score BETWEEN 1.0 AND 5.0` | Customer satisfaction ratings linked to technician salary bonuses/penalties |

---

### 1.4 Financial, Salary & Audit Tables

| Table Name | Primary Key | Foreign Keys | Key Constraints & Checks | Purpose |
|---|---|---|---|---|
| **`staff_rates`** | `user_id uuid` | `user_id -> users(id) ON DELETE CASCADE` | `monthly_salary >= 0`, `halfday_deduction >= 0`, `late_tier1_amount >= 0`, `early_tier1_amount >= 0` | Master compensation structure, shift times, penalty tiers, and incentive settings |
| **`salary`** | `id uuid` | `user_id -> users(id) ON DELETE CASCADE`, `generated_by -> users(id)` | `UNIQUE(user_id, month)`, `status IN ('draft','paid')` | Comprehensive monthly payroll record: base pay, overtime, attendance deductions, incentives, net salary |
| **`payments`** | `id uuid` | `user_id -> users(id)`, `created_by -> users(id)` | `amount > 0`, `type IN ('advance_salary','materials_purchase','daily_expenditure','office_development')` | Cash outflow ledger: staff advance salary, shop expenditure, material purchasing |
| **`staff_incentives`**| `id uuid` | `user_id -> users(id) ON DELETE CASCADE`, `job_id -> jobs(id)`, `sale_id -> sales(id)` | `amount >= 0`, `role_type IN ('receptionist','technician')` | Itemized commission ledger accrued automatically on job completion and paid sales |
| **`payroll_audit_log`**| `id uuid` | `user_id -> users(id)`, `performed_by -> users(id)` | Action type verification | Immutable audit log of all payroll calculations, bonus additions, and manual adjustments |
| **`notifications`** | `id uuid` | `job_id -> jobs(id)`, `recipient_user_id -> users(id) ON DELETE CASCADE` | `channel IN ('push','whatsapp','email')`, `status IN ('pending','sent','failed')` | Outbox and delivery history for staff pushes and customer communications |

---

### 1.5 Background Infrastructure Tables

| Table Name | Primary Key | Foreign Keys | Key Constraints & Checks | Purpose |
|---|---|---|---|---|
| **`export_jobs`** | `id uuid` | None | `type IN ('monthly-data','attendance-report','attendance-selfie','onsite-photo','invoice','receipt')`, `status IN ('running','success','failed')` | History of all automated/manual Google Drive backup jobs |
| **`pending_uploads`** | `id uuid` | None | `type IN ('attendance-selfie','onsite-photo','invoice','receipt')`, `attempts >= 0` | Retry queue for failed photo/document uploads to Google Drive |

---

## 2. Database Views

1. **`public.export_jobs_latest`**:
   - `WITH (security_invoker = true)`
   - Queries `DISTINCT ON (type)` from `export_jobs` ordered by `started_at DESC` to render admin status badges for each export stream.
2. **`public.stuck_uploads`**:
   - `WITH (security_invoker = true)`
   - Computes `COUNT(*)` from `pending_uploads WHERE attempts >= 3` to display warning banners when uploads are blocked.

---

## 3. PostgreSQL Sequences

- **`public.job_code_seq`**: Monotonically increasing sequence used by `generate_job_code()` to generate sequential `RS-YYYY-XXXX` repair job IDs.
- **`public.sale_code_seq`**: Monotonically increasing sequence used by `generate_sale_code()` to generate sequential `SALE-YYYY-XXXX` POS invoice IDs.

---

## 4. Supabase Storage Buckets & Policies

| Bucket ID | Public Access | Target Path / Object Pattern | Storage RLS Enforcement |
|---|---|---|---|
| **`attendance-selfies`** | `false` (Private) | `attendance-selfies/{userId}/{date}.webp` | `authenticated` users can insert/select objects matching their own user ID or if admin |
| **`onsite-visits`** | `false` (Private) | `onsite-visits/{jobId}/{type}.webp` | `authenticated` technicians and admin can upload and retrieve job photos |
| **`invoices`** | `false` (Private) | `invoices/{year}/{month}/{jobCode}.pdf` | `authenticated` staff can read/write invoice PDFs |
| **`avatars`** | `true` (Public CDN / Private Listing) | `avatars/{userId}.webp` | Public direct image GET via CDN URL; listing restricted to `authenticated` users |
| **`profile-pictures`** | `false` (Private) | `profile-pictures/{userId}/*` | Authenticated users can upload/update photos only within their own `{userId}` folder |
