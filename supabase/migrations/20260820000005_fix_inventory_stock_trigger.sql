-- Fix inventory stock trigger to handle table-specific columns dynamically using row_to_json

create or replace function public.process_inventory_stock_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  target_inventory_id uuid;
  current_stock       numeric;
  display_name        text;
  qty_needed          numeric;
  qty_delta           numeric;
begin
  if tg_op = 'DELETE' then
    target_inventory_id := old.inventory_id;
    if tg_table_name = 'job_materials' then
      display_name := row_to_json(old)->>'material_name';
    elsif tg_table_name = 'sale_items' then
      display_name := row_to_json(old)->>'item_name';
    end if;
  else
    target_inventory_id := new.inventory_id;
    if tg_table_name = 'job_materials' then
      display_name := row_to_json(new)->>'material_name';
    elsif tg_table_name = 'sale_items' then
      display_name := row_to_json(new)->>'item_name';
    end if;
  end if;

  if target_inventory_id is null then
    select id into target_inventory_id from public.inventory
    where lower(item_name) = lower(display_name) limit 1;
  end if;

  if target_inventory_id is null then
    return coalesce(new, old);
  end if;

  select quantity into current_stock
  from public.inventory where id = target_inventory_id for update;
  current_stock := coalesce(current_stock, 0);

  if tg_op = 'INSERT' then
    qty_needed := new.quantity;
    if current_stock < qty_needed then
      raise exception 'Insufficient stock for %: requested %, only % remaining.',
        display_name, qty_needed, current_stock;
    end if;
    update public.inventory
    set quantity = quantity - qty_needed, last_updated = now()
    where id = target_inventory_id;
    if new.inventory_id is null then
      new.inventory_id := target_inventory_id;
    end if;

  elsif tg_op = 'UPDATE' then
    qty_delta := new.quantity - old.quantity;
    if qty_delta > 0 and current_stock < qty_delta then
      raise exception 'Insufficient stock for %: additional % requested, only % remaining.',
        display_name, qty_delta, current_stock;
    end if;
    update public.inventory
    set quantity = quantity - qty_delta, last_updated = now()
    where id = target_inventory_id;

  elsif tg_op = 'DELETE' then
    update public.inventory
    set quantity = quantity + old.quantity, last_updated = now()
    where id = target_inventory_id;
  end if;

  return coalesce(new, old);
end;
$$;
