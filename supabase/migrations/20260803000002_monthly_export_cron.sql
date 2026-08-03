-- Migration: 20260803000002_monthly_export_cron.sql
-- Description: Schedules monthly Google Drive exports via pg_cron + pg_net.
--
-- Schedule:
--   export-monthly-data    → 1st of month at 20:00 UTC = 1:30 AM IST
--   export-attendance-reports → 1st of month at 20:30 UTC = 2:00 AM IST
--
-- The Edge Functions default to "previous calendar month" when called with no
-- body, so a run on the 1st of August exports July's data.
--
-- The Authorization header uses the anon key. This is safe — the Edge Functions
-- perform a server-side admin role check internally.
-- The service role key is NEVER placed in pg_cron SQL.
--
-- IMPORTANT: Replace <project-ref> with your actual Supabase project reference
-- (found in Project Settings → General). Replace <anon-key> with the project's
-- anon key (safe to commit — it is a public key, not a secret).

-- Remove existing schedules if re-running this migration
select cron.unschedule('monthly-drive-export') where exists (
  select 1 from cron.job where jobname = 'monthly-drive-export'
);
select cron.unschedule('monthly-attendance-export') where exists (
  select 1 from cron.job where jobname = 'monthly-attendance-export'
);

-- Monthly Data Export: 1st of month at 20:00 UTC (01:30 AM IST)
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

-- Verify scheduled jobs
-- After applying this migration, run: select jobname, schedule, active from cron.job;
