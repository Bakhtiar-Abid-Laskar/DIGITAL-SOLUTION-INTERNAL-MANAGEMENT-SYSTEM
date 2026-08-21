-- Phase 2 (M4)
-- Replace get_user_role() with is_admin() / is_receptionist()

DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users" ON public.users
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins and Receptionists can manage all jobs" ON public.jobs;
CREATE POLICY "Admins and Receptionists can manage all jobs" ON public.jobs
  FOR ALL TO public
  USING ((is_admin() OR is_receptionist()));

DROP POLICY IF EXISTS "Admins and Receptionists can manage all job materials" ON public.job_materials;
CREATE POLICY "Admins and Receptionists can manage all job materials" ON public.job_materials
  FOR ALL TO public
  USING ((is_admin() OR is_receptionist()));

DROP POLICY IF EXISTS "Admins and Receptionists can read all attendance" ON public.attendance;
CREATE POLICY "Admins and Receptionists can read all attendance" ON public.attendance
  FOR SELECT TO public
  USING ((is_admin() OR is_receptionist()));

DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance;
CREATE POLICY "Admins can manage all attendance" ON public.attendance
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins and Receptionists can manage onsite visits" ON public.onsite_visits;
CREATE POLICY "Admins and Receptionists can manage onsite visits" ON public.onsite_visits
  FOR ALL TO public
  USING ((is_admin() OR is_receptionist()));

DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory;
CREATE POLICY "Admins can manage inventory" ON public.inventory
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins and Receptionists can manage billing" ON public.billing;
CREATE POLICY "Admins and Receptionists can manage billing" ON public.billing
  FOR ALL TO public
  USING ((is_admin() OR is_receptionist()));

DROP POLICY IF EXISTS "Admins and Receptionists can manage sales" ON public.sales;
CREATE POLICY "Admins and Receptionists can manage sales" ON public.sales
  FOR ALL TO public
  USING ((is_admin() OR is_receptionist()));

DROP POLICY IF EXISTS "Admins and Receptionists can manage invoices" ON public.invoices;
CREATE POLICY "Admins and Receptionists can manage invoices" ON public.invoices
  FOR ALL TO public
  USING ((is_admin() OR is_receptionist()));

DROP POLICY IF EXISTS "Admins can manage ui_job_statuses" ON public.ui_job_statuses;
CREATE POLICY "Admins can manage ui_job_statuses" ON public.ui_job_statuses
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage ui_payment_methods" ON public.ui_payment_methods;
CREATE POLICY "Admins can manage ui_payment_methods" ON public.ui_payment_methods
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage ui_payment_statuses" ON public.ui_payment_statuses;
CREATE POLICY "Admins can manage ui_payment_statuses" ON public.ui_payment_statuses
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage ui_priorities" ON public.ui_priorities;
CREATE POLICY "Admins can manage ui_priorities" ON public.ui_priorities
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage ui_roles" ON public.ui_roles;
CREATE POLICY "Admins can manage ui_roles" ON public.ui_roles
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage ui_sale_statuses" ON public.ui_sale_statuses;
CREATE POLICY "Admins can manage ui_sale_statuses" ON public.ui_sale_statuses
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage ui_service_locations" ON public.ui_service_locations;
CREATE POLICY "Admins can manage ui_service_locations" ON public.ui_service_locations
  FOR ALL TO public
  USING (is_admin());

DROP POLICY IF EXISTS "Admins and Receptionists can read inventory_transactions" ON public.inventory_transactions;
CREATE POLICY "Admins and Receptionists can read inventory_transactions" ON public.inventory_transactions
  FOR SELECT TO public
  USING ((is_admin() OR is_receptionist()));

DROP POLICY IF EXISTS "Admins and Receptionists can manage invoice_items" ON public.invoice_items;
CREATE POLICY "Admins and Receptionists can manage invoice_items" ON public.invoice_items
  FOR ALL TO public
  USING ((is_admin() OR is_receptionist()));

DROP POLICY IF EXISTS "Admins can read inventory_audit_log" ON public.inventory_audit_log;
CREATE POLICY "Admins can read inventory_audit_log" ON public.inventory_audit_log
  FOR SELECT TO public
  USING (is_admin());

