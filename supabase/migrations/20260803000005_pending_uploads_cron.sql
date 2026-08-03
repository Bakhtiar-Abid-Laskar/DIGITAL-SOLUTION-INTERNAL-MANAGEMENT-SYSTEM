-- Migration: 20260803000005_pending_uploads_cron.sql
-- Description: Schedule the pending-uploads retry worker every 15 minutes.
--              Also sets up the retry worker on the pg_net extension.
--
-- IMPORTANT: Replace <project-ref> and <anon-key> as in migration 20260803000002.

-- Remove existing schedule if re-running
select cron.unschedule('retry-pending-uploads') where exists (
  select 1 from cron.job where jobname = 'retry-pending-uploads'
);

-- Run every 15 minutes
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

-- Helper: admin-facing count of stuck uploads (attempts >= 3)
-- The admin panel queries this view to show the stuck upload banner.
create or replace view public.stuck_uploads as
  select count(*) as count
  from public.pending_uploads
  where attempts >= 3;
