-- Migration: 20260801000003_fix_sale_items_trigger
-- Description: Fix missing discount and tax_percent references in recalculate_sale_totals trigger

create or replace function public.recalculate_sale_totals()
returns trigger as $$
declare
  target_sale_id uuid;
  current_subtotal numeric;
  calc_total numeric;
  sale_discount numeric;
  sale_tax numeric;
begin
  target_sale_id := coalesce(new.sale_id, old.sale_id);

  select coalesce(sum(quantity * unit_price), 0)
  into current_subtotal
  from public.sale_items
  where sale_id = target_sale_id;

  select coalesce(discount, 0), coalesce(tax_percent, 0)
  into sale_discount, sale_tax
  from public.sales
  where id = target_sale_id;

  calc_total := greatest((current_subtotal - sale_discount) + ((current_subtotal - sale_discount) * sale_tax / 100), 0);

  update public.sales
  set
    subtotal = current_subtotal,
    total_amount = calc_total,
    grand_total = calc_total
  where id = target_sale_id;

  return null;
end;
$$ language plpgsql security definer;
