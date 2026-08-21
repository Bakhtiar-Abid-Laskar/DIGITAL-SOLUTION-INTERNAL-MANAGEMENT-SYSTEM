-- Migration: Restrict Sales Table to Admin and Receptionist
-- Description: Phase 1 requirement to restrict sales data so technicians cannot access it.

drop policy if exists "sales_staff_all" on public.sales;
drop policy if exists "sale_items_staff_all" on public.sale_items;

drop policy if exists "Sales manageable by admin and receptionist" on public.sales;
create policy "Sales manageable by admin and receptionist"
  on public.sales for all
  using (public.is_admin() or public.is_receptionist())
  with check (public.is_admin() or public.is_receptionist());

drop policy if exists "Sale items manageable by admin and receptionist" on public.sale_items;
create policy "Sale items manageable by admin and receptionist"
  on public.sale_items for all
  using (public.is_admin() or public.is_receptionist())
  with check (public.is_admin() or public.is_receptionist());

