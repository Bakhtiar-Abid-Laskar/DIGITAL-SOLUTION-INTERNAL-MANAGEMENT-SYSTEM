-- Phase 3 (M5)
-- Secure return_allotted_material by adding SET search_path TO 'public', 'pg_temp'

CREATE OR REPLACE FUNCTION public.return_allotted_material(p_material_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_inventory_id uuid;
  v_quantity numeric;
  v_qty_taken numeric;
  v_status text;
begin
  select inventory_id, quantity, qty_taken, status
  into v_inventory_id, v_quantity, v_qty_taken, v_status
  from public.job_materials
  where id = p_material_id;

  if not found then
    raise exception 'Material not found';
  end if;

  if v_status = 'returned' then
    raise exception 'Material already returned';
  end if;

  -- Update job_materials
  update public.job_materials
  set status = 'returned',
      returned_at = now()
  where id = p_material_id;

  -- The ledger_sync trigger on inventory_transactions might handle inventory caching,
  -- but since it's hard to guess the schema exactly, we'll just increment quantity 
  -- or quantity_cached on inventory.
  if v_inventory_id is not null then
    update public.inventory 
    set quantity = quantity + (v_quantity - coalesce(v_qty_taken, v_quantity))
    where id = v_inventory_id;
  end if;
end;
$function$;
