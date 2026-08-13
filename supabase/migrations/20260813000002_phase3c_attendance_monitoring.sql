-- Migration: Phase 3c Attendance Monitoring
-- Description: Adds 'at_location' and 'review_status' to public.attendance.

-- 1. Add columns to attendance
alter table public.attendance add column if not exists at_location boolean default true;
alter table public.attendance add column if not exists review_status text check (review_status in ('pending', 'approved', 'rejected'));

-- Set default values for existing records (assume they were at location and approved)
update public.attendance set at_location = true, review_status = 'approved' where review_status is null;

-- Now enforce NOT NULL on review_status and at_location if required, or keep it nullable.
-- Better to keep them nullable to avoid strict breaks, but default is applied.
alter table public.attendance alter column review_status set default 'approved';

-- Note: The logic for 'pending' when out of bounds will be handled at the application level during insert/upsert.
