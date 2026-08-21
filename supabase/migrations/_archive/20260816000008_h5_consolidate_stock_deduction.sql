-- H5. Consolidate duplicated stock-deduction logic
-- Combines `process_job_material_stock` and `process_sale_item_stock` into a single 
-- function `process_inventory_stock_change` that uses TG_TABLE_NAME to prevent logic drift.

CREATE OR REPLACE FUNCTION public.process_inventory_stock_change()
RETURNS trigger AS $$
DECLARE
  target_inventory_id uuid;
  current_stock numeric;
  display_name text;
  qty_needed numeric;
  qty_delta numeric;
BEGIN
  -- 1. Resolve Target Inventory ID & Display Name
  IF TG_OP = 'DELETE' THEN
    target_inventory_id := old.inventory_id;
    IF TG_TABLE_NAME = 'job_materials' THEN
      display_name := old.material_name;
    ELSIF TG_TABLE_NAME = 'sale_items' THEN
      display_name := old.item_name;
    END IF;
  ELSE
    target_inventory_id := new.inventory_id;
    IF TG_TABLE_NAME = 'job_materials' THEN
      display_name := new.material_name;
    ELSIF TG_TABLE_NAME = 'sale_items' THEN
      display_name := new.item_name;
    END IF;
  END IF;

  -- 2. Fallback lookup if inventory_id is null
  IF target_inventory_id IS NULL THEN
    SELECT id INTO target_inventory_id FROM public.inventory 
    WHERE lower(item_name) = lower(display_name) LIMIT 1;
  END IF;

  IF target_inventory_id IS NULL THEN
    RETURN coalesce(new, old);
  END IF;

  -- 3. Lock inventory row and fetch current stock
  SELECT quantity INTO current_stock FROM public.inventory WHERE id = target_inventory_id FOR UPDATE;
  IF current_stock IS NULL THEN
    current_stock := 0;
  END IF;

  -- 4. Apply Operations
  IF TG_OP = 'INSERT' THEN
    qty_needed := new.quantity;
    IF current_stock < qty_needed THEN
      RAISE EXCEPTION 'Insufficient stock for %: requested %, but only % remaining in inventory.', 
        display_name, qty_needed, current_stock;
    END IF;

    UPDATE public.inventory
    SET quantity = quantity - qty_needed,
        last_updated = now()
    WHERE id = target_inventory_id;

    IF new.inventory_id IS NULL THEN
      new.inventory_id := target_inventory_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    qty_delta := new.quantity - old.quantity;
    IF qty_delta > 0 AND current_stock < qty_delta THEN
      RAISE EXCEPTION 'Insufficient stock for %: additional % requested, but only % remaining in inventory.', 
        display_name, qty_delta, current_stock;
    END IF;

    UPDATE public.inventory
    SET quantity = quantity - qty_delta,
        last_updated = now()
    WHERE id = target_inventory_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.inventory
    SET quantity = quantity + old.quantity,
        last_updated = now()
    WHERE id = target_inventory_id;
  END IF;

  RETURN coalesce(new, old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind job_materials triggers
DROP TRIGGER IF EXISTS trg_job_materials_stock_insert ON public.job_materials;
CREATE TRIGGER trg_job_materials_stock_insert
BEFORE INSERT ON public.job_materials
FOR EACH ROW EXECUTE FUNCTION public.process_inventory_stock_change();

DROP TRIGGER IF EXISTS trg_job_materials_stock_update ON public.job_materials;
CREATE TRIGGER trg_job_materials_stock_update
BEFORE UPDATE ON public.job_materials
FOR EACH ROW EXECUTE FUNCTION public.process_inventory_stock_change();

DROP TRIGGER IF EXISTS trg_job_materials_stock_delete ON public.job_materials;
CREATE TRIGGER trg_job_materials_stock_delete
AFTER DELETE ON public.job_materials
FOR EACH ROW EXECUTE FUNCTION public.process_inventory_stock_change();

-- Rebind sale_items triggers
DROP TRIGGER IF EXISTS trg_sale_items_stock_insert ON public.sale_items;
CREATE TRIGGER trg_sale_items_stock_insert
BEFORE INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.process_inventory_stock_change();

DROP TRIGGER IF EXISTS trg_sale_items_stock_update ON public.sale_items;
CREATE TRIGGER trg_sale_items_stock_update
BEFORE UPDATE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.process_inventory_stock_change();

DROP TRIGGER IF EXISTS trg_sale_items_stock_delete ON public.sale_items;
CREATE TRIGGER trg_sale_items_stock_delete
AFTER DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.process_inventory_stock_change();

-- Drop the old duplicated functions
DROP FUNCTION IF EXISTS public.process_job_material_stock() CASCADE;
DROP FUNCTION IF EXISTS public.process_sale_item_stock() CASCADE;
