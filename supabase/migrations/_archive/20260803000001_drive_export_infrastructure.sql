-- Migration: 20260803000001_drive_export_infrastructure.sql
-- Description: Creates tables and extensions required for Google Drive
--              auto-export and media upload system.

-- ============================================================================
-- Extensions
-- ============================================================================

-- pg_cron: enables scheduled jobs (e.g. monthly export trigger)
create extension if not exists pg_cron with schema extensions;

-- pg_net: enables HTTP calls from Postgres (used by pg_cron to call Edge Functions)
create extension if not exists pg_net with schema extensions;

-- ============================================================================
-- export_jobs: Log every export/upload attempt and its outcome
-- ============================================================================

create table if not exists public.export_jobs (
  id            uuid primary key default gen_random_uuid(),

  -- What type of export this is
  type          text not null check (type in (
                  'monthly-data',
                  'attendance-report',
                  'attendance-selfie',
                  'onsite-photo',
                  'invoice',
                  'receipt'
                )),

  -- Running status
  status        text not null default 'running' check (status in ('running', 'success', 'failed')),

  -- Target month in YYYY-MM format (null for non-monthly types like selfie uploads)
  target_month  text,

  -- Drive metadata set on success
  drive_file_id text,
  drive_link    text,

  -- Error details set on failure
  error_message text,

  -- Timing
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,

  created_at    timestamptz not null default now()
);

-- Index for admin panel "last export status" queries
create index if not exists export_jobs_type_status_idx
  on public.export_jobs (type, status, started_at desc);

-- ============================================================================
-- pending_uploads: Queue for selfie/photo/PDF uploads that failed mid-flight
-- ============================================================================

-- These rows are created when a user action (check-in / onsite / invoice) succeeds
-- in the database but the Google Drive upload fails. A retry worker processes them.

create table if not exists public.pending_uploads (
  id              uuid primary key default gen_random_uuid(),

  -- What kind of file to upload
  type            text not null check (type in (
                    'attendance-selfie',
                    'onsite-photo',
                    'invoice',
                    'receipt'
                  )),

  -- The database row the upload is linked to (e.g. attendance.id, billing.id)
  reference_id    uuid not null,
  reference_table text not null, -- 'attendance', 'onsite_visits', 'billing'

  -- Full payload needed to re-attempt the upload (file bytes stored in Supabase Storage staging)
  payload_json    jsonb not null default '{}',

  -- Retry tracking
  attempts        int not null default 0,
  last_error      text,

  created_at      timestamptz not null default now()
);

-- Index for the retry worker to efficiently pull pending items
create index if not exists pending_uploads_attempts_idx
  on public.pending_uploads (attempts asc, created_at asc);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.export_jobs enable row level security;
alter table public.pending_uploads enable row level security;

-- export_jobs: only admins can read/write (used in admin panel export history)
drop policy if exists "Admins can manage export_jobs" on public.export_jobs;
create policy "Admins can manage export_jobs"
  on public.export_jobs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- pending_uploads: service role only (managed exclusively by Edge Functions)
-- No authenticated user should ever read or write this table directly.
drop policy if exists "No direct access to pending_uploads" on public.pending_uploads;
create policy "No direct access to pending_uploads"
  on public.pending_uploads
  for all
  to authenticated
  using (false);

-- ============================================================================
-- Helpful view for admin panel: latest export per type
-- ============================================================================

create or replace view public.export_jobs_latest with (security_invoker = true) as
  select distinct on (type)
    id, type, status, target_month, drive_file_id, drive_link,
    error_message, started_at, completed_at
  from public.export_jobs
  order by type, started_at desc;


