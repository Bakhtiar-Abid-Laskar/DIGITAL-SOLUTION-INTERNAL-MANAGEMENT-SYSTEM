# RepairShop — Database Schema

## Overview

The database is hosted on **Supabase (PostgreSQL)**. All tables are in the `public` schema with Row Level Security (RLS) enabled.

---

## Table 1: `users`

The central user table. Every staff member who can log in must have both a Supabase Auth account AND a corresponding row in this table. The `id` field **must equal** the Supabase Auth user's `uid`.

```sql
CREATE TABLE public.users (
  id                UUID         PRIMARY KEY, -- equals auth.uid()
  name              TEXT         NOT NULL,
  email             TEXT         NOT NULL UNIQUE,
  phone             TEXT,
  role              TEXT         NOT NULL CHECK (role IN ('admin', 'receptionist', 'technician')),
  is_active         BOOLEAN      NOT NULL DEFAULT false, -- must be approved by admin
  expo_push_token   TEXT,        -- updated by mobile app on login
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

**Key Design Decisions:**
- `is_active = false` on signup → admin must set to `true` to grant access
- `expo_push_token` is stored here so Edge Functions can fetch it to send push notifications
- No separate staff ID — `users.id = auth.uid()` throughout the system

**RLS Policies:**
- Users can read/update their own row (`id = auth.uid()`)
- Admin can read/update all rows
- Receptionist can read staff list (for technician assignment)

---

## Table 2: `jobs`

The core operational table — every repair job is a row here.

```sql
CREATE TABLE public.jobs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code          TEXT         NOT NULL UNIQUE, -- e.g. "RS-2026-0001"
  
  -- Customer Information
  customer_name     TEXT         NOT NULL,
  customer_contact  TEXT         NOT NULL,
  customer_email    TEXT,
  
  -- Device Information
  device_type       TEXT         NOT NULL, -- "Laptop", "Desktop", "Phone", etc.
  reported_issue    TEXT         NOT NULL,
  remarks           TEXT,
  
  -- Job Metadata
  job_type          TEXT         NOT NULL DEFAULT 'Inhouse' CHECK (job_type IN ('Inhouse', 'Onsite')),
  priority          TEXT         NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Normal', 'High', 'Urgent')),
  status            TEXT         NOT NULL DEFAULT 'Received'
                    CHECK (status IN ('Received', 'In Progress', 'Waiting for Materials', 'Completed')),
  
  -- Staff Assignment
  receptionist_id   UUID         REFERENCES public.users(id),
  technician_id     UUID         REFERENCES public.users(id),
  
  -- Work Data
  work_notes        TEXT,        -- technician's notes
  
  -- Timestamps
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ  -- set when status becomes 'Completed'
);

-- Foreign key constraint names (used in Supabase JS joins):
-- jobs_technician_id_fkey → users!jobs_technician_id_fkey(name)
-- jobs_receptionist_id_fkey → users!jobs_receptionist_id_fkey(name)
```

**Key Design Decisions:**
- `job_code` is `UNIQUE` — enforced at DB level
- `completed_at` is set by client code (NOT a trigger) when status changes to 'Completed'
- `work_notes` is written by the technician via `UpdateWorkScreen`
- Both `receptionist_id` and `technician_id` are nullable — jobs can be unassigned initially

**Job Code Sequence:**
```sql
CREATE SEQUENCE IF NOT EXISTS job_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_job_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'RS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('job_code_seq')::TEXT, 4, '0');
  RETURN code;
END;
$$;
```
- Called via `supabase.rpc('generate_job_code')` — never client-generated
- Sequence restarts approach: does NOT auto-reset per year (codes will exceed 9999 eventually)

**RLS Policies:**
- Admin/Receptionist: full SELECT, INSERT, UPDATE
- Technician: SELECT where `technician_id = auth.uid()`, UPDATE where `technician_id = auth.uid()`
- Technician CANNOT INSERT new jobs (receptionist only)

---

## Table 3: `job_materials`

Materials and parts used for a job — logged by the technician during repair.

```sql
CREATE TABLE public.job_materials (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID         NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  material_name   TEXT         NOT NULL,
  quantity        NUMERIC      NOT NULL DEFAULT 1,
  unit_cost       NUMERIC      NOT NULL DEFAULT 0,
  total_cost      NUMERIC      GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  -- OR: total_cost is stored manually on insert
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

**Key Design Decisions:**
- `total_cost` may be a generated column OR calculated client-side and stored (code checks `mat.total_cost || (mat.quantity * mat.unit_cost)`)
- `ON DELETE CASCADE` — when a job is deleted, all materials are removed
- Used to calculate `parts_total` in billing formula

**RLS Policies:**
- Technician: INSERT/SELECT/DELETE where job is assigned to them
- Receptionist/Admin: SELECT (read-only for billing calculation)

---

## Table 4: `attendance`

Daily attendance records — one row per user per date.

```sql
CREATE TABLE public.attendance (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES public.users(id),
  date                  DATE         NOT NULL,
  
  -- Check-In
  check_in_time         TIMESTAMPTZ,
  check_in_selfie_url   TEXT,        -- Supabase Storage path
  check_in_gps          JSONB,       -- { latitude, longitude, accuracy }
  
  -- Check-Out
  check_out_time        TIMESTAMPTZ,
  check_out_selfie_url  TEXT,
  check_out_gps         JSONB,
  
  -- Calculated fields
  ot_hours              NUMERIC      DEFAULT 0,
  early_hours           NUMERIC      DEFAULT 0,
  status                TEXT         CHECK (status IN ('Present', 'Halfday', 'Leave', 'Absent')),
  
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  
  UNIQUE (user_id, date)   -- one record per user per day
);
```

**Key Design Decisions:**
- `UNIQUE (user_id, date)` — prevents duplicate attendance; enables `UPSERT` via `ON CONFLICT`
- `check_in_gps` and `check_out_gps` stored as JSONB `{ latitude, longitude, accuracy }` — flexible
- `ot_hours` and `early_hours` are calculated and stored (not computed at query time)
- `selfie_url` stores the Supabase Storage path, not a full URL — signed URLs generated when displaying

**RLS Policies:**
- Each user: SELECT/INSERT/UPDATE their own records (`user_id = auth.uid()`)
- Admin: SELECT all records

---

## Table 5: `onsite_visits`

Log of onsite visits — arrival and departure for Onsite-type jobs.

```sql
CREATE TABLE public.onsite_visits (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID         NOT NULL REFERENCES public.jobs(id),
  technician_id         UUID         NOT NULL REFERENCES public.users(id),
  
  -- Arrival
  arrived_at            TIMESTAMPTZ,
  arrival_selfie_url    TEXT,
  arrival_gps           JSONB,
  
  -- Departure
  departed_at           TIMESTAMPTZ,
  departure_selfie_url  TEXT,
  departure_gps         JSONB,
  
  -- Optional device documentation
  device_before_url     TEXT,   -- photo of device before work
  device_after_url      TEXT,   -- photo of device after work
  
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- Technician: INSERT/SELECT/UPDATE where `technician_id = auth.uid()`
- Admin/Receptionist: SELECT all

---

## Table 6: `billing`

Invoice data for a job — one billing record per job (enforced by unique constraint).

```sql
CREATE TABLE public.billing (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID         NOT NULL UNIQUE REFERENCES public.jobs(id),
  
  -- Input Values
  parts_total    NUMERIC      NOT NULL DEFAULT 0,   -- calculated from job_materials
  labour_charge  NUMERIC      NOT NULL DEFAULT 0,
  tax_percent    NUMERIC      NOT NULL DEFAULT 0,
  discount       NUMERIC      NOT NULL DEFAULT 0,
  
  -- Calculated
  grand_total    NUMERIC      NOT NULL DEFAULT 0,
  
  -- Payment Status
  is_paid        BOOLEAN      NOT NULL DEFAULT false,
  paid_at        TIMESTAMPTZ,
  
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);
```

**Formula (stored as grand_total):**
```
grand_total = (parts_total + labour_charge) × (1 + tax_percent/100) - discount
```

**Key Design Decisions:**
- `UNIQUE (job_id)` — only one invoice per job; use UPSERT pattern
- `grand_total` is calculated client-side and stored (NOT a generated column — allows for manual corrections)
- `is_paid` toggled by receptionist to track payment

**RLS Policies:**
- Receptionist/Admin: full access
- Technician: NO access

---

## Table 7: `inventory`

Stock management — parts, supplies, and materials available in the shop.

```sql
CREATE TABLE public.inventory (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name            TEXT         NOT NULL,
  quantity             NUMERIC      NOT NULL DEFAULT 0,
  unit                 TEXT,        -- "pcs", "kg", "meters", etc.
  low_stock_threshold  NUMERIC      DEFAULT 5,
  last_updated         TIMESTAMPTZ  DEFAULT NOW(),
  created_at           TIMESTAMPTZ  DEFAULT NOW()
);
```

**Low Stock Detection:** `quantity <= low_stock_threshold` (evaluated client-side for dashboard alerts)

**RLS Policies:**
- Admin: full CRUD
- Receptionist: SELECT only
- Technician: SELECT only (or no access — TBD by business)

---

## Table 8: `payments`

Financial transaction log — tracks advance salary, materials purchase, daily expenditure, and office development expenses.

```sql
CREATE TABLE public.payments (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         REFERENCES public.users(id),   -- nullable (for non-staff expenses)
  created_by   UUID         REFERENCES public.users(id),   -- admin who recorded it
  type         TEXT         NOT NULL
               CHECK (type IN ('advance_salary', 'materials_purchase', 'daily_expenditure', 'office_development')),
  amount       NUMERIC      NOT NULL,
  description  TEXT,
  month        TEXT,        -- "2026-01" format — used for advance salary month matching
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);
```

**Key Design Decisions:**
- `user_id` is nullable — allows recording shop expenditures not linked to a specific person
- `month` field enables per-month advance salary deduction in salary calculation
- `created_by` tracks admin accountability

**RLS Policies:**
- Admin only: full access
- No access for receptionist or technician

---

## Table 9: `staff_rates`

Per-employee pay rate configuration — used for salary calculation.

```sql
CREATE TABLE public.staff_rates (
  id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID         NOT NULL UNIQUE REFERENCES public.users(id),
  base_daily_rate            NUMERIC      NOT NULL DEFAULT 0,
  ot_rate_per_hour           NUMERIC      NOT NULL DEFAULT 0,
  early_deduction_per_hour   NUMERIC      NOT NULL DEFAULT 0,
  updated_at                 TIMESTAMPTZ  DEFAULT NOW()
);
```

**Key Design Decisions:**
- `UNIQUE (user_id)` — one rate record per employee
- Upserted (INSERT or UPDATE) via `StaffRateForm`

**RLS Policies:**
- Admin only: full access

---

## Table 10: `salary`

Monthly salary records — saved after calculation to maintain payroll history.

```sql
CREATE TABLE public.salary (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES public.users(id),
  month            TEXT         NOT NULL,   -- "2026-01" format
  
  -- Attendance counts
  working_days     INTEGER      NOT NULL DEFAULT 0,
  present_days     INTEGER      NOT NULL DEFAULT 0,
  halfday_count    INTEGER      NOT NULL DEFAULT 0,
  leave_count      INTEGER      NOT NULL DEFAULT 0,
  absent_count     INTEGER      NOT NULL DEFAULT 0,
  ot_hours         NUMERIC      NOT NULL DEFAULT 0,
  early_hours      NUMERIC      NOT NULL DEFAULT 0,
  
  -- Rates (snapshot at calculation time)
  base_daily_rate            NUMERIC NOT NULL DEFAULT 0,
  ot_rate_per_hour           NUMERIC NOT NULL DEFAULT 0,
  early_deduction_per_hour   NUMERIC NOT NULL DEFAULT 0,
  
  -- Calculated Amounts
  present_pay      NUMERIC      NOT NULL DEFAULT 0,
  halfday_pay      NUMERIC      NOT NULL DEFAULT 0,
  ot_pay           NUMERIC      NOT NULL DEFAULT 0,
  early_deduction  NUMERIC      NOT NULL DEFAULT 0,
  gross_salary     NUMERIC      NOT NULL DEFAULT 0,
  advance_deducted NUMERIC      NOT NULL DEFAULT 0,
  net_salary       NUMERIC      NOT NULL DEFAULT 0,
  
  -- Metadata
  calculated_by    UUID         REFERENCES public.users(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ,
  
  UNIQUE (user_id, month)   -- one record per user per month
);
```

**RLS Policies:**
- Admin only: full access

---

## Table 11: `notifications`

Audit log of all notification attempts (push, WhatsApp, email).

```sql
CREATE TABLE public.notifications (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID         REFERENCES public.jobs(id),
  recipient_user_id   UUID         REFERENCES public.users(id),   -- nullable for customer notifications
  channel             TEXT         NOT NULL CHECK (channel IN ('push', 'whatsapp', 'email')),
  message             TEXT         NOT NULL,
  status              TEXT         NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);
```

**Key Design Decisions:**
- `recipient_user_id` is nullable — customer notifications have no system user ID
- Written only by Edge Functions (using service role key that bypasses RLS)
- Read by admin/receptionist to see notification history

**RLS Policies:**
- Admin/Receptionist: SELECT all
- No INSERT/UPDATE via client (Edge Functions use service role)

---

## Database Functions

### `generate_job_code()`
- **Type:** PostgreSQL function (PL/pgSQL)
- **Returns:** `TEXT` — job code in format `RS-YYYY-NNNN`
- **Side Effects:** Increments `job_code_seq` sequence
- **Called via:** `supabase.rpc('generate_job_code')`

---

## Database Storage Buckets

### `attendance-selfies`
- **Type:** Private Supabase Storage bucket
- **Contents:** JPEG photos of employee check-in/check-out selfies
- **Access:** Via signed URLs only (1-hour expiry)
- **Path pattern:** `{userId}/{date}/{checkin|checkout}.jpg`

### `onsite-visits`
- **Type:** Private Supabase Storage bucket
- **Contents:** JPEG photos of onsite visit arrival/departure + device photos
- **Access:** Via signed URLs only
- **Path pattern:** `{jobId}/{userId}/{timestamp}.jpg`

---

## Entity Relationship Diagram

```
auth.users (Supabase built-in)
     │ id (FK = PK)
     │
     ▼
┌─────────────────────────────────────┐
│ users                               │
│ id, name, email, phone,             │
│ role, is_active, expo_push_token    │
└───────────────┬─────────────────────┘
                │
       ┌────────┴────────────────────────────┐
       │                                     │
       │  receptionist_id FK                 │
       │  technician_id FK                   │
       ▼                                     ▼
┌──────────────────────────┐     ┌──────────────────┐
│ jobs                     │     │ attendance        │
│ id, job_code, status,    │     │ user_id, date,    │
│ priority, job_type,      │     │ check_in_time,    │
│ customer_name/contact/   │     │ check_out_time,   │
│ email, device_type,      │     │ selfie_urls, gps  │
│ reported_issue, remarks, │     └──────────────────┘
│ work_notes, completed_at │
└──────┬───────────────────┘     ┌──────────────────┐
       │                         │ onsite_visits     │
       │ job_id FK               │ job_id + tech_id  │
       ├─────────────────────────│ arrived/departed  │
       │                         └──────────────────┘
       │ job_id FK
       ├─────────────────────────┐
       │                         ▼
       │                  ┌──────────────────┐
       │                  │ job_materials     │
       │                  │ material_name,    │
       │                  │ qty, unit_cost,   │
       │                  │ total_cost        │
       │                  └──────────────────┘
       │
       │ job_id FK
       ├─────────────────────────┐
       │                         ▼
       │                  ┌──────────────────┐
       │                  │ billing           │
       │                  │ parts_total,      │
       │                  │ labour_charge,    │
       │                  │ tax_percent,      │
       │                  │ discount,         │
       │                  │ grand_total,      │
       │                  │ is_paid           │
       │                  └──────────────────┘
       │
       │ job_id FK
       └─────────────────────────┐
                                 ▼
                          ┌──────────────────┐
                          │ notifications     │
                          │ channel, message, │
                          │ status, sent_at   │
                          └──────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ staff_rates       │     │ salary            │     │ payments          │
│ user_id (1:1)    │     │ user_id + month   │     │ user_id (nullable)│
│ base_daily_rate  │     │ (unique pair)     │     │ type, amount,     │
│ ot_rate          │     │ all breakdown     │     │ description, month│
│ early_deduction  │     │ fields            │     └──────────────────┘
└──────────────────┘     └──────────────────┘

┌──────────────────┐
│ inventory         │
│ item_name,        │
│ quantity, unit,   │
│ low_stock_thresh  │
└──────────────────┘
```

---

## RLS Summary Matrix

| Table | Admin | Receptionist | Technician |
|---|---|---|---|
| `users` | Full CRUD | Read (active staff) | Own row read/update |
| `jobs` | Full CRUD | Full CRUD | Own assigned only |
| `job_materials` | Read | Read | Own assigned jobs |
| `attendance` | Read all | Own records | Own records |
| `onsite_visits` | Read all | Read | Own visits |
| `billing` | Full CRUD | Full CRUD | ❌ No access |
| `inventory` | Full CRUD | Read | Read |
| `payments` | Full CRUD | ❌ No access | ❌ No access |
| `staff_rates` | Full CRUD | ❌ No access | ❌ No access |
| `salary` | Full CRUD | ❌ No access | ❌ No access |
| `notifications` | Read | Read | ❌ No access |

---

## Status Values Reference

### Job Status
| Value | Meaning | Set By |
|---|---|---|
| `Received` | Device received, not yet assigned | System on job creation |
| `In Progress` | Technician is working | Technician |
| `Waiting for Materials` | Waiting for parts to arrive | Technician |
| `Completed` | Repair finished | Technician (sets `completed_at`) |

### Attendance Status
| Value | Meaning |
|---|---|
| `Present` | Checked in and out, full day |
| `Halfday` | Checked in, left early (early_hours > threshold) |
| `Leave` | Manually marked as leave |
| `Absent` | No check-in recorded |

### Payment Types
| Value | Context |
|---|---|
| `advance_salary` | Advance payment to staff (deducted from monthly salary) |
| `materials_purchase` | Cost of buying materials for repair |
| `daily_expenditure` | Day-to-day operational costs |
| `office_development` | Office improvement/equipment costs |

### Notification Channels
| Value | Provider |
|---|---|
| `push` | Expo Push Notification Service |
| `whatsapp` | Twilio WhatsApp API |
| `email` | Resend Email API |
