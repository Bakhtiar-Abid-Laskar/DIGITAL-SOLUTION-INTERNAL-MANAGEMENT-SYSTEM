-- H3. Resolve cascade-delete behavior for materials/items
-- Ensures that deleting a Job or Sale cascades the deletion to its child items,
-- preventing orphaned rows and foreign key constraint violations during parent deletion.

-- Fix job_materials -> jobs
ALTER TABLE public.job_materials DROP CONSTRAINT IF EXISTS job_materials_job_id_fkey;
ALTER TABLE public.job_materials 
  ADD CONSTRAINT job_materials_job_id_fkey 
  FOREIGN KEY (job_id) 
  REFERENCES public.jobs(id) 
  ON DELETE CASCADE;

-- Fix sale_items -> sales
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_sale_id_fkey;
ALTER TABLE public.sale_items 
  ADD CONSTRAINT sale_items_sale_id_fkey 
  FOREIGN KEY (sale_id) 
  REFERENCES public.sales(id) 
  ON DELETE CASCADE;
