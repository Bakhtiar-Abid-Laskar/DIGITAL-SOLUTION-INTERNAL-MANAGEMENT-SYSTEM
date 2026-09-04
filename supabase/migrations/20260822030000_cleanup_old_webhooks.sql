-- Remove all old triggers that used invoke_secure_webhook to prevent duplicate notifications
-- These were replaced by the trigger_notify_* series in 20260821200000_push_notifications_webhook_pipeline.sql

DROP TRIGGER IF EXISTS trigger_job_created ON public.jobs;
DROP TRIGGER IF EXISTS trigger_job_updated ON public.jobs;
DROP TRIGGER IF EXISTS trigger_inventory_change ON public.inventory;
DROP TRIGGER IF EXISTS trigger_late_checkin ON public.attendance;
DROP TRIGGER IF EXISTS trigger_onsite_arrival ON public.onsite_visits;
DROP TRIGGER IF EXISTS trigger_leave_created ON public.employee_leave;
DROP TRIGGER IF EXISTS trigger_leave_status_changed ON public.employee_leave;

-- Drop the old webhook function (this will cascade drop any other triggers using it if we missed any)
DROP FUNCTION IF EXISTS public.invoke_secure_webhook() CASCADE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
