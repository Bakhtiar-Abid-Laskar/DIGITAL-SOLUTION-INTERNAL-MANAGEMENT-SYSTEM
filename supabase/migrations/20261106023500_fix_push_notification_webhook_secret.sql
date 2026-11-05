-- ============================================================================
-- Migration: 20261106023500_fix_push_notification_webhook_secret.sql
-- Description: Fix push notification database webhook authentication
--
-- Root Cause:
--   Postgres invoke_edge_webhook() previously dispatched pg_net HTTP POST
--   requests with only the public anon key. The shared Edge Function authorizer
--   (authorizeEdgeRequest in _shared/notifications.ts) explicitly blocks public
--   anon callers without a webhook signature (HTTP 401 Unauthorized).
--
-- Solution:
--   Update public.invoke_edge_webhook() to pass the internal webhook secret
--   header 'x-webhook-secret': 'ds-repairshop-internal-webhook-secret-v1'.
--   This authorizes pg_net triggers to invoke Edge Functions securely.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invoke_edge_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  base_url text;
  target_func text;
  webhook_url text;
  payload jsonb;
  request_id bigint;
  webhook_secret text;
BEGIN
  -- Base Supabase Edge Functions URL for the active project
  base_url := 'https://sssdjuxbelektszepikt.supabase.co/functions/v1/';

  -- Internal webhook secret recognized by authorizeEdgeRequest
  webhook_secret := 'ds-repairshop-internal-webhook-secret-v1';

  -- Target function name or full URL passed via trigger argument
  target_func := TG_ARGV[0];

  IF target_func IS NULL OR target_func = '' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF target_func LIKE 'http://%' OR target_func LIKE 'https://%' THEN
    webhook_url := target_func;
  ELSE
    webhook_url := base_url || target_func;
  END IF;

  -- Construct standard Supabase webhook payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END
  );

  -- Perform asynchronous non-blocking HTTP POST via pg_net with Supabase API gateway headers AND webhook secret
  BEGIN
    SELECT net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2RqdXhiZWxla3RzemVwaWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDc3NjgsImV4cCI6MjEwMjcyMzc2OH0.SfHCaupJiN37H25137bGK3zxWdspOb37Y8pS0_1bNg4',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2RqdXhiZWxla3RzemVwaWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDc3NjgsImV4cCI6MjEwMjcyMzc2OH0.SfHCaupJiN37H25137bGK3zxWdspOb37Y8pS0_1bNg4',
        'x-webhook-secret', webhook_secret
      ),
      body := payload
    ) INTO request_id;
  EXCEPTION WHEN OTHERS THEN
    -- Never block the primary database transaction if network/webhook delivery encounters an issue
    RAISE WARNING 'Edge webhook dispatch failed: %', SQLERRM;
  END;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

