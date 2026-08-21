-- Migration: 20260818000001_phase4_serial_numbers.sql
-- Description: Phase 4 Feature - Add serial numbers support to stock and invoices

DO $$ 
BEGIN
    -- 1. Add to inventory_transactions (if it exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
        ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS serial_numbers text;
    END IF;

    -- 2. Add to stock_transactions (if it exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_transactions') THEN
        ALTER TABLE public.stock_transactions ADD COLUMN IF NOT EXISTS serial_numbers text;
    END IF;

    -- 3. Add to invoice_items (if it exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoice_items') THEN
        ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS serial_number text;
    END IF;

    -- 4. Add to sale_items (if it exists, since this was the original name)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sale_items') THEN
        ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS serial_number text;
    END IF;
END $$;

-- 5. Safely recreate add_stock RPC to accept p_serial_numbers
DROP FUNCTION IF EXISTS public.add_stock(uuid, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.add_stock(uuid, numeric, numeric, text, text);

CREATE OR REPLACE FUNCTION public.add_stock(
  p_product_id uuid,
  p_quantity numeric,
  p_rate numeric,
  p_notes text,
  p_serial_numbers text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_inventory_id uuid;
  v_table_exists boolean;
BEGIN
  -- 1. Admin Authorization Guard
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND is_active = true) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can add stock manually.';
  END IF;

  -- 2. Update inventory
  UPDATE public.inventory
  SET 
    quantity_cached = quantity_cached + p_quantity,
    purchase_rate = p_rate,
    last_updated = now()
  WHERE product_id = p_product_id
  RETURNING id INTO v_inventory_id;

  IF v_inventory_id IS NULL THEN
    RAISE EXCEPTION 'Inventory record not found for product %', p_product_id;
  END IF;

  -- 3. Insert transaction log
  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') INTO v_table_exists;
  
  IF v_table_exists THEN
    INSERT INTO public.inventory_transactions (
      inventory_id,
      transaction_type,
      quantity,
      reference_note,
      created_by,
      serial_numbers
    ) VALUES (
      v_inventory_id,
      'IN',
      p_quantity,
      p_notes,
      auth.uid(),
      p_serial_numbers
    );
  ELSE
    SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_transactions') INTO v_table_exists;
    IF v_table_exists THEN
      INSERT INTO public.stock_transactions (
        product_id,
        transaction_type,
        quantity,
        notes,
        created_by,
        serial_numbers
      ) VALUES (
        p_product_id,
        'IN',
        p_quantity,
        p_notes,
        auth.uid(),
        p_serial_numbers
      );
    END IF;
  END IF;
END;
$$;
