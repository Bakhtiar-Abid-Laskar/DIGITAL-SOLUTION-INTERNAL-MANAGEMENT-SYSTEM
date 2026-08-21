-- ============================================================================
-- REPAIRSHOP — CLEAN BASELINE SCHEMA
-- Migration: 20260819000000_baseline_schema.sql
-- Generated: 2026-08-19
--
-- This is a SQUASHED baseline of all 65 prior migrations.
-- It reflects the exact live database state as of 2026-08-18.
-- Apply this to a FRESH Supabase project to reproduce the full schema.
--
-- ORDER:
--   1. Extensions
--   2. Sequences & helper functions
--   3. Core tables (dependency order: no FK forward references)
--   4. Lookup / UI tables
--   5. Indexes
--   6. Enable RLS
--   7. RLS Policies (final state after all security fixes)
--   8. Triggers & trigger functions
--   9. RPC functions
--  10. Storage buckets & policies
--  11. Seed data
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;


-- ============================================================================
-- 2. SEQUENCES & ROLE HELPER FUNCTIONS
-- ============================================================================

-- Sequences
create sequence if not exists public.job_code_seq start with 1 increment by 1;
create sequence if not exists public.sale_code_seq start with 1 increment by 1;
create sequence if not exists public.invoice_code_seq start with 1 increment by 1;

-- Job code: RS-YYYY-0001
create or replace function public.generate_job_code()
returns text
language plpgsql volatile security definer
set search_path = public
as $$
declare
  next_val bigint;
  yr text := to_char(now(), 'YYYY');
begin
  next_val := nextval('public.job_code_seq');
  return 'RS-' || yr || '-' || lpad(next_val::text, 4, '0');
end;
$$;

-- Sale code: SALE-YYYY-0001
create or replace function public.generate_sale_code()
returns text
language plpgsql volatile security definer
set search_path = public
as $$
declare
  next_val bigint;
  yr text := to_char(now(), 'YYYY');
begin
  next_val := nextval('public.sale_code_seq');
  return 'SALE-' || yr || '-' || lpad(next_val::text, 4, '0');
end;
$$;

-- Invoice code: INV-YYYY-0001
create or replace function public.generate_invoice_code()
returns text
language plpgsql volatile security definer
set search_path = public
as $$
declare
  next_val bigint;
  yr text := to_char(now(), 'YYYY');
begin
  next_val := nextval('public.invoice_code_seq');
  return 'INV-' || yr || '-' || lpad(next_val::text, 4, '0');
end;
$$;


-- ============================================================================
-- 3. CORE TABLES (dependency order — parents before children)
-- ============================================================================

-- ─── users ───────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text unique not null,
  phone           text,
  role            text not null check (role in ('admin', 'receptionist', 'technician')),
  is_active       boolean default false,
  expo_push_token text,
  avatar_drive_file_id text,
  created_at      timestamptz default now()
);

-- Role helpers (SECURITY DEFINER prevents RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.is_receptionist()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'receptionist' and is_active = true
  );
$$;

create or replace function public.is_technician()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'technician' and is_active = true
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and is_active = true
  );
$$;

create or replace function public.get_user_role()
returns text
language sql security definer set search_path = public
as $$
  select role from public.users
  where id = auth.uid() and is_active = true
  limit 1;
$$;

-- ─── ui_device_types ──────────────────────────────────────────────────────────
create table if not exists public.ui_device_types (
  id          text primary key,
  code        text,
  label       text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ─── job_types (catalog) ────────────────────────────────────────────────────
create table if not exists public.job_types (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  customer_charge_amount numeric not null default 0,
  technician_incentive   numeric not null default 0,
  is_active             boolean not null default true,
  created_at            timestamptz default now()
);

-- ─── jobs ─────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id                       uuid primary key default gen_random_uuid(),
  job_code                 text unique not null default public.generate_job_code(),
  customer_name            text not null,
  customer_contact         text not null,
  customer_email           text,
  customer_gstin           text,
  device_type_id           text references public.ui_device_types(id),
  reported_issue           text not null,
  remarks                  text,
  work_notes               text,
  job_type                 text check (job_type in ('Inhouse', 'Onsite')) default 'Inhouse',
  priority                 text check (priority in ('Normal', 'High', 'Urgent')) default 'Normal',
  status                   text check (status in ('Received', 'In Progress', 'Waiting for Materials', 'Completed', 'Delivered', 'Cancelled')) default 'Received',
  receptionist_id          uuid references public.users(id),
  technician_id            uuid references public.users(id),
  job_type_ref_id          uuid references public.job_types(id),
  snap_technician_incentive numeric default 0,
  status_changed_at        timestamptz,
  created_at               timestamptz default now(),
  completed_at             timestamptz,
  advance_amount           numeric default 0
);

-- ─── job_technicians (multi-tech support) ────────────────────────────────────
create table if not exists public.job_technicians (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs(id) on delete cascade,
  technician_id uuid not null references public.users(id) on delete cascade,
  assigned_at   timestamptz not null default now(),
  removed_at    timestamptz,
  unique(job_id, technician_id)
);

-- ─── attendance ───────────────────────────────────────────────────────────────
create table if not exists public.attendance (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.users(id) on delete cascade,
  date                  date not null,
  check_in_time         timestamptz,
  check_out_time        timestamptz,
  
  check_in_drive_file_id  text,
  check_out_drive_file_id text,
  gps_lat               numeric,
  gps_lng               numeric,
  check_out_gps_lat     numeric,
  check_out_gps_lng     numeric,
  ot_hours              numeric default 0 check (ot_hours >= 0),
  early_hours           numeric default 0 check (early_hours >= 0),
  late_in_minutes       numeric default 0 check (late_in_minutes >= 0),
  early_in_minutes      numeric default 0 check (early_in_minutes >= 0),
  late_out_minutes      numeric default 0 check (late_out_minutes >= 0),
  status                text check (status in ('Present', 'Halfday', 'Leave', 'Absent')) default 'Present',
  approved_by           uuid references public.users(id),
  low_accuracy          boolean default false,
  at_location           boolean default false,
  review_status         text default 'pending',
  unique(user_id, date)
);

-- ─── onsite_visits ────────────────────────────────────────────────────────────
create table if not exists public.onsite_visits (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid references public.jobs(id) on delete cascade,
  technician_id       uuid references public.users(id),
  arrival_drive_file_id   text,
  arrival_time        timestamptz,
  arrival_gps_lat     numeric,
  arrival_gps_lng     numeric,
  departure_drive_file_id text,
  departure_time      timestamptz,
  departure_gps_lat   numeric,
  departure_gps_lng   numeric
);

-- ─── products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  sku          text unique,
  hsn_sac      text,
  description  text,
  category     text,
  brand        text,
  unit         text default 'Pcs',
  cgst_rate    numeric default 9,
  sgst_rate    numeric default 9,
  igst_rate    numeric default 18,
  tax_mode     text default 'exclusive' check (tax_mode in ('inclusive', 'exclusive')),
  is_active    boolean default true,
  created_by   uuid references public.users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── inventory ────────────────────────────────────────────────────────────────
create table if not exists public.inventory (
  id                 uuid primary key default gen_random_uuid(),
  item_name          text not null,
  quantity           numeric default 0 check (quantity >= 0),
  quantity_cached    numeric default 0,
  unit               text default 'Pcs',
  low_stock_threshold numeric default 5 check (low_stock_threshold >= 0),
  cost_price         numeric default 0 check (cost_price >= 0),
  selling_rate       numeric default 0 check (selling_rate >= 0),
  purchase_rate      numeric default 0,
  minimum_stock_level numeric default 0 check (minimum_stock_level >= 0),
  location           text,
  product_id         uuid references public.products(id),
  last_updated       timestamptz default now()
);

-- ─── inventory_transactions (immutable ledger) ───────────────────────────────
create table if not exists public.inventory_transactions (
  id               uuid primary key default gen_random_uuid(),
  inventory_id     uuid references public.inventory(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('IN', 'OUT', 'ADJUST', 'RETURN')),
  quantity         numeric not null,
  reference_note   text,
  created_by       uuid references public.users(id),
  created_at       timestamptz default now(),
  serial_numbers   text
);

-- ─── inventory_audit_log ─────────────────────────────────────────────────────
create table if not exists public.inventory_audit_log (
  id           uuid primary key default gen_random_uuid(),
  inventory_id uuid references public.inventory(id),
  changed_by   uuid references public.users(id),
  change_type  text,
  old_quantity numeric,
  new_quantity numeric,
  changed_at   timestamptz default now()
);

-- ─── billing ─────────────────────────────────────────────────────────────────
create table if not exists public.billing_legacy (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid unique references public.jobs(id) on delete cascade,
  parts_total   numeric default 0 check (parts_total >= 0),
  labour_charge numeric default 0 check (labour_charge >= 0),
  tax_percent   numeric default 0 check (tax_percent >= 0),
  discount      numeric default 0 check (discount >= 0),
  grand_total   numeric default 0,
  is_paid       boolean default false,
  invoice_url   text,
  payment_mode  text,
  created_at    timestamptz default now()
);

-- ─── invoices (new GST invoice system) ───────────────────────────────────────
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  invoice_code    text unique not null,
  job_id          uuid references public.jobs(id) on delete set null,
  customer_name   text not null,
  customer_contact text,
  customer_email  text,
  customer_gstin  text,
  tax_regime      text default 'intra_state' check (tax_regime in ('intra_state', 'inter_state')),
  subtotal        numeric default 0,
  total_cgst      numeric default 0,
  total_sgst      numeric default 0,
  total_igst      numeric default 0,
  total_tax       numeric generated always as (total_cgst + total_sgst + total_igst) stored,
  discount        numeric default 0,
  round_off       numeric default 0,
  grand_total     numeric default 0,
  payment_method  text default 'Cash',
  status          text default 'paid' check (status in ('paid', 'draft', 'cancelled')),
  notes           text,
  created_by      uuid references public.users(id),
  paid_at         timestamptz,
  created_at      timestamptz default now()
);

-- ─── invoice_items ────────────────────────────────────────────────────────────
create table if not exists public.invoice_items (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references public.invoices(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  item_name       text not null,
  quantity        numeric not null default 1,
  selling_rate    numeric not null default 0,
  serial_number   text,
  cgst_rate       numeric default 0,
  sgst_rate       numeric default 0,
  igst_rate       numeric default 0,
  taxable_amount  numeric default 0,
  cgst_amount     numeric default 0,
  sgst_amount     numeric default 0,
  igst_amount     numeric default 0,
  discount_amount numeric default 0,
  line_total      numeric default 0,
  created_at      timestamptz default now()
);

-- ─── sales (counter sales) ───────────────────────────────────────────────────
create table if not exists public.sales (
  id                       uuid primary key default gen_random_uuid(),
  sale_code                text unique,
  invoice_number           text unique,
  customer_name            text not null,
  customer_contact         text,
  customer_gstin           text,
  subtotal                 numeric default 0,
  tax_percent              numeric default 0,
  discount                 numeric default 0,
  grand_total              numeric default 0,
  payment_mode             text default 'cash',
  status                   text default 'Paid' check (status in ('Paid', 'Draft', 'Cancelled')),
  snap_receptionist_incentive numeric default 0,
  sale_type_id             uuid,
  created_by               uuid references public.users(id),
  created_at               timestamptz default now()
);

-- ─── sale_types (catalog) ────────────────────────────────────────────────────
create table if not exists public.sale_types (
  id                      uuid primary key default gen_random_uuid(),
  title                   text not null,
  receptionist_incentive  numeric not null default 0,
  is_active               boolean not null default true,
  created_at              timestamptz default now()
);

alter table public.sales
  add constraint sales_sale_type_id_fkey
  foreign key (sale_type_id) references public.sale_types(id)
  on delete set null
  not valid;

-- ─── sale_items ───────────────────────────────────────────────────────────────
create table if not exists public.sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid references public.sales(id) on delete cascade,
  inventory_id uuid references public.inventory(id) on delete set null,
  item_name    text not null,
  quantity     numeric not null check (quantity > 0),
  unit_price   numeric not null check (unit_price >= 0),
  total_price  numeric generated always as (quantity * unit_price) stored,
  serial_number text
);

-- ─── job_materials ────────────────────────────────────────────────────────────
create table if not exists public.job_materials (
  id                      uuid primary key default gen_random_uuid(),
  job_id                  uuid references public.jobs(id) on delete cascade,
  material_name           text not null,
  quantity                numeric not null check (quantity > 0),
  unit_cost               numeric not null check (unit_cost >= 0),
  total_cost              numeric generated always as (quantity * unit_cost) stored,
  technician_id           uuid references public.users(id),
  photo_drive_file_id     text,
  product_id              uuid references public.products(id),
  inventory_id            uuid references public.inventory(id),
  inventory_transaction_id uuid references public.inventory_transactions(id),
  qty_taken               numeric,
  usage_confirmed_at      timestamptz,
  checkout_status         text not null default 'checked_out',
  status                  text default 'allotted',
  returned_at             timestamptz,
  created_at              timestamptz default now()
);

-- ─── material_allotments ─────────────────────────────────────────────────────
create table if not exists public.material_allotments (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid references public.jobs(id) on delete cascade,
  inventory_id   uuid references public.inventory(id),
  allotted_by    uuid references public.users(id),
  quantity       numeric not null,
  status         text default 'allotted' check (status in ('allotted', 'returned', 'used')),
  allotted_at    timestamptz default now(),
  returned_at    timestamptz
);

-- ─── payments (advance salary, expenditure, materials purchase) ───────────────
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('advance_salary', 'materials_purchase', 'daily_expenditure', 'office_development')),
  amount      numeric not null check (amount > 0),
  description text,
  user_id     uuid references public.users(id),
  created_by  uuid references public.users(id),
  created_at  timestamptz default now()
);

-- ─── staff_rates ─────────────────────────────────────────────────────────────
create table if not exists public.staff_rates (
  user_id                        uuid primary key references public.users(id) on delete cascade,
  base_daily_rate                numeric default 0 check (base_daily_rate >= 0),
  ot_rate_per_hour               numeric default 0 check (ot_rate_per_hour >= 0),
  early_deduction_per_hour       numeric default 0 check (early_deduction_per_hour >= 0),
  monthly_salary                 numeric default 0 check (monthly_salary >= 0),
  halfday_deduction              numeric default 0 check (halfday_deduction >= 0),
  late_in_deduction              numeric default 0 check (late_in_deduction >= 0),
  late_in_threshold_minutes      integer default 15 check (late_in_threshold_minutes >= 0),
  early_in_bonus                 numeric default 0 check (early_in_bonus >= 0),
  late_out_bonus                 numeric default 0 check (late_out_bonus >= 0),
  customer_review_bonus          numeric default 0 check (customer_review_bonus >= 0),
  customer_review_penalty        numeric default 0 check (customer_review_penalty >= 0),
  job_completion_bonus_threshold integer default 30 check (job_completion_bonus_threshold >= 0),
  job_completion_bonus_amount    numeric default 0 check (job_completion_bonus_amount >= 0),
  technician_incentive_percent   numeric default 0 check (technician_incentive_percent >= 0)
);

-- ─── staff_incentives ─────────────────────────────────────────────────────────
create table if not exists public.staff_incentives (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  job_id      uuid references public.jobs(id) on delete set null,
  sale_id     uuid references public.sales(id) on delete set null,
  source_type text check (source_type in ('job', 'sale', 'manual')),
  role_type   text,
  amount      numeric not null default 0,
  description text,
  accrued_at  timestamptz default now(),
  created_at  timestamptz default now()
);

-- ─── salary ───────────────────────────────────────────────────────────────────
create table if not exists public.salary (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references public.users(id) on delete cascade,
  month                     date not null,
  base_daily_rate           numeric default 0,
  working_days              integer default 0,
  present_days              integer default 0,
  halfday_count             integer default 0,
  leave_count               integer default 0,
  ot_hours                  numeric default 0,
  ot_rate_per_hour          numeric default 0,
  early_hours               numeric default 0,
  early_deduction_per_hour  numeric default 0,
  advance_deducted          numeric default 0,
  gross_salary              numeric default 0,
  net_salary                numeric default 0,
  monthly_salary_base       numeric default 0,
  halfday_deduction_total   numeric default 0,
  absence_deduction_total   numeric default 0,
  late_in_deduction_total   numeric default 0,
  early_out_deduction_total numeric default 0,
  customer_review_deduction numeric default 0,
  early_in_bonus_total      numeric default 0,
  late_out_bonus_total      numeric default 0,
  overtime_pay              numeric default 0,
  customer_review_bonus_total numeric default 0,
  job_completion_bonus      numeric default 0,
  incentive_amount          numeric default 0,
  bonus_amount              numeric default 0,
  leave_deduction           numeric default 0,
  late_deduction            numeric default 0,
  early_deduction           numeric default 0,
  status                    text default 'draft' check (status in ('draft', 'paid')),
  generated_by              uuid references public.users(id) on delete set null,
  paid_at                   timestamptz,
  created_at                timestamptz default now(),
  unique(user_id, month)
);

-- ─── payroll_audit_log ───────────────────────────────────────────────────────
create table if not exists public.payroll_audit_log (
  id           uuid primary key default gen_random_uuid(),
  salary_id    uuid references public.salary(id) on delete cascade,
  user_id      uuid references public.users(id),
  action       text,
  old_snapshot jsonb,
  new_snapshot jsonb,
  changed_by   uuid references public.users(id),
  changed_at   timestamptz default now()
);

-- ─── employee_bonus ───────────────────────────────────────────────────────────
create table if not exists public.employee_bonus (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id),
  amount     numeric not null,
  reason     text not null,
  month      integer not null,
  year       integer not null,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- ─── employee_leave ───────────────────────────────────────────────────────────
create table if not exists public.employee_leave (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  leave_date   date not null,
  leave_type   text not null check (leave_type in ('sick', 'casual', 'unpaid', 'earned')),
  reason       text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by  uuid references public.users(id),
  created_at   timestamptz default now()
);

-- ─── notifications ────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid references public.jobs(id) on delete set null,
  recipient_user_id uuid references public.users(id) on delete cascade,
  channel           text not null check (channel in ('push', 'whatsapp', 'email', 'in-app')) default 'in-app',
  title             text,
  message           text not null,
  sent_at           timestamptz,
  status            text default 'pending' check (status in ('pending', 'sent', 'failed', 'read', 'unread')),
  type              text,
  is_read           boolean default false,
  created_at        timestamptz default now()
);

-- ─── customer_reviews ─────────────────────────────────────────────────────────
create table if not exists public.customer_reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  job_id     uuid references public.jobs(id) on delete set null,
  score      numeric not null check (score >= 1.0 and score <= 5.0),
  comments   text,
  created_at timestamptz default now()
);

-- ─── holidays ─────────────────────────────────────────────────────────────────
create table if not exists public.holidays (
  id           uuid primary key default gen_random_uuid(),
  date         date not null unique,
  name         text not null,
  is_recurring boolean default false,
  created_at   timestamptz default now()
);

-- ─── geofence_settings ───────────────────────────────────────────────────────
create table if not exists public.geofence_settings (
  id            uuid primary key default gen_random_uuid(),
  center_lat    numeric not null,
  center_lng    numeric not null,
  radius_meters integer not null default 200,
  is_active     boolean default true,
  updated_at    timestamptz default now()
);

-- ─── whatsapp_settings ────────────────────────────────────────────────────────
create table if not exists public.whatsapp_settings (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null default 'twilio',
  account_sid      text,
  auth_token_enc   text,
  from_number      text,
  webhook_url      text,
  is_active        boolean default true,
  updated_at       timestamptz default now()
);

-- ─── whatsapp_logs ────────────────────────────────────────────────────────────
create table if not exists public.whatsapp_logs (
  id           uuid primary key default gen_random_uuid(),
  event_type   text,
  payload      jsonb,
  status       text default 'sent',
  error_detail text,
  created_at   timestamptz default now()
);

-- ─── whatsapp_messages ────────────────────────────────────────────────────────
create table if not exists public.whatsapp_messages (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references public.jobs(id) on delete set null,
  to_number     text,
  message_body  text,
  status        text default 'pending',
  sent_at       timestamptz,
  error_detail  text,
  created_at    timestamptz default now()
);

-- ─── export_jobs ─────────────────────────────────────────────────────────────
create table if not exists public.export_jobs (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('monthly-data', 'attendance-report', 'attendance-selfie', 'onsite-photo', 'invoice', 'receipt')),
  status        text not null default 'running' check (status in ('running', 'success', 'failed')),
  target_month  text,
  drive_file_id text,
  drive_link    text,
  error_message text,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ─── pending_uploads ──────────────────────────────────────────────────────────
create table if not exists public.pending_uploads (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('attendance-selfie', 'onsite-photo', 'invoice', 'receipt')),
  reference_id    uuid not null,
  reference_table text not null,
  payload_json    jsonb not null default '{}',
  attempts        int not null default 0,
  last_error      text,
  created_at      timestamptz not null default now()
);

-- ─── products audit log ───────────────────────────────────────────────────────
-- (implicit via triggers; no separate table needed — audit stored inline)


-- ============================================================================
-- 4. UI LOOKUP TABLES (read-only dropdown config)
-- ============================================================================

create table if not exists public.ui_job_statuses (
  id          text primary key,
  code        text,
  label       text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.ui_priorities (
  id          text primary key,
  code        text,
  label       text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.ui_service_locations (
  id          text primary key,
  code        text,
  label       text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.ui_payment_statuses (
  id          text primary key,
  code        text,
  label       text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.ui_sale_statuses (
  id          text primary key,
  code        text,
  label       text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.ui_payment_methods (
  id          text primary key,
  code        text,
  label       text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.ui_roles (
  id          text primary key,
  code        text,
  label       text,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);


-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- jobs
create index if not exists idx_jobs_job_code        on public.jobs(job_code);
create index if not exists idx_jobs_status          on public.jobs(status);
create index if not exists idx_jobs_technician_id   on public.jobs(technician_id);
create index if not exists idx_jobs_receptionist_id on public.jobs(receptionist_id);

-- attendance
create index if not exists idx_attendance_user_date on public.attendance(user_id, date);

-- salary / payments / notifications
create index if not exists idx_salary_user_month         on public.salary(user_id, month);
create index if not exists idx_payments_user_id          on public.payments(user_id);
create index if not exists idx_payments_created_by       on public.payments(created_by);
create index if not exists idx_notifications_recipient   on public.notifications(recipient_user_id);
create index if not exists idx_notifications_job_id      on public.notifications(job_id);

-- inventory
create index if not exists idx_inventory_product_id      on public.inventory(product_id);

-- job_materials
create index if not exists idx_job_materials_job_id      on public.job_materials(job_id);
create index if not exists idx_job_materials_technician_id on public.job_materials(technician_id);
create index if not exists idx_job_materials_inventory_id on public.job_materials(inventory_id);

-- invoices / invoice_items
create index if not exists idx_invoices_job_id           on public.invoices(job_id);
create index if not exists idx_invoice_items_invoice_id  on public.invoice_items(invoice_id);

-- staff_incentives
create index if not exists idx_staff_incentives_user_id  on public.staff_incentives(user_id);

-- employee_bonus
create index if not exists idx_employee_bonus_user_id    on public.employee_bonus(user_id);
create index if not exists idx_employee_bonus_created_by on public.employee_bonus(created_by);

-- export_jobs
create index if not exists export_jobs_type_status_idx   on public.export_jobs(type, status, started_at desc);

-- pending_uploads
create index if not exists pending_uploads_attempts_idx  on public.pending_uploads(attempts asc, created_at asc);


-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

alter table public.users                enable row level security;
alter table public.jobs                 enable row level security;
alter table public.job_types            enable row level security;
alter table public.job_technicians      enable row level security;
alter table public.job_materials        enable row level security;
alter table public.attendance           enable row level security;
alter table public.onsite_visits        enable row level security;
alter table public.products             enable row level security;
alter table public.inventory            enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.inventory_audit_log  enable row level security;
alter table public.billing_legacy         enable row level security;
alter table public.invoices             enable row level security;
alter table public.invoice_items        enable row level security;
alter table public.sales                enable row level security;
alter table public.sale_types           enable row level security;
alter table public.sale_items           enable row level security;
alter table public.material_allotments  enable row level security;
alter table public.job_materials        enable row level security;
alter table public.payments             enable row level security;
alter table public.staff_rates          enable row level security;
alter table public.staff_incentives     enable row level security;
alter table public.salary               enable row level security;
alter table public.payroll_audit_log    enable row level security;
alter table public.employee_bonus       enable row level security;
alter table public.employee_leave       enable row level security;
alter table public.notifications        enable row level security;
alter table public.customer_reviews     enable row level security;
alter table public.holidays             enable row level security;
alter table public.geofence_settings    enable row level security;
alter table public.whatsapp_settings    enable row level security;
alter table public.whatsapp_logs        enable row level security;
alter table public.whatsapp_messages    enable row level security;
alter table public.export_jobs          enable row level security;
alter table public.pending_uploads      enable row level security;
alter table public.ui_job_statuses      enable row level security;
alter table public.ui_priorities        enable row level security;
alter table public.ui_service_locations enable row level security;
alter table public.ui_payment_statuses  enable row level security;
alter table public.ui_sale_statuses     enable row level security;
alter table public.ui_payment_methods   enable row level security;
alter table public.ui_roles             enable row level security;
alter table public.ui_device_types      enable row level security;


-- ============================================================================
-- 7. RLS POLICIES (final consolidated state — all using (select ...) wrappers)
-- ============================================================================

-- ─── users ───────────────────────────────────────────────────────────────────
-- SELECT: any authenticated user (needed for staff lookups)
create policy "users_select_authenticated"
  on public.users for select to authenticated
  using ((select auth.role()) = 'authenticated');

-- UPDATE: own profile
create policy "users_update_own_profile"
  on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ALL: admin only
create policy "users_all_admin"
  on public.users for all to authenticated
  using ((select public.is_admin()));

-- ─── jobs ─────────────────────────────────────────────────────────────────────
create policy "jobs_select_staff"
  on public.jobs for select to authenticated
  using (
    (select public.is_admin())
    or (select public.is_receptionist())
    or ((select public.is_technician()) and technician_id = (select auth.uid()))
  );

create policy "jobs_write_admin_receptionist"
  on public.jobs for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

create policy "jobs_update_technician_assigned"
  on public.jobs for update to authenticated
  using ((select public.is_technician()) and technician_id = (select auth.uid()));

-- ─── job_types ────────────────────────────────────────────────────────────────
create policy "job_types_admin_all"
  on public.job_types for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "job_types_staff_read"
  on public.job_types for select to authenticated
  using (is_active = true);

-- ─── job_technicians ──────────────────────────────────────────────────────────
create policy "job_technicians_admin_receptionist_all"
  on public.job_technicians for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

create policy "job_technicians_tech_select"
  on public.job_technicians for select to authenticated
  using (technician_id = (select auth.uid()));

-- ─── attendance ───────────────────────────────────────────────────────────────
create policy "attendance_select"
  on public.attendance for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

create policy "attendance_insert_own"
  on public.attendance for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "attendance_update"
  on public.attendance for update to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()))
  with check ((select auth.uid()) = user_id or (select public.is_admin()));

create policy "attendance_all_admin"
  on public.attendance for all to authenticated
  using ((select public.is_admin()));

-- ─── onsite_visits ────────────────────────────────────────────────────────────
create policy "onsite_visits_admin_receptionist_all"
  on public.onsite_visits for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

create policy "onsite_visits_technician_own"
  on public.onsite_visits for all to authenticated
  using (technician_id = (select auth.uid()))
  with check (technician_id = (select auth.uid()));

-- ─── products ─────────────────────────────────────────────────────────────────
create policy "products_select_authenticated"
  on public.products for select to authenticated
  using (true);

create policy "products_write_admin"
  on public.products for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ─── inventory ────────────────────────────────────────────────────────────────
create policy "inventory_select_staff"
  on public.inventory for select to authenticated
  using (true);

create policy "inventory_write_admin_receptionist"
  on public.inventory for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

-- ─── inventory_transactions ───────────────────────────────────────────────────
create policy "inventory_transactions_select_admin_receptionist"
  on public.inventory_transactions for select to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()));

create policy "inventory_transactions_insert_admin"
  on public.inventory_transactions for insert to authenticated
  with check ((select public.is_admin()));

-- ─── inventory_audit_log ─────────────────────────────────────────────────────
create policy "inventory_audit_log_select_admin"
  on public.inventory_audit_log for select to authenticated
  using ((select public.is_admin()));

-- ─── billing_legacy ──────────────────────────────────────────────────────────
create policy "billing_legacy_read_only"
  on public.billing_legacy for select to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()));

-- ─── invoices ─────────────────────────────────────────────────────────────────
create policy "invoices_admin_receptionist_all"
  on public.invoices for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

-- ─── invoice_items ────────────────────────────────────────────────────────────
create policy "invoice_items_admin_receptionist_all"
  on public.invoice_items for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

-- ─── sales ────────────────────────────────────────────────────────────────────
create policy "sales_admin_receptionist_all"
  on public.sales for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

create policy "sales_tech_select"
  on public.sales for select to authenticated
  using ((select public.is_technician()) and created_by = (select auth.uid()));

-- ─── sale_types ───────────────────────────────────────────────────────────────
create policy "sale_types_admin_all"
  on public.sale_types for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "sale_types_staff_read"
  on public.sale_types for select to authenticated
  using (is_active = true);

-- ─── sale_items ───────────────────────────────────────────────────────────────
create policy "sale_items_admin_receptionist_all"
  on public.sale_items for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

-- ─── material_allotments ─────────────────────────────────────────────────────
create policy "material_allotments_admin_receptionist_all"
  on public.material_allotments for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

create policy "material_allotments_tech_select"
  on public.material_allotments for select to authenticated
  using (allotted_by = (select auth.uid()) or exists (
    select 1 from public.jobs where jobs.id = material_allotments.job_id
    and jobs.technician_id = (select auth.uid())
  ));

-- ─── job_materials ────────────────────────────────────────────────────────────
create policy "job_materials_admin_receptionist_all"
  on public.job_materials for all to authenticated
  using ((select public.is_admin()) or (select public.is_receptionist()))
  with check ((select public.is_admin()) or (select public.is_receptionist()));

create policy "job_materials_technician_select"
  on public.job_materials for select to authenticated
  using (
    technician_id = (select auth.uid())
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id
        and jobs.technician_id = (select auth.uid())
    )
  );

create policy "job_materials_technician_insert"
  on public.job_materials for insert to authenticated
  with check (
    technician_id = (select auth.uid())
    or technician_id is null
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id
        and jobs.technician_id = (select auth.uid())
    )
  );

create policy "job_materials_technician_update"
  on public.job_materials for update to authenticated
  using (
    technician_id = (select auth.uid())
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id
        and jobs.technician_id = (select auth.uid())
    )
  );

create policy "job_materials_technician_delete"
  on public.job_materials for delete to authenticated
  using (
    technician_id = (select auth.uid())
    or exists (
      select 1 from public.jobs
      where jobs.id = job_materials.job_id
        and jobs.technician_id = (select auth.uid())
    )
  );

-- ─── payments ─────────────────────────────────────────────────────────────────
create policy "payments_admin_only"
  on public.payments for all to authenticated
  using ((select public.is_admin()));

-- ─── staff_rates ─────────────────────────────────────────────────────────────
create policy "staff_rates_admin_only"
  on public.staff_rates for all to authenticated
  using ((select public.is_admin()));

-- ─── staff_incentives ─────────────────────────────────────────────────────────
create policy "staff_incentives_admin_all"
  on public.staff_incentives for all to authenticated
  using ((select public.is_admin()));

create policy "staff_incentives_user_read"
  on public.staff_incentives for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── salary ───────────────────────────────────────────────────────────────────
create policy "salary_admin_only"
  on public.salary for all to authenticated
  using ((select public.is_admin()));

-- ─── payroll_audit_log ────────────────────────────────────────────────────────
create policy "payroll_audit_log_admin_only"
  on public.payroll_audit_log for all to authenticated
  using ((select public.is_admin()));

-- ─── employee_bonus ───────────────────────────────────────────────────────────
create policy "employee_bonus_admin_all"
  on public.employee_bonus for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "employee_bonus_user_read"
  on public.employee_bonus for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── employee_leave ───────────────────────────────────────────────────────────
create policy "employee_leave_admin_all"
  on public.employee_leave for all to authenticated
  using ((select public.is_admin()));

create policy "employee_leave_user_own"
  on public.employee_leave for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─── notifications ────────────────────────────────────────────────────────────
create policy "notifications_all_admin"
  on public.notifications for all to authenticated
  using ((select public.is_admin()));

create policy "notifications_own_user"
  on public.notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (recipient_user_id = (select auth.uid()));

-- ─── customer_reviews ─────────────────────────────────────────────────────────
create policy "customer_reviews_admin_all"
  on public.customer_reviews for all to authenticated
  using ((select public.is_admin()));

create policy "customer_reviews_select_authenticated"
  on public.customer_reviews for select to authenticated
  using (true);

-- ─── holidays ─────────────────────────────────────────────────────────────────
create policy "holidays_all_admin"
  on public.holidays for all to authenticated
  using ((select public.is_admin()));

create policy "holidays_select_authenticated"
  on public.holidays for select to authenticated
  using ((select auth.role()) = 'authenticated');

-- ─── geofence_settings ────────────────────────────────────────────────────────
create policy "geofence_settings_admin_all"
  on public.geofence_settings for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "geofence_settings_select_staff"
  on public.geofence_settings for select to authenticated
  using (true);

-- ─── whatsapp_settings / logs / messages ──────────────────────────────────────
create policy "whatsapp_settings_admin_only"
  on public.whatsapp_settings for all to authenticated
  using ((select public.is_admin()));

create policy "whatsapp_logs_admin_only"
  on public.whatsapp_logs for all to authenticated
  using ((select public.is_admin()));

create policy "whatsapp_messages_admin_only"
  on public.whatsapp_messages for all to authenticated
  using ((select public.is_admin()));

-- ─── export_jobs ─────────────────────────────────────────────────────────────
create policy "export_jobs_admin_only"
  on public.export_jobs for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ─── pending_uploads ──────────────────────────────────────────────────────────
create policy "pending_uploads_no_direct_access"
  on public.pending_uploads for all to authenticated
  using (false);

-- ─── UI lookup tables (public read, admin write) ──────────────────────────────
create policy "ui_read_all"    on public.ui_device_types       for select using (true);
create policy "ui_admin_write" on public.ui_device_types       for all to authenticated using ((select public.is_admin()));
create policy "ui_read_all"    on public.ui_job_statuses      for select using (true);
create policy "ui_admin_write" on public.ui_job_statuses      for all to authenticated using ((select public.is_admin()));
create policy "ui_read_all"    on public.ui_priorities         for select using (true);
create policy "ui_admin_write" on public.ui_priorities         for all to authenticated using ((select public.is_admin()));
create policy "ui_read_all"    on public.ui_service_locations  for select using (true);
create policy "ui_admin_write" on public.ui_service_locations  for all to authenticated using ((select public.is_admin()));
create policy "ui_read_all"    on public.ui_payment_statuses   for select using (true);
create policy "ui_admin_write" on public.ui_payment_statuses   for all to authenticated using ((select public.is_admin()));
create policy "ui_read_all"    on public.ui_sale_statuses      for select using (true);
create policy "ui_admin_write" on public.ui_sale_statuses      for all to authenticated using ((select public.is_admin()));
create policy "ui_read_all"    on public.ui_payment_methods    for select using (true);
create policy "ui_admin_write" on public.ui_payment_methods    for all to authenticated using ((select public.is_admin()));
create policy "ui_read_all"    on public.ui_roles              for select using (true);
create policy "ui_admin_write" on public.ui_roles              for all to authenticated using ((select public.is_admin()));


-- ============================================================================

-- ============================================================================
-- ADDED TRIGGERS (completed_at, sync_primary_technician, notify_job_event)
-- ============================================================================

-- Set completed_at when status becomes Completed
create or replace function public.set_job_completed_at()
returns trigger language plpgsql security definer
as $$
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    new.completed_at := now();
  elsif new.status is distinct from 'Completed' and old.status = 'Completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_set_job_completed_at
before update on public.jobs
for each row execute function public.set_job_completed_at();

-- Sync primary technician
create or replace function public.sync_primary_technician()
returns trigger language plpgsql security definer
as $$
declare
  v_tech_id uuid;
begin
  select technician_id into v_tech_id
  from public.job_technicians
  where job_id = coalesce(new.job_id, old.job_id) and removed_at is null
  order by assigned_at asc limit 1;
  
  update public.jobs
  set technician_id = v_tech_id
  where id = coalesce(new.job_id, old.job_id);
  
  return coalesce(new, old);
end;
$$;

create trigger trg_sync_primary_technician
after insert or update or delete on public.job_technicians
for each row execute function public.sync_primary_technician();

-- Internal Notifications
create or replace function public.notify_job_event()
returns trigger language plpgsql security definer
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_user_id, job_id, title, message, type, channel)
    select technician_id, new.id, 'New Job Assigned', 'Job ' || new.job_code || ' has been assigned to you.', 'job_assigned', 'in-app'
    from public.job_technicians where job_id = new.id and removed_at is null;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.notifications (recipient_user_id, job_id, title, message, type, channel)
    select receptionist_id, new.id, 'Job Status Updated', 'Job ' || new.job_code || ' is now ' || new.status, 'job_status', 'in-app'
    from public.jobs where id = new.id and receptionist_id is not null;
  end if;
  return new;
end;
$$;

create trigger trg_notify_job_event
after insert or update on public.jobs
for each row execute function public.notify_job_event();

-- 8. TRIGGER FUNCTIONS
-- ============================================================================

-- Update job status_changed_at
create or replace function public.update_job_status_changed_at()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger trigger_update_job_status_changed_at
before update on public.jobs
for each row execute function public.update_job_status_changed_at();

-- Sync technician_id → job_technicians (multi-tech bridge)
create or replace function public.sync_initial_technician()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.technician_id is not null
     and (tg_op = 'INSERT' or old.technician_id is distinct from new.technician_id) then
    if not exists (
      select 1 from public.job_technicians
      where job_id = new.id and technician_id = new.technician_id and removed_at is null
    ) then
      insert into public.job_technicians (job_id, technician_id)
      values (new.id, new.technician_id)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger sync_initial_technician_trigger
after insert or update of technician_id on public.jobs
for each row execute function public.sync_initial_technician();

-- Accrue incentives (consolidated: jobs + sales in one function)
create or replace function public.accrue_incentives()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_tech_count  int;
  v_split_amount numeric;
  v_tech        record;
begin
  if tg_table_name = 'jobs' then
    if new.status = 'Completed'
       and (tg_op = 'INSERT' or coalesce(old.status, '') != 'Completed') then
      delete from public.staff_incentives where job_id = new.id and source_type = 'job';
      if coalesce(new.snap_technician_incentive, 0) > 0 then
        select count(*) into v_tech_count
        from public.job_technicians where job_id = new.id and removed_at is null;
        if v_tech_count > 0 then
          v_split_amount := new.snap_technician_incentive / v_tech_count;
          for v_tech in
            select technician_id from public.job_technicians
            where job_id = new.id and removed_at is null
          loop
            insert into public.staff_incentives
              (user_id, source_type, job_id, amount, accrued_at)
            values (v_tech.technician_id, 'job', new.id, v_split_amount, now());
          end loop;
        end if;
      end if;
    end if;

  elsif tg_table_name = 'sales' then
    if coalesce(new.status, 'Paid') = 'Paid'
       and (tg_op = 'INSERT' or coalesce(old.status, '') != 'Paid') then
      if coalesce(new.snap_receptionist_incentive, 0) > 0
         and new.created_by is not null then
        delete from public.staff_incentives
        where sale_id = new.id and role_type = 'receptionist';
        insert into public.staff_incentives
          (user_id, sale_id, amount, role_type, description)
        values (
          new.created_by, new.id,
          new.snap_receptionist_incentive,
          'receptionist',
          'Sale Incentive (' || coalesce(new.sale_code, new.invoice_number, 'SALE') || ')'
        );
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Note: in the consolidated version, accrue_incentives replaces both
-- accrue_job_incentives and accrue_sale_incentives

create trigger trg_accrue_job_incentives
after insert or update on public.jobs
for each row execute function public.accrue_incentives();

create trigger trg_accrue_sale_incentives
after insert or update on public.sales
for each row execute function public.accrue_incentives();

-- Sync sale_code on sales insert
create or replace function public.sync_sale_code_and_invoice()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.sale_code is null then
    new.sale_code := public.generate_sale_code();
  end if;
  if new.invoice_number is null then
    new.invoice_number := new.sale_code;
  end if;
  return new;
end;
$$;

create trigger trg_sync_sale_code
before insert on public.sales
for each row execute function public.sync_sale_code_and_invoice();

-- Recalculate sale totals when sale_items change
create or replace function public.recalculate_sale_totals()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_sale_id uuid;
  v_subtotal numeric;
begin
  v_sale_id := coalesce(new.sale_id, old.sale_id);
  select coalesce(sum(total_price), 0) into v_subtotal
  from public.sale_items where sale_id = v_sale_id;
  update public.sales
  set subtotal = v_subtotal, grand_total = v_subtotal - coalesce(discount, 0)
  where id = v_sale_id;
  return coalesce(new, old);
end;
$$;

create trigger sale_items_recalculate_totals
after insert or update or delete on public.sale_items
for each row execute function public.recalculate_sale_totals();

-- Process inventory stock changes (consolidated: job_materials + sale_items)
create or replace function public.process_inventory_stock_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  target_inventory_id uuid;
  current_stock       numeric;
  display_name        text;
  qty_needed          numeric;
  qty_delta           numeric;
begin
  if tg_op = 'DELETE' then
    target_inventory_id := old.inventory_id;
    display_name := case tg_table_name
      when 'job_materials' then old.material_name
      when 'sale_items' then old.item_name
    end;
  else
    target_inventory_id := new.inventory_id;
    display_name := case tg_table_name
      when 'job_materials' then new.material_name
      when 'sale_items' then new.item_name
    end;
  end if;

  if target_inventory_id is null then
    select id into target_inventory_id from public.inventory
    where lower(item_name) = lower(display_name) limit 1;
  end if;

  if target_inventory_id is null then
    return coalesce(new, old);
  end if;

  select quantity into current_stock
  from public.inventory where id = target_inventory_id for update;
  current_stock := coalesce(current_stock, 0);

  if tg_op = 'INSERT' then
    qty_needed := new.quantity;
    if current_stock < qty_needed then
      raise exception 'Insufficient stock for %: requested %, only % remaining.',
        display_name, qty_needed, current_stock;
    end if;
    update public.inventory
    set quantity = quantity - qty_needed, last_updated = now()
    where id = target_inventory_id;
    if new.inventory_id is null then
      new.inventory_id := target_inventory_id;
    end if;

  elsif tg_op = 'UPDATE' then
    qty_delta := new.quantity - old.quantity;
    if qty_delta > 0 and current_stock < qty_delta then
      raise exception 'Insufficient stock for %: additional % requested, only % remaining.',
        display_name, qty_delta, current_stock;
    end if;
    update public.inventory
    set quantity = quantity - qty_delta, last_updated = now()
    where id = target_inventory_id;

  elsif tg_op = 'DELETE' then
    update public.inventory
    set quantity = quantity + old.quantity, last_updated = now()
    where id = target_inventory_id;
  end if;

  return coalesce(new, old);
end;
$$;

-- Bind stock triggers to job_materials
create trigger trg_job_materials_stock_insert
before insert on public.job_materials
for each row execute function public.process_inventory_stock_change();

create trigger trg_job_materials_stock_update
before update on public.job_materials
for each row execute function public.process_inventory_stock_change();

create trigger trg_job_materials_stock_delete
after delete on public.job_materials
for each row execute function public.process_inventory_stock_change();

-- Bind stock triggers to sale_items
create trigger trg_sale_items_stock_insert
before insert on public.sale_items
for each row execute function public.process_inventory_stock_change();

create trigger trg_sale_items_stock_update
before update on public.sale_items
for each row execute function public.process_inventory_stock_change();

create trigger trg_sale_items_stock_delete
after delete on public.sale_items
for each row execute function public.process_inventory_stock_change();

-- trg_set_job_material_defaults removed: total_cost is generated always.

-- Inventory audit log trigger
create or replace function public.audit_inventory_changes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.inventory_audit_log
    (inventory_id, changed_by, change_type, old_quantity, new_quantity)
  values (new.id, auth.uid(), tg_op, old.quantity, new.quantity);
  return new;
end;
$$;

create trigger trg_audit_inventory
after update on public.inventory
for each row execute function public.audit_inventory_changes();

-- Products updated_at
create or replace function public.set_products_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_products_updated_at();

-- Products audit log
create or replace function public.audit_products_changes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- Lightweight audit: just log in inventory_audit_log if linked
  return new;
end;
$$;

create trigger trg_audit_products
after update on public.products
for each row execute function public.audit_products_changes();

-- Inventory ledger: prevent mutations after insert
create or replace function public.ledger_sync_inventory_quantity()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- No-op placeholder; stock is managed by process_inventory_stock_change
  return new;
end;
$$;

create trigger trg_ledger_sync_quantity
before insert on public.inventory_transactions
for each row execute function public.ledger_sync_inventory_quantity();

create or replace function public.prevent_ledger_mutation()
returns trigger language plpgsql
as $$
begin
  raise exception 'inventory_transactions is an immutable ledger — updates and deletes are not allowed.';
end;
$$;

create trigger trg_prevent_ledger_update
before update on public.inventory_transactions
for each row execute function public.prevent_ledger_mutation();

create trigger trg_prevent_ledger_delete
before delete on public.inventory_transactions
for each row execute function public.prevent_ledger_mutation();

-- Invoice items: prevent mutations after insert
create or replace function public.prevent_invoice_item_mutation()
returns trigger language plpgsql
as $$
begin
  raise exception 'invoice_items is immutable — updates and deletes are not allowed.';
end;
$$;

create trigger trg_prevent_invoice_item_update
before update on public.invoice_items
for each row execute function public.prevent_invoice_item_mutation();

create trigger trg_prevent_invoice_item_delete
before delete on public.invoice_items
for each row execute function public.prevent_invoice_item_mutation();

-- Payroll audit log trigger
create or replace function public.log_payroll_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.payroll_audit_log
    (salary_id, user_id, action, old_snapshot, new_snapshot, changed_by)
  values (
    coalesce(new.id, old.id),
    coalesce(new.user_id, old.user_id),
    tg_op,
    case when tg_op != 'INSERT' then row_to_json(old)::jsonb end,
    case when tg_op != 'DELETE' then row_to_json(new)::jsonb end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;


-- WhatsApp webhook trigger function
create or replace function public.invoke_whatsapp_webhook()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
  p_event_type text := TG_ARGV[0];
begin
  select webhook_url, auth_token_enc into v_url, v_secret
  from public.whatsapp_settings where is_active = true limit 1;

  if v_url is null then
    return coalesce(new, old);
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_secret, '')
    ),
    body    := jsonb_build_object(
      'event', p_event_type,
      'record', row_to_json(coalesce(new, old))
    )
  );
  return coalesce(new, old);
end;
$$;

create trigger trigger_whatsapp_job_created
after insert on public.jobs
for each row execute function public.invoke_whatsapp_webhook('JOB_CREATED');

create trigger trigger_whatsapp_job_updated
after update on public.jobs
for each row
when (
  old.status is distinct from new.status
  or old.technician_id is distinct from new.technician_id
  or old.completed_at is distinct from new.completed_at
)
execute function public.invoke_whatsapp_webhook('JOB_UPDATED');

create trigger trigger_whatsapp_sale_created
after insert on public.sales
for each row execute function public.invoke_whatsapp_webhook('SALE_CREATED');

create trigger trigger_whatsapp_invoice_generated
after insert on public.invoices
for each row execute function public.invoke_whatsapp_webhook('INVOICE_GENERATED');

create trigger trigger_whatsapp_payment_received
after update of status on public.invoices
for each row
when (old.status is distinct from 'paid' and new.status = 'paid')
execute function public.invoke_whatsapp_webhook('PAYMENT_RECEIVED');


-- ============================================================================
-- 9. RPC FUNCTIONS
-- ============================================================================

-- Add stock (admin only)
create or replace function public.add_stock(
  p_product_id     uuid,
  p_quantity       numeric,
  p_rate           numeric,
  p_notes          text,
  p_serial_numbers text default null
)
returns void
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_inventory_id uuid;
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and is_active = true
  ) then
    raise exception 'Unauthorized: Only admins can add stock manually.';
  end if;

  update public.inventory
  set quantity_cached = quantity_cached + p_quantity,
      purchase_rate   = p_rate,
      last_updated    = now()
  where product_id = p_product_id
  returning id into v_inventory_id;

  if v_inventory_id is null then
    raise exception 'Inventory record not found for product %', p_product_id;
  end if;

  insert into public.inventory_transactions
    (inventory_id, transaction_type, quantity, reference_note, created_by, serial_numbers)
  values (v_inventory_id, 'IN', p_quantity, p_notes, auth.uid(), p_serial_numbers);
end;
$$;

-- Create invoice (final version with serial_number support)
create or replace function public.create_invoice(
  p_customer_name     text,
  p_customer_contact  text    default null,
  p_customer_email    text    default null,
  p_customer_gstin    text    default null,
  p_tax_regime        text    default 'intra_state',
  p_items             jsonb   default '[]',
  p_discount          numeric default 0,
  p_payment_method    text    default 'Cash',
  p_status            text    default 'paid',
  p_notes             text    default null,
  p_job_id            uuid    default null
)
returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_invoice_id     uuid;
  v_invoice_code   text;
  v_item           jsonb;
  v_product_id     uuid;
  v_item_name      text;
  v_quantity       numeric;
  v_selling_rate   numeric;
  v_selling_amount numeric;
  v_serial_number  text;
  v_cgst_rate      numeric;
  v_sgst_rate      numeric;
  v_igst_rate      numeric;
  v_tax_mode       text;
  v_line_total     numeric;
  v_taxable        numeric;
  v_cgst_amt       numeric;
  v_sgst_amt       numeric;
  v_igst_amt       numeric;
  v_subtotal       numeric := 0;
  v_total_cgst     numeric := 0;
  v_total_sgst     numeric := 0;
  v_total_igst     numeric := 0;
  v_total_tax      numeric := 0;
  v_grand_total    numeric;
  v_round_off      numeric;
  v_purchase_rate  numeric;
  v_norm_status    text;
  v_norm_payment   text;
  v_norm_regime    text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  v_norm_status := case lower(p_status)
    when 'paid'      then 'paid'
    when 'draft'     then 'draft'
    when 'cancelled' then 'cancelled'
    else 'paid'
  end;

  v_norm_payment := case lower(p_payment_method)
    when 'cash'          then 'Cash'
    when 'card'          then 'Card'
    when 'upi'           then 'UPI'
    when 'bank transfer' then 'Bank Transfer'
    else p_payment_method
  end;

  v_norm_regime := case lower(p_tax_regime)
    when 'intra_state' then 'intra_state'
    when 'inter_state' then 'inter_state'
    else 'intra_state'
  end;

  v_invoice_code := public.generate_invoice_code();

  insert into public.invoices (
    invoice_code, customer_name, customer_contact, customer_email,
    customer_gstin, tax_regime, subtotal, total_cgst, total_sgst, total_igst,
    discount, round_off, grand_total, payment_method, status, notes, job_id,
    created_by, paid_at
  ) values (
    v_invoice_code, p_customer_name, p_customer_contact, p_customer_email,
    p_customer_gstin, v_norm_regime,
    0, 0, 0, 0,
    coalesce(p_discount, 0), 0, 0,
    v_norm_payment, v_norm_status, p_notes, p_job_id, auth.uid(),
    case when v_norm_status = 'paid' then now() else null end
  )
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id    := nullif((v_item->>'product_id'), '')::uuid;
    v_item_name     := coalesce(v_item->>'item_name', 'Item');
    v_quantity      := coalesce((v_item->>'quantity')::numeric, 1);
    v_selling_rate  := nullif((v_item->>'selling_rate'), '')::numeric;
    v_selling_amount:= nullif((v_item->>'selling_amount'), '')::numeric;
    v_serial_number := nullif((v_item->>'serial_number'), '');
    v_cgst_rate     := coalesce(nullif((v_item->>'cgst_rate'), '')::numeric, 0);
    v_sgst_rate     := coalesce(nullif((v_item->>'sgst_rate'), '')::numeric, 0);
    v_igst_rate     := coalesce(nullif((v_item->>'igst_rate'), '')::numeric, 0);
    v_tax_mode      := coalesce(nullif(v_item->>'tax_mode', ''), 'exclusive');

    if v_product_id is not null then
      select i.purchase_rate into v_purchase_rate
      from public.inventory i where i.product_id = v_product_id limit 1;

      if v_selling_rate is null and v_selling_amount is not null then
        v_selling_rate := v_selling_amount / v_quantity;
      elsif v_selling_rate is not null and v_selling_amount is null then
        v_selling_amount := v_selling_rate * v_quantity;
      elsif v_selling_rate is null and v_selling_amount is null then
        v_selling_rate := coalesce(v_purchase_rate, 0);
        v_selling_amount := v_selling_rate * v_quantity;
      end if;

      select coalesce(p.cgst_rate, 9), coalesce(p.sgst_rate, 9),
             coalesce(p.igst_rate, 18), coalesce(p.tax_mode, 'exclusive')
      into v_cgst_rate, v_sgst_rate, v_igst_rate, v_tax_mode
      from public.products p where p.id = v_product_id;
    else
      if v_selling_rate is null and v_selling_amount is not null then
        v_selling_rate := v_selling_amount / v_quantity;
      elsif v_selling_rate is not null and v_selling_amount is null then
        v_selling_amount := v_selling_rate * v_quantity;
      elsif v_selling_rate is null and v_selling_amount is null then
        v_selling_rate := 0; v_selling_amount := 0;
      end if;
    end if;

    if v_norm_regime = 'inter_state' then
      v_cgst_rate := 0; v_sgst_rate := 0;
    else
      v_igst_rate := 0;
    end if;

    if v_tax_mode = 'inclusive' then
      declare v_combined_rate numeric := v_cgst_rate + v_sgst_rate + v_igst_rate;
      begin
        v_taxable  := round(v_selling_amount / (1 + v_combined_rate / 100), 2);
        v_cgst_amt := round(v_taxable * v_cgst_rate / 100, 2);
        v_sgst_amt := round(v_taxable * v_sgst_rate / 100, 2);
        v_igst_amt := round(v_taxable * v_igst_rate / 100, 2);
        v_line_total := v_selling_amount;
      end;
    else
      v_taxable    := coalesce(v_selling_amount, 0);
      v_cgst_amt   := round(v_taxable * v_cgst_rate / 100, 2);
      v_sgst_amt   := round(v_taxable * v_sgst_rate / 100, 2);
      v_igst_amt   := round(v_taxable * v_igst_rate / 100, 2);
      v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    end if;

    v_subtotal   := v_subtotal   + coalesce(v_taxable, 0);
    v_total_cgst := v_total_cgst + v_cgst_amt;
    v_total_sgst := v_total_sgst + v_sgst_amt;
    v_total_igst := v_total_igst + v_igst_amt;
    v_total_tax  := v_total_tax  + v_cgst_amt + v_sgst_amt + v_igst_amt;

    insert into public.invoice_items (
      invoice_id, product_id, item_name, quantity, selling_rate, serial_number,
      cgst_rate, sgst_rate, igst_rate, taxable_amount,
      cgst_amount, sgst_amount, igst_amount, discount_amount, line_total
    ) values (
      v_invoice_id, v_product_id, v_item_name, v_quantity,
      coalesce(v_selling_rate, 0), v_serial_number,
      v_cgst_rate, v_sgst_rate, v_igst_rate,
      coalesce(v_taxable, 0), v_cgst_amt, v_sgst_amt, v_igst_amt, 0, v_line_total
    );

    if v_product_id is not null then
      update public.inventory
      set quantity_cached = greatest(coalesce(quantity_cached, 0) - v_quantity, 0),
          last_updated    = now()
      where product_id = v_product_id;
    end if;
  end loop;

  v_grand_total := v_subtotal + v_total_tax - coalesce(p_discount, 0);
  v_round_off   := round(v_grand_total) - v_grand_total;
  v_grand_total := round(v_grand_total);

  update public.invoices
  set subtotal   = round(v_subtotal, 2),
      total_cgst = round(v_total_cgst, 2),
      total_sgst = round(v_total_sgst, 2),
      total_igst = round(v_total_igst, 2),
      round_off  = round(v_round_off, 2),
      grand_total= v_grand_total
  where id = v_invoice_id;

  return jsonb_build_object('invoice_id', v_invoice_id, 'invoice_code', v_invoice_code);
end;
$$;

grant execute on function public.create_invoice(text,text,text,text,text,jsonb,numeric,text,text,text,uuid) to authenticated;
grant execute on function public.add_stock(uuid, numeric, numeric, text, text) to authenticated;
grant execute on function public.generate_job_code() to authenticated;
grant execute on function public.generate_invoice_code() to authenticated;




-- ============================================================================
-- 11. SEED DATA (UI lookup tables)
-- ============================================================================

insert into public.ui_device_types (id, code, label, sort_order) values
  ('Laptop', 'laptop', 'Laptop', 1),
  ('Desktop', 'desktop', 'Desktop', 2),
  ('Mobile', 'mobile', 'Mobile', 3),
  ('Tablet', 'tablet', 'Tablet', 4),
  ('Printer', 'printer', 'Printer', 5),
  ('Other', 'other', 'Other', 6)
on conflict (id) do nothing;

insert into public.ui_job_statuses (id, code, label, sort_order) values
  ('Received', 'received', 'Received', 1),
  ('In Progress', 'in_progress', 'In Progress', 2),
  ('Waiting for Materials', 'waiting_for_materials', 'Waiting for Materials', 3),
  ('Completed', 'completed', 'Completed', 4),
  ('Delivered', 'delivered', 'Delivered', 5),
  ('Cancelled', 'cancelled', 'Cancelled', 6)
on conflict (id) do nothing;

insert into public.ui_priorities (id, code, label, sort_order) values
  ('Normal', 'normal', 'Normal', 1),
  ('High', 'high', 'High', 2),
  ('Urgent', 'urgent', 'Urgent', 3)
on conflict (id) do nothing;

insert into public.ui_service_locations (id, code, label, sort_order) values
  ('Inhouse', 'inhouse', 'Inhouse', 1),
  ('Onsite', 'onsite', 'Onsite', 2)
on conflict (id) do nothing;

insert into public.ui_payment_statuses (id, code, label, sort_order) values
  ('Unpaid', 'unpaid', 'Unpaid', 1),
  ('Paid in Full', 'paid_in_full', 'Paid in Full', 2)
on conflict (id) do nothing;

insert into public.ui_sale_statuses (id, code, label, sort_order) values
  ('Paid', 'paid', 'Paid', 1),
  ('Draft', 'draft', 'Draft', 2),
  ('Cancelled', 'cancelled', 'Cancelled', 3)
on conflict (id) do nothing;

insert into public.ui_payment_methods (id, code, label, sort_order) values
  ('Cash', 'cash', 'Cash', 1),
  ('Card', 'card', 'Card', 2),
  ('UPI', 'upi', 'UPI', 3),
  ('Bank Transfer', 'bank_transfer', 'Bank Transfer', 4),
  ('Other', 'other', 'Other', 5)
on conflict (id) do nothing;

insert into public.ui_roles (id, code, label, sort_order) values
  ('admin', 'admin', 'admin', 1),
  ('receptionist', 'receptionist', 'receptionist', 2),
  ('technician', 'technician', 'technician', 3)
on conflict (id) do nothing;


-- ============================================================================
-- NOTIFY PostgREST to reload schema
-- ============================================================================
notify pgrst, 'reload schema';
create or replace function public.create_product_with_opening_stock(
  p_name text,
  p_sku text,
  p_unit text,
  p_hsn_sac text,
  p_cgst_rate numeric,
  p_sgst_rate numeric,
  p_igst_rate numeric,
  p_tax_mode text,
  p_is_active boolean,
  p_opening_quantity numeric,
  p_purchase_rate numeric,
  p_selling_rate numeric,
  p_low_stock_threshold numeric,
  p_minimum_stock_level numeric,
  p_location text
) returns uuid as $body$
declare
  v_product_id uuid;
  v_inventory_id uuid;
begin
  insert into public.products (
    name, sku, unit, hsn_sac, cgst_rate, sgst_rate, igst_rate, tax_mode, is_active
  ) values (
    p_name, p_sku, p_unit, p_hsn_sac, p_cgst_rate, p_sgst_rate, p_igst_rate, p_tax_mode, p_is_active
  ) returning id into v_product_id;

  insert into public.inventory (
    item_name, quantity, quantity_cached, unit, low_stock_threshold, minimum_stock_level, purchase_rate, selling_rate, location, product_id
  ) values (
    p_name, p_opening_quantity, p_opening_quantity, p_unit, p_low_stock_threshold, p_minimum_stock_level, p_purchase_rate, p_selling_rate, p_location, v_product_id
  ) returning id into v_inventory_id;

  if p_opening_quantity > 0 then
    insert into public.inventory_transactions (
      inventory_id, transaction_type, quantity, reference_note
    ) values (
      v_inventory_id, 'IN', p_opening_quantity, 'Opening Stock'
    );
  end if;

  return v_product_id;
end;
$body$ language plpgsql security definer;
