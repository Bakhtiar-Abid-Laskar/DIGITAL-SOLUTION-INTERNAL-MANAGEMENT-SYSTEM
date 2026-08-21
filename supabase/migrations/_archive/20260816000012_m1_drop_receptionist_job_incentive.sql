-- M1. Drop jobs.snap_receptionist_incentive
-- Receptionists no longer receive job-creation incentives, rendering this column dead.

ALTER TABLE public.jobs DROP COLUMN IF EXISTS snap_receptionist_incentive;
