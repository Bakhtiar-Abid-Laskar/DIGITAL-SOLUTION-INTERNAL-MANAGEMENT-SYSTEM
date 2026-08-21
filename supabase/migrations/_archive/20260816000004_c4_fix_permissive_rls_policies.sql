-- C4. Fix overly permissive RLS policies
-- Drops policies that used USING (true) allowing full anonymous/authenticated read access to ledgers,
-- and replaces them with strict role checks (is_admin() or is_staff()).

-- 1. Inventory Transactions
DROP POLICY IF EXISTS "inventory_transactions_staff_select" ON public.inventory_transactions;

CREATE POLICY "inventory_transactions_staff_select" 
  ON public.inventory_transactions 
  FOR SELECT 
  TO authenticated 
  USING ((SELECT public.is_staff()));

-- 2. Inventory
DROP POLICY IF EXISTS "inventory_new_select_all_staff" ON public.inventory;
DROP POLICY IF EXISTS "inventory_select_authenticated" ON public.inventory;

CREATE POLICY "inventory_select_staff" 
  ON public.inventory 
  FOR SELECT 
  TO authenticated 
  USING ((SELECT public.is_staff()));

-- 3. Products
DROP POLICY IF EXISTS "products_select_all_staff" ON public.products;
DROP POLICY IF EXISTS "products_staff_select" ON public.products;

CREATE POLICY "products_select_staff" 
  ON public.products 
  FOR SELECT 
  TO authenticated 
  USING ((SELECT public.is_staff()));

-- Force schema cache reload for PostgREST
NOTIFY pgrst, 'reload schema';
