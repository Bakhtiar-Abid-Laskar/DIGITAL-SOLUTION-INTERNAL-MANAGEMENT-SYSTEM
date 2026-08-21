-- ============================================================================
-- Migration: 20260820000004_restore_google_drive.sql
-- Description: Restores Google Drive integration tables (export_jobs, pending_uploads)
--              and adds Drive link columns to attendance, onsite_visits, invoices, sales.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ============================================================================
-- 2. TABLES
-- ============================================================================
create table if not exists public.export_jobs (
  id            uuid        primary key default gen_random_uuid(),
  type          text        not null check (type in (
                              'monthly-data',
                              'attendance-report',
                              'attendance-selfie',
                              'onsite-photo',
                              'invoice',
                              'receipt'
                            )),
  status        text        not null default 'running' check (status in ('running', 'success', 'failed')),
  target_month  text,
  drive_file_id text,
  drive_link    text,
  error_message text,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.pending_uploads (
  id              uuid    primary key default gen_random_uuid(),
  type            text    not null check (type in (
                            'attendance-selfie',
                            'onsite-photo',
                            'invoice',
                            'receipt'
                          )),
  reference_id    uuid    not null,
  reference_table text    not null,
  payload_json    jsonb   not null default '{}',
  attempts        int     not null default 0,
  last_error      text,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- 3. INDEXES + ROW LEVEL SECURITY
-- ============================================================================
create index if not exists export_jobs_type_status_idx
  on public.export_jobs (type, status, started_at desc);

create index if not exists pending_uploads_attempts_idx
  on public.pending_uploads (attempts asc, created_at asc);

alter table public.export_jobs    enable row level security;
alter table public.pending_uploads enable row level security;

drop policy if exists "Admins can manage export_jobs" on public.export_jobs;
create policy "Admins can manage export_jobs"
  on public.export_jobs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "No direct access to pending_uploads" on public.pending_uploads;
create policy "No direct access to pending_uploads"
  on public.pending_uploads
  for all
  to authenticated
  using (false);

-- ============================================================================
-- 4. VIEWS
-- ============================================================================
create or replace view public.export_jobs_latest with (security_invoker = true) as
  select distinct on (type)
    id, type, status, target_month, drive_file_id, drive_link,
    error_message, started_at, completed_at
  from public.export_jobs
  order by type, started_at desc;

create or replace view public.stuck_uploads with (security_invoker = true) as
  select count(*) as count
  from public.pending_uploads
  where attempts >= 3;

-- ============================================================================
-- 5. COLUMN ADDITIONS
-- ============================================================================
alter table public.attendance
  add column if not exists checkin_photo_drive_link  text,
  add column if not exists checkout_photo_drive_link text;

alter table public.onsite_visits
  add column if not exists arrival_photo_drive_link   text,
  add column if not exists departure_photo_drive_link text,
  add column if not exists device_photo               text,
  add column if not exists device_photo_drive_link    text;

alter table public.invoices
  add column if not exists drive_link    text,
  add column if not exists drive_file_id text;

alter table public.sales
  add column if not exists drive_link    text,
  add column if not exists drive_file_id text;
