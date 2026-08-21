-- Phase 1 (C4)
-- Drop the leaky policies that bypassed is_staff()
DROP POLICY IF EXISTS "All authenticated users can read inventory" ON public.inventory;
DROP POLICY IF EXISTS "All authenticated users can read products" ON public.products;
