-- H7. Move payroll_audit_log writes from client to trigger
-- Prevents desyncs by ensuring the ledger is updated automatically via the DB.

CREATE OR REPLACE FUNCTION public.audit_employee_leave_changes()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('approved', 'rejected') THEN
      INSERT INTO public.payroll_audit_log (action, user_id, details, performed_by)
      VALUES (
        'leave_' || NEW.status, 
        NEW.user_id, 
        jsonb_build_object('leave_date', NEW.leave_date, 'leave_id', NEW.id, 'source', 'trigger_insert'), 
        coalesce(NEW.approved_by, auth.uid())
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('approved', 'rejected') AND coalesce(OLD.status, '') != NEW.status THEN
      INSERT INTO public.payroll_audit_log (action, user_id, details, performed_by)
      VALUES (
        'leave_' || NEW.status, 
        NEW.user_id, 
        jsonb_build_object('leave_date', NEW.leave_date, 'leave_id', NEW.id, 'source', 'trigger_update'), 
        coalesce(NEW.approved_by, auth.uid())
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind trigger to employee_leave
DROP TRIGGER IF EXISTS trg_audit_employee_leave ON public.employee_leave;
CREATE TRIGGER trg_audit_employee_leave
AFTER INSERT OR UPDATE ON public.employee_leave
FOR EACH ROW EXECUTE FUNCTION public.audit_employee_leave_changes();
