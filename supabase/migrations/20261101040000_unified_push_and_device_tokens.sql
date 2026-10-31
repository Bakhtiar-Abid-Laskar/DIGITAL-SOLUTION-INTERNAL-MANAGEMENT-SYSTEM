-- ============================================================================
-- DIGITAL SOLUTION (REPAIRSHOP) — UNIFIED PUSH NOTIFICATIONS & DEVICE TOKENS
-- Migration: 20261101040000_unified_push_and_device_tokens.sql
--
-- Features:
-- 1. Creates `device_tokens` table for Android, iOS Native, and Web/PWA Push.
-- 2. Creates `notification_logs` table for delivery receipts and audit trails.
-- 3. Implements strict Row-Level Security (users manage only their own devices).
-- 4. Provides `register_device_token` and `unregister_device_token` RPCs.
-- 5. Backfills existing legacy tokens from `public.users.expo_push_token`.
-- 6. Updates `invoke_edge_webhook` with webhook secret authentication headers.
-- ============================================================================

-- 1. Device Tokens Table
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  token_or_endpoint TEXT NOT NULL,
  keys JSONB DEFAULT NULL, -- Stores {"p256dh": "...", "auth": "..."} for Web Push subscriptions
  device_info JSONB DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_device_token UNIQUE (user_id, token_or_endpoint)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON public.device_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON public.device_tokens(platform);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if exist
DROP POLICY IF EXISTS "device_tokens_own_select" ON public.device_tokens;
DROP POLICY IF EXISTS "device_tokens_own_insert" ON public.device_tokens;
DROP POLICY IF EXISTS "device_tokens_own_update" ON public.device_tokens;
DROP POLICY IF EXISTS "device_tokens_own_delete" ON public.device_tokens;
DROP POLICY IF EXISTS "device_tokens_admin_all" ON public.device_tokens;

-- Users can read only their own registered tokens
CREATE POLICY "device_tokens_own_select"
  ON public.device_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert only for themselves
CREATE POLICY "device_tokens_own_insert"
  ON public.device_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own tokens
CREATE POLICY "device_tokens_own_update"
  ON public.device_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tokens (e.g. on logout)
CREATE POLICY "device_tokens_own_delete"
  ON public.device_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view/manage all device tokens
CREATE POLICY "device_tokens_admin_all"
  ON public.device_tokens FOR ALL TO authenticated
  USING (public.is_admin());


-- 2. Notification Logs Table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'push',
  title TEXT,
  body TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'pruned')),
  provider_response JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON public.notification_logs(created_at DESC);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_logs_own_select" ON public.notification_logs;
DROP POLICY IF EXISTS "notification_logs_admin_all" ON public.notification_logs;

CREATE POLICY "notification_logs_own_select"
  ON public.notification_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notification_logs_admin_all"
  ON public.notification_logs FOR ALL TO authenticated
  USING (public.is_admin());


-- 3. Atomic Token Registration RPC
CREATE OR REPLACE FUNCTION public.register_device_token(
  p_platform TEXT,
  p_token_or_endpoint TEXT,
  p_keys JSONB DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_token_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_platform NOT IN ('android', 'ios', 'web') THEN
    RAISE EXCEPTION 'Invalid platform. Must be android, ios, or web';
  END IF;

  IF p_token_or_endpoint IS NULL OR trim(p_token_or_endpoint) = '' THEN
    RAISE EXCEPTION 'token_or_endpoint cannot be empty';
  END IF;

  -- Upsert device token
  INSERT INTO public.device_tokens (
    user_id,
    platform,
    token_or_endpoint,
    keys,
    device_info,
    last_seen_at,
    is_active
  )
  VALUES (
    v_user_id,
    p_platform,
    trim(p_token_or_endpoint),
    p_keys,
    p_device_info,
    now(),
    true
  )
  ON CONFLICT (user_id, token_or_endpoint)
  DO UPDATE SET
    platform = EXCLUDED.platform,
    keys = COALESCE(EXCLUDED.keys, public.device_tokens.keys),
    device_info = COALESCE(EXCLUDED.device_info, public.device_tokens.device_info),
    last_seen_at = now(),
    is_active = true
  RETURNING id INTO v_token_id;

  -- Maintain backward compatibility with legacy public.users.expo_push_token
  IF p_platform IN ('android', 'ios') AND p_token_or_endpoint LIKE 'ExponentPushToken%' THEN
    UPDATE public.users
    SET expo_push_token = trim(p_token_or_endpoint)
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'token_id', v_token_id,
    'platform', p_platform,
    'user_id', v_user_id
  );
END;
$$;


-- 4. Atomic Token Unregistration RPC (Logout / Device Revocation)
CREATE OR REPLACE FUNCTION public.unregister_device_token(
  p_token_or_endpoint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.device_tokens
  WHERE user_id = v_user_id
    AND token_or_endpoint = trim(p_token_or_endpoint);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- If legacy column matches, clear it as well
  UPDATE public.users
  SET expo_push_token = NULL
  WHERE id = v_user_id
    AND expo_push_token = trim(p_token_or_endpoint);

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count
  );
END;
$$;


-- 5. Backfill Existing Legacy Push Tokens into device_tokens
INSERT INTO public.device_tokens (user_id, platform, token_or_endpoint, last_seen_at, is_active)
SELECT
  id AS user_id,
  'android' AS platform,
  trim(expo_push_token) AS token_or_endpoint,
  now() AS last_seen_at,
  true AS is_active
FROM public.users
WHERE expo_push_token IS NOT NULL
  AND trim(expo_push_token) <> ''
ON CONFLICT (user_id, token_or_endpoint) DO NOTHING;


-- 6. Robust Database Webhook Dispatcher
-- Securely forwards database events to Supabase Edge Functions with secret authentication headers
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
  headers_obj jsonb;
BEGIN
  base_url := 'https://sssdjuxbelektszepikt.supabase.co/functions/v1/';
  target_func := TG_ARGV[0];

  IF target_func IS NULL OR target_func = '' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF target_func LIKE 'http://%' OR target_func LIKE 'https://%' THEN
    webhook_url := target_func;
  ELSE
    webhook_url := base_url || target_func;
  END IF;

  -- 1. Try reading secret from Supabase Vault (if enabled)
  BEGIN
    SELECT decrypted_secret INTO webhook_secret
    FROM vault.decrypted_secrets
    WHERE name = 'app_webhook_secret'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    webhook_secret := NULL;
  END;

  -- 2. Fall back to database custom setting
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    webhook_secret := nullif(current_setting('app.settings.webhook_secret', true), '');
  END IF;

  -- 3. Default internal secret if not configured in vault/settings
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    webhook_secret := 'ds-repairshop-internal-webhook-secret-v1';
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END
  );

  headers_obj := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-webhook-secret', webhook_secret,
    'webhook-signature', webhook_secret
  );

  BEGIN
    SELECT net.http_post(
      url := webhook_url,
      headers := headers_obj,
      body := payload
    ) INTO request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Edge webhook dispatch failed: %', SQLERRM;
  END;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

