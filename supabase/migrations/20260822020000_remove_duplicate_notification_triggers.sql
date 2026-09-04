-- Remove duplicate notification trigger and function
-- Edge Functions (_shared/notifications.ts) now handle inserting into the notifications table.

drop trigger if exists trg_notify_job_event on public.jobs;
drop function if exists public.notify_job_event();
