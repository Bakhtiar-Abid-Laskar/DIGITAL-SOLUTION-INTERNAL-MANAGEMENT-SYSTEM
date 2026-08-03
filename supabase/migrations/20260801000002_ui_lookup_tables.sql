-- Migration: 20260801000002_ui_lookup_tables
-- Description: Create UI lookup tables for dropdowns and statuses

CREATE TABLE IF NOT EXISTS public.ui_job_statuses (
    id TEXT PRIMARY KEY,
    color_hex TEXT,
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ui_priorities (
    id TEXT PRIMARY KEY,
    color_hex TEXT,
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ui_service_locations (
    id TEXT PRIMARY KEY,
    color_hex TEXT,
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ui_payment_statuses (
    id TEXT PRIMARY KEY,
    color_hex TEXT,
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ui_sale_statuses (
    id TEXT PRIMARY KEY,
    color_hex TEXT,
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ui_payment_methods (
    id TEXT PRIMARY KEY,
    color_hex TEXT,
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ui_roles (
    id TEXT PRIMARY KEY,
    color_hex TEXT,
    sort_order INT DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.ui_job_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_service_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_payment_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_sale_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_roles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to UI config tables
CREATE POLICY "Allow public read ui_job_statuses" ON public.ui_job_statuses FOR SELECT USING (true);
CREATE POLICY "Allow public read ui_priorities" ON public.ui_priorities FOR SELECT USING (true);
CREATE POLICY "Allow public read ui_service_locations" ON public.ui_service_locations FOR SELECT USING (true);
CREATE POLICY "Allow public read ui_payment_statuses" ON public.ui_payment_statuses FOR SELECT USING (true);
CREATE POLICY "Allow public read ui_sale_statuses" ON public.ui_sale_statuses FOR SELECT USING (true);
CREATE POLICY "Allow public read ui_payment_methods" ON public.ui_payment_methods FOR SELECT USING (true);
CREATE POLICY "Allow public read ui_roles" ON public.ui_roles FOR SELECT USING (true);

-- Allow admin write access (just as a baseline for future usage, though typically handled via GUI or seed)
CREATE POLICY "Allow admin write ui_job_statuses" ON public.ui_job_statuses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Allow admin write ui_priorities" ON public.ui_priorities FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Allow admin write ui_service_locations" ON public.ui_service_locations FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Allow admin write ui_payment_statuses" ON public.ui_payment_statuses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Allow admin write ui_sale_statuses" ON public.ui_sale_statuses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Allow admin write ui_payment_methods" ON public.ui_payment_methods FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Allow admin write ui_roles" ON public.ui_roles FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);


-- Seed data
INSERT INTO public.ui_job_statuses (id, color_hex, sort_order) VALUES 
('Received', '#3B82F6', 1),
('In Progress', '#8B5CF6', 2),
('Waiting for Materials', '#F59E0B', 3),
('Completed', '#10B981', 4),
('Delivered', '#6B7280', 5),
('Cancelled', '#EF4444', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ui_priorities (id, color_hex, sort_order) VALUES 
('Normal', '#3B82F6', 1),
('High', '#F59E0B', 2),
('Urgent', '#EF4444', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ui_service_locations (id, color_hex, sort_order) VALUES 
('Inhouse', '#5B4FE9', 1),
('Onsite', '#3B82F6', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ui_payment_statuses (id, color_hex, sort_order) VALUES 
('Unpaid', '#EF4444', 1),
('Paid in Full', '#10B981', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ui_sale_statuses (id, color_hex, sort_order) VALUES 
('Paid', '#10B981', 1),
('Draft', '#F59E0B', 2),
('Cancelled', '#EF4444', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ui_payment_methods (id, color_hex, sort_order) VALUES 
('Cash', '#3B82F6', 1),
('Card', '#8B5CF6', 2),
('UPI', '#10B981', 3),
('Bank Transfer', '#6B7280', 4),
('Other', '#9CA3AF', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ui_roles (id, color_hex, sort_order) VALUES 
('admin', '#EF4444', 1),
('receptionist', '#F59E0B', 2),
('technician', '#3B82F6', 3)
ON CONFLICT (id) DO NOTHING;
