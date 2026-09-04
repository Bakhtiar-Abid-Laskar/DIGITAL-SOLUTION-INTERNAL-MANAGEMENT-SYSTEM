-- ============================================================================
-- REPAIRSHOP — EXPENDITURE LINKS (PURCHASE HISTORY & SALARY)
-- Migration: 20260822120000_expenditure_links.sql
-- ============================================================================

-- 1. Modify the payments table to support source tracking and staff_salary

-- Drop existing constraint on `type`
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_type_check;

-- Re-add constraint with 'staff_salary' included
ALTER TABLE public.payments ADD CONSTRAINT payments_type_check 
  CHECK (type IN ('advance_salary', 'materials_purchase', 'daily_expenditure', 'office_development', 'staff_salary'));

-- Add source tracking columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS source_type text check (source_type in ('purchase', 'salary'));
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS source_id uuid;

-- Add a unique constraint to prevent duplicates
-- A purchase or salary can only have one corresponding payment record.
-- We use a partial index so that manual expenditures (which have NULL source_id) aren't restricted.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_source ON public.payments (source_type, source_id) WHERE source_id IS NOT NULL;


-- 2. Update log_inventory_purchase RPC to automatically insert into payments
CREATE OR REPLACE FUNCTION public.log_inventory_purchase(
  p_supplier_id uuid,
  p_product_id uuid,
  p_inventory_id uuid,
  p_product_name text,
  p_supplier_name text,
  p_supplier_phone text,
  p_purchase_date date,
  p_quantity numeric,
  p_purchase_rate numeric,
  p_selling_rate numeric,
  p_tax_amount numeric,
  p_supplier_invoice_id text,
  p_invoice_image_url text,
  p_notes text,
  p_sku text,
  p_unit text,
  p_hsn_sac text,
  p_cgst_rate numeric,
  p_sgst_rate numeric,
  p_igst_rate numeric,
  p_tax_mode text,
  p_low_stock_threshold integer,
  p_minimum_stock_level integer,
  p_location text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id uuid;
  v_supplier record;
  v_product_id uuid := p_product_id;
  v_inventory_id uuid := p_inventory_id;
  v_purchase_id uuid;
  v_purchase_code text;
  v_qty numeric := coalesce(p_quantity, 0);
  v_pur_rate numeric := coalesce(p_purchase_rate, 0);
  v_sel_rate numeric := coalesce(p_selling_rate, 0);
  v_subtotal numeric;
  v_tax_amount numeric := coalesce(p_tax_amount, 0);
  v_total_amount numeric;
  v_trimmed_prod_name text;
  v_old_inv_qty numeric;
  v_new_inv_qty numeric;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: User must be logged in to log a purchase.';
  END IF;

  IF v_qty <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY: Purchase quantity must be greater than zero.';
  END IF;

  v_subtotal := v_qty * v_pur_rate;
  v_total_amount := v_subtotal + v_tax_amount;

  -- 1. Handle Supplier
  IF p_supplier_id IS NOT NULL THEN
    SELECT id, name INTO v_supplier FROM public.suppliers WHERE id = p_supplier_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SUPPLIER_NOT_FOUND: Supplier ID does not exist.';
    END IF;
  ELSIF trim(coalesce(p_supplier_name, '')) <> '' THEN
    SELECT id, name INTO v_supplier FROM public.suppliers
    WHERE lower(trim(name)) = lower(trim(p_supplier_name)) LIMIT 1;
    
    IF NOT FOUND THEN
      INSERT INTO public.suppliers (name, phone, created_by, created_at, updated_at)
      VALUES (trim(p_supplier_name), nullif(trim(p_supplier_phone), ''), v_caller_id, now(), now())
      RETURNING id, name INTO v_supplier;
    END IF;
  ELSE
    RAISE EXCEPTION 'MISSING_SUPPLIER: Either supplier_id or supplier_name is required.';
  END IF;

  -- 2. Handle Product & Inventory Sync
  v_trimmed_prod_name := trim(coalesce(p_product_name, 'Unknown Product'));
  IF v_product_id IS NULL THEN
    INSERT INTO public.products (
      name, sku, unit, hsn_sac, cgst_rate, sgst_rate, igst_rate, tax_mode, is_active, created_by
    ) VALUES (
      v_trimmed_prod_name,
      nullif(trim(p_sku), ''),
      coalesce(nullif(trim(p_unit), ''), 'Pcs'),
      nullif(trim(p_hsn_sac), ''),
      coalesce(p_cgst_rate, 9),
      coalesce(p_sgst_rate, 9),
      coalesce(p_igst_rate, 18),
      coalesce(p_tax_mode, 'exclusive'),
      true,
      v_caller_id
    ) RETURNING id INTO v_product_id;
  ELSE
    UPDATE public.products
    SET
      sku = coalesce(nullif(trim(p_sku), ''), sku),
      unit = coalesce(nullif(trim(p_unit), ''), unit),
      hsn_sac = coalesce(nullif(trim(p_hsn_sac), ''), hsn_sac),
      cgst_rate = coalesce(p_cgst_rate, cgst_rate),
      sgst_rate = coalesce(p_sgst_rate, sgst_rate),
      igst_rate = coalesce(p_igst_rate, igst_rate),
      tax_mode = coalesce(p_tax_mode, tax_mode),
      updated_at = now()
    WHERE id = v_product_id;
  END IF;

  IF v_inventory_id IS NULL THEN
    INSERT INTO public.inventory (
      item_name, quantity, quantity_cached, unit, low_stock_threshold, minimum_stock_level, purchase_rate, selling_rate, location, product_id, last_updated
    ) VALUES (
      v_trimmed_prod_name,
      0,
      0,
      coalesce(nullif(trim(p_unit), ''), 'Pcs'),
      coalesce(p_low_stock_threshold, 5),
      coalesce(p_minimum_stock_level, 0),
      v_pur_rate,
      v_sel_rate,
      nullif(trim(p_location), ''),
      v_product_id,
      now()
    ) RETURNING id INTO v_inventory_id;
  END IF;

  -- 3. Create Purchase Record
  v_purchase_code := public.generate_purchase_code();

  INSERT INTO public.purchases (
    purchase_code,
    supplier_id,
    product_id,
    inventory_id,
    purchase_date,
    supplier_invoice_number,
    invoice_image_url,
    quantity,
    purchase_rate,
    selling_rate,
    subtotal,
    tax_amount,
    total_amount,
    notes,
    logged_by,
    created_at
  ) VALUES (
    v_purchase_code,
    v_supplier.id,
    v_product_id,
    v_inventory_id,
    coalesce(p_purchase_date, current_date),
    nullif(trim(p_supplier_invoice_id), ''),
    nullif(trim(p_invoice_image_url), ''),
    v_qty,
    v_pur_rate,
    v_sel_rate,
    v_subtotal,
    v_tax_amount,
    v_total_amount,
    nullif(trim(p_notes), ''),
    v_caller_id,
    now()
  ) RETURNING id INTO v_purchase_id;

  -- 4. Atomically increment inventory stock
  SELECT coalesce(quantity, 0) INTO v_old_inv_qty FROM public.inventory WHERE id = v_inventory_id FOR UPDATE;

  UPDATE public.inventory
  SET
    quantity = coalesce(quantity, 0) + v_qty,
    quantity_cached = coalesce(quantity_cached, 0) + v_qty,
    purchase_rate = v_pur_rate,
    selling_rate = CASE WHEN v_sel_rate > 0 THEN v_sel_rate ELSE selling_rate END,
    location = coalesce(nullif(trim(p_location), ''), location),
    last_updated = now()
  WHERE id = v_inventory_id
  RETURNING quantity INTO v_new_inv_qty;

  -- 5. Record in Inventory Transactions Ledger
  INSERT INTO public.inventory_transactions (
    inventory_id,
    transaction_type,
    quantity,
    reference_note,
    created_by,
    created_at
  ) VALUES (
    v_inventory_id,
    'IN',
    v_qty,
    'Purchase Intake (' || v_purchase_code || ') from ' || v_supplier.name,
    v_caller_id,
    now()
  );

  -- 6. Audit Logging
  INSERT INTO public.inventory_audit_log (
    inventory_id, changed_by, change_type, old_quantity, new_quantity, changed_at
  ) VALUES (
    v_inventory_id, v_caller_id, 'PURCHASE_INTAKE', v_old_inv_qty, v_new_inv_qty, now()
  );

  INSERT INTO public.purchase_audit_log (
    purchase_id, action, changed_by, details, created_at
  ) VALUES (
    v_purchase_id,
    'CREATE_PURCHASE',
    v_caller_id,
    jsonb_build_object(
      'purchase_code', v_purchase_code,
      'supplier_name', v_supplier.name,
      'product_name', v_trimmed_prod_name,
      'quantity', v_qty,
      'purchase_rate', v_pur_rate,
      'total_amount', v_total_amount,
      'old_inventory_qty', v_old_inv_qty,
      'new_inventory_qty', v_new_inv_qty
    ),
    now()
  );

  -- 7. Record Expenditure automatically
  IF v_total_amount > 0 THEN
    INSERT INTO public.payments (
      type, amount, description, created_by, created_at, source_type, source_id
    ) VALUES (
      'materials_purchase',
      v_total_amount,
      'Purchase Intake: ' || v_purchase_code || ' - ' || v_trimmed_prod_name,
      v_caller_id,
      now(),
      'purchase',
      v_purchase_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'inventory_id', v_inventory_id,
    'product_id', v_product_id,
    'purchase_code', v_purchase_code,
    'supplier_id', v_supplier.id,
    'supplier_name', v_supplier.name
  );
END;
$$;

-- 3. Add a trigger to automatically create expenditure when salary is marked as paid
CREATE OR REPLACE FUNCTION public.trg_fn_salary_to_expenditure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    IF coalesce(NEW.net_salary, 0) > 0 THEN
      INSERT INTO public.payments (
        type, amount, description, user_id, created_by, created_at, source_type, source_id
      ) VALUES (
        'staff_salary',
        NEW.net_salary,
        'Staff Salary - ' || to_char(NEW.month, 'Mon YYYY'),
        NEW.user_id,
        coalesce(auth.uid(), NEW.generated_by),
        now(),
        'salary',
        NEW.id
      ) ON CONFLICT (source_type, source_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_salary_to_expenditure ON public.salary;
CREATE TRIGGER trigger_salary_to_expenditure
AFTER UPDATE OF status ON public.salary
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_salary_to_expenditure();
