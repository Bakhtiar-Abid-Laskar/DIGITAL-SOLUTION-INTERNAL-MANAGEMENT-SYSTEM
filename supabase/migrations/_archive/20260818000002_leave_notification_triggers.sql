-- Migration: 20260818000002_leave_notification_triggers.sql
-- Description: Triggers for employee leave notifications

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_leave_created ON public.employee_leave;
DROP TRIGGER IF EXISTS trigger_leave_status_changed ON public.employee_leave;

-- 1. Notify when a leave is requested (INSERT)
CREATE TRIGGER trigger_leave_created
  AFTER INSERT ON public.employee_leave
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_secure_webhook('https://jywydhtiorslayghcycf.supabase.co/functions/v1/notify-on-leave-event');

-- 2. Notify when a leave is approved/rejected (UPDATE of status)
CREATE TRIGGER trigger_leave_status_changed
  AFTER UPDATE OF status ON public.employee_leave
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.invoke_secure_webhook('https://jywydhtiorslayghcycf.supabase.co/functions/v1/notify-on-leave-event');
