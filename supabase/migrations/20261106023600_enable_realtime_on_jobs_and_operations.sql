-- ============================================================================
-- Migration: 20261106023600_enable_realtime_on_jobs_and_operations.sql
-- Description: Add jobs and core operational tables to supabase_realtime publication
--
-- Root Cause:
--   pg_publication_tables showed that only `public.notifications` was in the
--   `supabase_realtime` publication.
--   Because `public.jobs` and `public.job_technicians` were missing from the
--   publication, Supabase Realtime NEVER emitted `postgres_changes` events to
--   clients when jobs were created, status changed, or assigned. Clients only
--   saw new jobs after restarting or pulling down manually.
--
-- Solution:
--   Add `public.jobs`, `public.job_technicians`, `public.attendance`,
--   `public.inventory`, `public.material_allotments`, and `public.invoices`
--   to `supabase_realtime` publication and set REPLICA IDENTITY FULL where appropriate.
-- ============================================================================

DO $$
BEGIN
  -- 1. Add public.jobs if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;

  -- 2. Add public.job_technicians if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'job_technicians'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_technicians;
  END IF;

  -- 3. Add public.attendance if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;

  -- 4. Add public.inventory if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
  END IF;

  -- 5. Add public.material_allotments if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'material_allotments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.material_allotments;
  END IF;

  -- 6. Add public.invoices if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  END IF;
END $$;

-- Set replica identity to full on jobs so UPDATE/DELETE events broadcast old record details
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.job_technicians REPLICA IDENTITY FULL;

