-- H4. Drop orphaned legacy functions
-- Drops process_job_material_stock_v2 and _v3 which were identified as orphaned legacy artifacts.
-- The active job_materials triggers explicitly target the V1 process_job_material_stock() function.

DROP FUNCTION IF EXISTS public.process_job_material_stock_v2() CASCADE;
DROP FUNCTION IF EXISTS public.process_job_material_stock_v3() CASCADE;
