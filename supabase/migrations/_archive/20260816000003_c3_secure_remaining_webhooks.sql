-- C3. Secure the 3 missing webhook triggers
-- Replaces the hardcoded http_request webhooks with the secure invoke_secure_webhook

DROP TRIGGER IF EXISTS trigger_inventory_change ON public.inventory;
DROP TRIGGER IF EXISTS trigger_late_checkin ON public.attendance;
DROP TRIGGER IF EXISTS trigger_onsite_arrival ON public.onsite_visits;

CREATE TRIGGER trigger_inventory_change
  AFTER UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_secure_webhook('https://jywydhtiorslayghcycf.supabase.co/functions/v1/notify-on-inventory-change');

CREATE TRIGGER trigger_late_checkin
  AFTER INSERT ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_secure_webhook('https://jywydhtiorslayghcycf.supabase.co/functions/v1/notify-on-late-checkin');

CREATE TRIGGER trigger_onsite_arrival
  AFTER INSERT ON public.onsite_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.invoke_secure_webhook('https://jywydhtiorslayghcycf.supabase.co/functions/v1/notify-on-onsite-visit');
