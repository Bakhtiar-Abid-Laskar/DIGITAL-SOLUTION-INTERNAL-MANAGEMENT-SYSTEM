-- ============================================================================
-- REPAIRSHOP — CUSTOMER WHATSAPP NOTIFICATION ENGINE
-- Migration: 20260903100000_customer_whatsapp_notifications.sql
--
-- Upgrades whatsapp_settings, whatsapp_messages, and adds support for:
-- 1. Meta WhatsApp Cloud API credentials
-- 2. Configurable Google Form Review URL
-- 3. Customer-only event notification toggles
-- 4. Invoices PDF & pending payment reminder tracking
-- ============================================================================

-- 1. Ensure public.whatsapp_settings exists and has all required columns
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'meta_cloud_api',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS account_sid TEXT,
  ADD COLUMN IF NOT EXISTS auth_token_enc TEXT,
  ADD COLUMN IF NOT EXISTS from_number TEXT,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS waba_id TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS app_secret TEXT,
  ADD COLUMN IF NOT EXISTS verify_token TEXT,
  ADD COLUMN IF NOT EXISTS google_review_url TEXT DEFAULT 'https://forms.gle/DigiSolutionReview',
  ADD COLUMN IF NOT EXISTS notify_job_created BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_job_assigned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_job_started BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_job_status_changed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_job_completed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_device_delivered BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_review_link BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sale_created BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_payment_received BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_invoice_generated BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_invoice_pdf BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_payment_pending BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure at least one default row exists in whatsapp_settings
INSERT INTO public.whatsapp_settings (
  id,
  provider,
  is_active,
  google_review_url,
  notify_job_created,
  notify_job_status_changed,
  notify_job_completed,
  notify_device_delivered,
  notify_review_link,
  notify_sale_created,
  notify_payment_received,
  notify_invoice_pdf,
  notify_payment_pending
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'meta_cloud_api',
  true,
  'https://forms.gle/DigiSolutionReview',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  provider = COALESCE(public.whatsapp_settings.provider, 'meta_cloud_api'),
  is_active = COALESCE(public.whatsapp_settings.is_active, true),
  google_review_url = COALESCE(public.whatsapp_settings.google_review_url, 'https://forms.gle/DigiSolutionReview');

-- 2. Ensure public.whatsapp_messages exists and has all columns
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS to_number TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS message_body TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS meta_message_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS error_detail TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to_number ON public.whatsapp_messages (to_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id ON public.whatsapp_messages (meta_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_job_id ON public.whatsapp_messages (job_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sale_id ON public.whatsapp_messages (sale_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages (created_at DESC);

-- 3. Ensure public.whatsapp_logs exists and has all columns
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_logs
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS payload JSONB,
  ADD COLUMN IF NOT EXISTS error_detail TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_logs (created_at DESC);

-- 4. Enable RLS on whatsapp_messages, whatsapp_logs, and whatsapp_settings
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Staff can view whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role and admins can manage whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Service role and admins can manage whatsapp messages"
  ON public.whatsapp_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'receptionist')
    )
  );

DROP POLICY IF EXISTS "Staff can view whatsapp settings" ON public.whatsapp_settings;
CREATE POLICY "Staff can view whatsapp settings"
  ON public.whatsapp_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update whatsapp settings" ON public.whatsapp_settings;
CREATE POLICY "Admins can update whatsapp settings"
  ON public.whatsapp_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
