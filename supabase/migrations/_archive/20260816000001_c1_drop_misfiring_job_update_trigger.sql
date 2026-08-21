-- C1. Disable the admin-create-user misfire on job UPDATE
-- This trigger was incorrectly configured to send a POST request to admin-create-user on every job update
-- without authorization headers, causing it to fail every time. It is a leftover misconfiguration.
DROP TRIGGER IF EXISTS trigger_job_update ON public.jobs;
