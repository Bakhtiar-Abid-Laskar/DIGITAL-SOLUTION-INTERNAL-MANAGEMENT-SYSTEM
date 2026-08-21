# RepairShop — Migration Strategy

## Current State

| File | Purpose |
|---|---|
| `migrations/20260819000000_baseline_schema.sql` | **Single source of truth** — full schema as of 2026-08-18 |
| `migrations/_archive/` | All 65 old migrations, kept for git history only |

## How to Apply to a NEW Supabase Project

### Step 1 — Create new Supabase project
Go to https://supabase.com/dashboard → New project

### Step 2 — Run the baseline in SQL Editor
Open your new project → SQL Editor → paste the full contents of `20260819000000_baseline_schema.sql` → Run

### Step 3 — For an EXISTING project (already has data)
The live DB already has everything applied.  
Just insert a record to tell Supabase "I've already applied this":

```sql
-- Run this in your Supabase SQL Editor ONCE on the live project
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260819000000', 'baseline_schema', ARRAY['-- squashed baseline'])
ON CONFLICT DO NOTHING;
```

After that, `supabase db push` will skip the baseline and only run future migrations.

---

## How to Add Future Changes

Always create a NEW migration file:

```
migrations/
  _archive/                          ← 65 old files, do not touch
  20260819000000_baseline_schema.sql ← baseline
  20260820000001_add_xyz.sql         ← new feature ✓
  20260821000001_fix_abc.sql         ← next change ✓
```

**Naming rule:** `YYYYMMDDHHMMSS_short_description.sql`  
Never reuse an existing timestamp.

---

## What the Baseline Contains

1. Extensions (`pg_cron`, `pg_net`)
2. Sequences: `job_code_seq`, `sale_code_seq`, `invoice_code_seq`
3. Helper functions: `is_admin()`, `is_receptionist()`, `is_technician()`, `is_staff()`, `get_user_role()`
4. **40 tables** in correct dependency order
5. All indexes
6. RLS enabled on all tables
7. All RLS policies (final consolidated state with `(select ...)` wrappers)
8. All trigger functions and triggers (32 triggers)
9. RPCs: `create_invoice()`, `add_stock()`, `generate_job_code()`
10. Storage buckets: `attendance-selfies`, `onsite-visits`
11. Seed data: all `ui_*` lookup tables

---

## Tables Included

```
attendance          employee_bonus       employee_leave
export_jobs         geofence_settings    holidays
inventory           inventory_audit_log  inventory_transactions
invoice_items       invoices             job_materials
job_technicians     job_types            jobs
material_allotments notifications        onsite_visits
payments            payroll_audit_log    pending_uploads
products            salary               sale_items
sale_types          sales                staff_incentives
staff_rates         ui_job_statuses      ui_payment_methods
ui_payment_statuses ui_priorities        ui_roles
ui_sale_statuses    ui_service_locations users
whatsapp_logs       whatsapp_messages    whatsapp_settings
```
