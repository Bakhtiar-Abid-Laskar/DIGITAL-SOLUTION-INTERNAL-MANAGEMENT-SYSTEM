-- C2. Rotate the hardcoded webhook secret (qwerty1234567890)
-- This migration creates a generic webhook trigger function that reads the webhook secret 
-- securely from Supabase Vault (vault.decrypted_secrets) instead of hardcoding it in the trigger definition.

-- Enable pg_net and vault if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Create the secure webhook function
CREATE OR REPLACE FUNCTION public.invoke_secure_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  webhook_secret text;
  webhook_url text;
  payload jsonb;
  request_id bigint;
BEGIN
  -- 1. Securely read the secret from Vault
  SELECT decrypted_secret INTO webhook_secret 
  FROM vault.decrypted_secrets 
  WHERE name = 'APP_WEBHOOK_SECRET' 
  LIMIT 1;
  
  -- Fallback if not configured yet (will be rejected by Edge Function if invalid)
  IF webhook_secret IS NULL THEN
    webhook_secret := 'unconfigured_secret';
  END IF;

  -- 2. The target URL must be passed as the first argument to the trigger
  webhook_url := TG_ARGV[0];

  -- 3. Build the standard Supabase webhook payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END
  );

  -- 4. Execute the HTTP POST request via pg_net
  SELECT net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'webhook-signature', webhook_secret
    ),
    body := payload
  ) INTO request_id;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Drop the old insecure triggers
DROP TRIGGER IF EXISTS trigger_job_created ON public.jobs;
DROP TRIGGER IF EXISTS trigger_job_updated ON public.jobs;

-- Re-create the triggers using the new secure function
CREATE TRIGGER trigger_job_created
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_secure_webhook('https://jywydhtiorslayghcycf.supabase.co/functions/v1/notify-on-job-created');

CREATE TRIGGER trigger_job_updated
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_secure_webhook('https://jywydhtiorslayghcycf.supabase.co/functions/v1/notify-on-status-change');
