-- Migration: 20260801000004_fix_device_type_check
-- Description: Update jobs_device_type_check constraint to allow PC, Laptop, Printer, Camera, Mobile, Others, Other

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_device_type_check;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_device_type_check 
CHECK (device_type IN ('PC', 'Laptop', 'Printer', 'Camera', 'Mobile', 'Others', 'Other'));
