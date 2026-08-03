-- ============================================================================
-- Migration: 20260803000001_google_drive_integration.sql
-- Description: All database infrastructure for the Google Drive auto-export
--              and media storage system. Merged from 5 individual migrations.
--
-- Sections:
--   1. Extensions (pg_cron, pg_net)
--   2. Tables: export_jobs, pending_uploads
--   3. Indexes + RLS
--   4. Views: export_jobs_latest, stuck_uploads
--   5. Column additions: attendance, onsite_visits, billing
--   6. pg_cron schedules
--
-- BEFORE APPLYING: Replace the two placeholders in Section 6:
--   <project-ref>  → Your Supabase project reference (Settings → General)
--   <anon-key>     → Your Supabase anon key (Settings → API → anon public)
--   The service role key is NEVER placed in pg_cron SQL.
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- pg_cron: enables scheduled database jobs
create extension if not exists pg_cron with schema extensions;

-- pg_net: enables outbound HTTP calls from Postgres (used by pg_cron)
create extension if not exists pg_net with schema extensions;


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- export_jobs: records every export/upload attempt and its Drive outcome
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
  -- YYYY-MM format; null for non-monthly types (selfies, single-file uploads)
  target_month  text,
  drive_file_id text,
  drive_link    text,
  error_message text,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- pending_uploads: retry queue for Drive uploads that failed mid-flight.
-- Rows are created when a user-facing action (check-in / onsite / invoice)
-- saves its DB record but the Drive upload fails. The retry worker drains this.
create table if not exists public.pending_uploads (
  id              uuid    primary key default gen_random_uuid(),
  type            text    not null check (type in (
                            'attendance-selfie',
                            'onsite-photo',
                            'invoice',
                            'receipt'
                          )),
  reference_id    uuid    not null,
  reference_table text    not null,  -- 'attendance', 'onsite_visits', 'billing'
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

-- export_jobs: admin read/write only (shown in admin panel export history)
create policy "Admins can manage export_jobs"
  on public.export_jobs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- pending_uploads: no direct authenticated access — managed by Edge Functions only
create policy "No direct access to pending_uploads"
  on public.pending_uploads
  for all
  to authenticated
  using (false);


-- ============================================================================
-- 4. VIEWS
-- ============================================================================

-- Latest export result per type (used by admin panel status widgets)
create or replace view public.export_jobs_latest as
  select distinct on (type)
    id, type, status, target_month, drive_file_id, drive_link,
    error_message, started_at, completed_at
  from public.export_jobs
  order by type, started_at desc;

-- Count of uploads stuck after 3 failed attempts (admin panel warning banner)
create or replace view public.stuck_uploads as
  select count(*) as count
  from public.pending_uploads
  where attempts >= 3;


-- ============================================================================
-- 5. COLUMN ADDITIONS
-- ============================================================================

-- attendance: Drive links for check-in and check-out selfie WebP files
alter table public.attendance
  add column if not exists checkin_photo_drive_link  text,
  add column if not exists checkout_photo_drive_link text;

comment on column public.attendance.checkin_photo_drive_link  is 'Google Drive webViewLink for the check-in selfie WebP';
comment on column public.attendance.checkout_photo_drive_link is 'Google Drive webViewLink for the check-out selfie WebP';

-- onsite_visits: Drive links for arrival and departure selfie WebP files
alter table public.onsite_visits
  add column if not exists arrival_photo_drive_link   text,
  add column if not exists departure_photo_drive_link text;

comment on column public.onsite_visits.arrival_photo_drive_link   is 'Google Drive webViewLink for the onsite arrival selfie WebP';
comment on column public.onsite_visits.departure_photo_drive_link is 'Google Drive webViewLink for the onsite departure selfie WebP';

-- billing: Drive link for the generated invoice/receipt PDF
alter table public.billing
  add column if not exists drive_link    text,
  add column if not exists drive_file_id text,
  add column if not exists doc_type      text check (doc_type in ('invoice', 'receipt')) default 'invoice';

comment on column public.billing.drive_link    is 'Google Drive webViewLink for the generated PDF (invoice or receipt)';
comment on column public.billing.drive_file_id is 'Google Drive file ID for the generated PDF';
comment on column public.billing.doc_type      is 'Whether this billing record is an invoice (final bill) or receipt (intake)';


-- ============================================================================
-- 6. PG_CRON SCHEDULES
-- ============================================================================
-- Replace <project-ref> and <anon-key> below before applying this migration.
-- Example project-ref: abcdefghijklmnop
-- Example anon-key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
-- The anon key is the PUBLIC key from Settings → API. It is safe to store here.
-- The service role key is NEVER placed in pg_cron SQL.

-- Remove existing schedules if re-running this migration
select cron.unschedule('monthly-drive-export')    where exists (select 1 from cron.job where jobname = 'monthly-drive-export');
select cron.unschedule('monthly-attendance-export') where exists (select 1 from cron.job where jobname = 'monthly-attendance-export');
select cron.unschedule('retry-pending-uploads')   where exists (select 1 from cron.job where jobname = 'retry-pending-uploads');

-- Monthly Data Export: 1st of month at 20:00 UTC (01:30 AM IST)
-- Defaults to previous calendar month (Aug 1st run exports July data)
select cron.schedule(
  'monthly-drive-export',
  '0 20 1 * *',
  $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/export-monthly-data',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <anon-key>',
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Attendance Reports Export: 1st of month at 20:30 UTC (02:00 AM IST)
select cron.schedule(
  'monthly-attendance-export',
  '30 20 1 * *',
  $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/export-attendance-reports',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <anon-key>',
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Pending Uploads Retry Worker: every 15 minutes
select cron.schedule(
  'retry-pending-uploads',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/process-pending-uploads',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <anon-key>',
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verify after applying:
-- select jobname, schedule, active from cron.job;
