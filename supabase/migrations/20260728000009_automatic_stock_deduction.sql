-- Migration: 20260728000009_automatic_stock_deduction.sql
-- Description: Atomic stock deduction, negative stock prevention, restoration on edit/delete for job_materials and sale_items, and admin-only RLS stock updates.

-- 1. Function for public.job_materials stock adjustment
create or replace function public.process_job_material_stock()
returns trigger as $$
declare
  target_inventory_id uuid;
  current_stock numeric;
  item_display_name text;
  qty_needed numeric;
  qty_delta numeric;
begin
  -- Resolve target inventory item (via inventory_id FK first, fallback by material_name)
  if tg_op = 'DELETE' then
    target_inventory_id := old.inventory_id;
    item_display_name := old.material_name;
    if target_inventory_id is null then
      select id into target_inventory_id from public.inventory 
      where lower(item_name) = lower(old.material_name) limit 1;
    end if;
  else
    target_inventory_id := new.inventory_id;
    item_display_name := new.material_name;
    if target_inventory_id is null then
      select id into target_inventory_id from public.inventory 
      where lower(item_name) = lower(new.material_name) limit 1;
    end if;
  end if;

  -- If no matching inventory item, skip stock deduction
  if target_inventory_id is null then
    return coalesce(new, old);
  end if;

  -- Fetch current inventory stock
  select quantity into current_stock from public.inventory where id = target_inventory_id for update;
  if current_stock is null then
    current_stock := 0;
  end if;

  -- A. INSERT Operation
  if tg_op = 'INSERT' then
    qty_needed := new.quantity;
    if current_stock < qty_needed then
      raise exception 'Insufficient stock for %: requested %, but only % remaining in inventory.', 
        item_display_name, qty_needed, current_stock;
    end if;

    update public.inventory
    set quantity = quantity - qty_needed,
        last_updated = now()
    where id = target_inventory_id;

    if new.inventory_id is null then
      new.inventory_id := target_inventory_id;
    end if;

  -- B. UPDATE Operation (Quantity adjusted)
  elsif tg_op = 'UPDATE' then
    qty_delta := new.quantity - old.quantity;
    if qty_delta > 0 and current_stock < qty_delta then
      raise exception 'Insufficient stock for %: additional % requested, but only % remaining in inventory.', 
        item_display_name, qty_delta, current_stock;
    end if;

    update public.inventory
    set quantity = quantity - qty_delta,
        last_updated = now()
    where id = target_inventory_id;

  -- C. DELETE Operation (Restore stock)
  elsif tg_op = 'DELETE' then
    update public.inventory
    set quantity = quantity + old.quantity,
        last_updated = now()
    where id = target_inventory_id;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Triggers for job_materials
drop trigger if exists trg_job_materials_stock_insert on public.job_materials;
create trigger trg_job_materials_stock_insert
before insert on public.job_materials
for each row execute function public.process_job_material_stock();

drop trigger if exists trg_job_materials_stock_update on public.job_materials;
create trigger trg_job_materials_stock_update
before update on public.job_materials
for each row execute function public.process_job_material_stock();

drop trigger if exists trg_job_materials_stock_delete on public.job_materials;
create trigger trg_job_materials_stock_delete
after delete on public.job_materials
for each row execute function public.process_job_material_stock();

-- 2. Function for public.sale_items stock adjustment
create or replace function public.process_sale_item_stock()
returns trigger as $$
declare
  target_inventory_id uuid;
  current_stock numeric;
  item_display_name text;
  qty_needed numeric;
  qty_delta numeric;
begin
  if tg_op = 'DELETE' then
    target_inventory_id := old.inventory_id;
    item_display_name := old.item_name;
    if target_inventory_id is null then
      select id into target_inventory_id from public.inventory 
      where lower(item_name) = lower(old.item_name) limit 1;
    end if;
  else
    target_inventory_id := new.inventory_id;
    item_display_name := new.item_name;
    if target_inventory_id is null then
      select id into target_inventory_id from public.inventory 
      where lower(item_name) = lower(new.item_name) limit 1;
    end if;
  end if;

  if target_inventory_id is null then
    return coalesce(new, old);
  end if;

  select quantity into current_stock from public.inventory where id = target_inventory_id for update;
  if current_stock is null then
    current_stock := 0;
  end if;

  if tg_op = 'INSERT' then
    qty_needed := new.quantity;
    if current_stock < qty_needed then
      raise exception 'Insufficient stock for %: requested %, but only % remaining in inventory.', 
        item_display_name, qty_needed, current_stock;
    end if;

    update public.inventory
    set quantity = quantity - qty_needed,
        last_updated = now()
    where id = target_inventory_id;

    if new.inventory_id is null then
      new.inventory_id := target_inventory_id;
    end if;

  elsif tg_op = 'UPDATE' then
    qty_delta := new.quantity - old.quantity;
    if qty_delta > 0 and current_stock < qty_delta then
      raise exception 'Insufficient stock for %: additional % requested, but only % remaining in inventory.', 
        item_display_name, qty_delta, current_stock;
    end if;

    update public.inventory
    set quantity = quantity - qty_delta,
        last_updated = now()
    where id = target_inventory_id;

  elsif tg_op = 'DELETE' then
    update public.inventory
    set quantity = quantity + old.quantity,
        last_updated = now()
    where id = target_inventory_id;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Triggers for sale_items
drop trigger if exists trg_sale_items_stock_insert on public.sale_items;
create trigger trg_sale_items_stock_insert
before insert on public.sale_items
for each row execute function public.process_sale_item_stock();

drop trigger if exists trg_sale_items_stock_update on public.sale_items;
create trigger trg_sale_items_stock_update
before update on public.sale_items
for each row execute function public.process_sale_item_stock();

drop trigger if exists trg_sale_items_stock_delete on public.sale_items;
create trigger trg_sale_items_stock_delete
after delete on public.sale_items
for each row execute function public.process_sale_item_stock();

-- 3. Update RLS policies on inventory: Restrict direct client UPDATE/INSERT/DELETE to Admin only
alter table public.inventory enable row level security;

drop policy if exists "inventory_all_admin" on public.inventory;
drop policy if exists "inventory_select_receptionist" on public.inventory;
drop policy if exists "inventory_select_all_staff" on public.inventory;
drop policy if exists "inventory_admin_manage" on public.inventory;

-- All authenticated users can SELECT live inventory stock
create policy "inventory_select_authenticated" on public.inventory
  for select to authenticated
  using (true);

-- Only Admin role can directly INSERT, UPDATE, or DELETE inventory items (manual restocking/adjustments)
create policy "inventory_admin_manage" on public.inventory
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Reload schema cache
notify pgrst, 'reload schema';
