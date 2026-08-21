alter table public.inventory rename column selling_price to selling_rate;

create or replace function public.create_product_with_opening_stock(
  p_name text,
  p_sku text,
  p_unit text,
  p_hsn_sac text,
  p_cgst_rate numeric,
  p_sgst_rate numeric,
  p_igst_rate numeric,
  p_tax_mode text,
  p_is_active boolean,
  p_opening_quantity numeric,
  p_purchase_rate numeric,
  p_selling_rate numeric,
  p_low_stock_threshold numeric,
  p_minimum_stock_level numeric,
  p_location text
) returns uuid as $$
declare
  v_product_id uuid;
  v_inventory_id uuid;
begin
  insert into public.products (
    name, sku, unit, hsn_sac, cgst_rate, sgst_rate, igst_rate, tax_mode, is_active
  ) values (
    p_name, p_sku, p_unit, p_hsn_sac, p_cgst_rate, p_sgst_rate, p_igst_rate, p_tax_mode, p_is_active
  ) returning id into v_product_id;

  insert into public.inventory (
    item_name, quantity, quantity_cached, unit, low_stock_threshold, minimum_stock_level, purchase_rate, selling_rate, location, product_id
  ) values (
    p_name, p_opening_quantity, p_opening_quantity, p_unit, p_low_stock_threshold, p_minimum_stock_level, p_purchase_rate, p_selling_rate, p_location, v_product_id
  ) returning id into v_inventory_id;

  if p_opening_quantity > 0 then
    insert into public.inventory_transactions (
      inventory_id, transaction_type, quantity, reference_note
    ) values (
      v_inventory_id, 'IN', p_opening_quantity, 'Opening Stock'
    );
  end if;

  return v_product_id;
end;
$$ language plpgsql security definer;