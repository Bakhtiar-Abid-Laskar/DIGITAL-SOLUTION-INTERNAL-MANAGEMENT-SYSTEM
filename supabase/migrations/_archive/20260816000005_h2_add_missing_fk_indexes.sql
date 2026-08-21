-- H2. Add missing foreign key indexes (12 total)
-- This migration adds B-Tree indexes to all foreign keys that were identified as lacking indexes.
-- This prevents severe performance degradation (full table scans) during cascading deletes and joins.

-- job_materials
CREATE INDEX IF NOT EXISTS idx_job_materials_inventory_transaction_id ON public.job_materials USING btree (inventory_transaction_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_product_id ON public.job_materials USING btree (product_id);

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON public.jobs USING btree (priority);

-- sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items USING btree (product_id);

-- sales
CREATE INDEX IF NOT EXISTS idx_sales_payment_mode ON public.sales USING btree (payment_mode);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales USING btree (status);

-- billing
CREATE INDEX IF NOT EXISTS idx_billing_payment_method ON public.billing USING btree (payment_method);
CREATE INDEX IF NOT EXISTS idx_billing_payment_status ON public.billing USING btree (payment_status);

-- inventory_audit_log
CREATE INDEX IF NOT EXISTS idx_inventory_audit_log_changed_by ON public.inventory_audit_log USING btree (changed_by);

-- whatsapp_logs
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_customer_id ON public.whatsapp_logs USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_sale_id ON public.whatsapp_logs USING btree (sale_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer_id ON public.whatsapp_messages USING btree (customer_id);
