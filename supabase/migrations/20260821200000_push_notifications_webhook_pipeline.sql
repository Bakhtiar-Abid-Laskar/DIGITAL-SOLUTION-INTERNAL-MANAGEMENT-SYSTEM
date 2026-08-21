-- ============================================================================
-- REPAIRSHOP — PUSH NOTIFICATIONS DATABASE WEBHOOK PIPELINE
-- Migration: 20260821200000_push_notifications_webhook_pipeline.sql
--
-- Enables pg_net and creates asynchronous webhook triggers to dispatch
-- database events to Supabase Edge Functions for OS push notifications.
-- Target project: https://sssdjuxbelektszepikt.supabase.co
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Generic Edge Function Webhook Dispatcher
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
BEGIN
  -- Base Supabase Edge Functions URL for the active project
  base_url := 'https://sssdjuxbelektszepikt.supabase.co/functions/v1/';

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

  -- Perform asynchronous non-blocking HTTP POST via pg_net with Supabase API gateway headers
  BEGIN
    SELECT net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2RqdXhiZWxla3RzemVwaWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDc3NjgsImV4cCI6MjEwMjcyMzc2OH0.SfHCaupJiN37H25137bGK3zxWdspOb37Y8pS0_1bNg4',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2RqdXhiZWxla3RzemVwaWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDc3NjgsImV4cCI6MjEwMjcyMzc2OH0.SfHCaupJiN37H25137bGK3zxWdspOb37Y8pS0_1bNg4'
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


-- 2. Drop existing triggers if present to avoid duplication
DROP TRIGGER IF EXISTS trigger_notify_job_created ON public.jobs;
DROP TRIGGER IF EXISTS trigger_notify_job_status ON public.jobs;
DROP TRIGGER IF EXISTS trigger_notify_leave_event ON public.employee_leave;
DROP TRIGGER IF EXISTS trigger_notify_inventory_change ON public.inventory;
DROP TRIGGER IF EXISTS trigger_notify_late_checkin ON public.attendance;
DROP TRIGGER IF EXISTS trigger_notify_onsite_visit ON public.onsite_visits;
DROP TRIGGER IF EXISTS trigger_notify_material_allotment ON public.material_allotments;
DROP TRIGGER IF EXISTS trigger_notify_salary_event ON public.salary;
DROP TRIGGER IF EXISTS trigger_notify_advance_payment ON public.payments;
DROP TRIGGER IF EXISTS trigger_notify_bonus_event ON public.employee_bonus;
DROP TRIGGER IF EXISTS trigger_notify_sale_event ON public.sales;


-- 3. Create Webhook Triggers for Notification Edge Functions

-- A. Jobs: New Job Assigned
CREATE TRIGGER trigger_notify_job_created
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-job-created');

-- B. Jobs: Status / Technician Reassignment Changed
CREATE TRIGGER trigger_notify_job_status
  AFTER UPDATE OF status, technician_id ON public.jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.technician_id IS DISTINCT FROM NEW.technician_id)
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-status-change');

-- C. Leave: New Leave Application or Status Decision
CREATE TRIGGER trigger_notify_leave_event
  AFTER INSERT OR UPDATE OF status ON public.employee_leave
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-leave-event');

-- D. Inventory: Stock drops below threshold
CREATE TRIGGER trigger_notify_inventory_change
  AFTER UPDATE OF quantity ON public.inventory
  FOR EACH ROW
  WHEN (NEW.quantity <= COALESCE(NEW.low_stock_threshold, 0) AND OLD.quantity > COALESCE(NEW.low_stock_threshold, 0))
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-inventory-change');

-- E. Attendance: Late Check-in (>30m)
CREATE TRIGGER trigger_notify_late_checkin
  AFTER INSERT ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-late-checkin');

-- F. Onsite: Technician Arrival
CREATE TRIGGER trigger_notify_onsite_visit
  AFTER INSERT ON public.onsite_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-onsite-visit');

-- G. Materials: Material Allotment to Technician
CREATE TRIGGER trigger_notify_material_allotment
  AFTER INSERT ON public.material_allotments
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-material-event');

-- H. Salary: Monthly Salary Slip Finalized
CREATE TRIGGER trigger_notify_salary_event
  AFTER INSERT OR UPDATE OF status, net_salary ON public.salary
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-finance-event');

-- I. Salary: Advance Salary Recorded
CREATE TRIGGER trigger_notify_advance_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW
  WHEN (NEW.type = 'advance_salary')
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-finance-event');

-- J. Salary: Employee Bonus Awarded
CREATE TRIGGER trigger_notify_bonus_event
  AFTER INSERT ON public.employee_bonus
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-finance-event');

-- K. Sales: Direct Counter Sale Recorded
CREATE TRIGGER trigger_notify_sale_event
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_edge_webhook('notify-on-finance-event');

NOTIFY pgrst, 'reload schema';
