-- Enhance claim_invoice_serials to resolve invoice_item_id automatically via line_index or product_id
CREATE OR REPLACE FUNCTION public.claim_invoice_serials(
  p_invoice_id UUID,
  p_claims     JSONB -- Array of { invoice_item_id?: UUID, line_index?: INT, product_id?: UUID, serial_ids: [UUID, ...] }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim         JSONB;
  v_item_id       UUID;
  v_serial_id     UUID;
  v_serial_row    public.inventory_unit_serials%ROWTYPE;
  v_serials_arr   TEXT[];
  v_item_name     TEXT;
  v_invoice_code  TEXT;
BEGIN
  SELECT invoice_code INTO v_invoice_code FROM public.invoices WHERE id = p_invoice_id;
  IF v_invoice_code IS NULL THEN
    RAISE EXCEPTION 'Invoice with ID % does not exist.', p_invoice_id;
  END IF;

  -- 1. First release any existing serial claims on this invoice so editing/swapping works seamlessly
  PERFORM public.release_invoice_serials(p_invoice_id);

  -- 2. Process claims
  FOR v_claim IN SELECT * FROM jsonb_array_elements(p_claims)
  LOOP
    v_item_id := nullif(trim(v_claim->>'invoice_item_id'), '')::UUID;

    -- If invoice_item_id not provided directly, resolve via line_index
    IF v_item_id IS NULL AND (v_claim->>'line_index') IS NOT NULL THEN
      SELECT id INTO v_item_id 
      FROM public.invoice_items 
      WHERE invoice_id = p_invoice_id 
      ORDER BY created_at ASC, id ASC 
      OFFSET (v_claim->>'line_index')::int 
      LIMIT 1;
    END IF;

    -- If still null, resolve via product_id
    IF v_item_id IS NULL AND (v_claim->>'product_id') IS NOT NULL THEN
      SELECT id INTO v_item_id 
      FROM public.invoice_items 
      WHERE invoice_id = p_invoice_id 
        AND product_id = (v_claim->>'product_id')::UUID
      ORDER BY created_at ASC, id ASC 
      LIMIT 1;
    END IF;

    IF v_item_id IS NULL THEN
      -- Skip or continue if no item line matched
      CONTINUE;
    END IF;

    SELECT item_name INTO v_item_name FROM public.invoice_items WHERE id = v_item_id;
    v_serials_arr := ARRAY[]::TEXT[];

    FOR v_serial_id IN SELECT (x.value)::text::UUID FROM jsonb_array_elements(v_claim->'serial_ids') AS x
    LOOP
      -- Lock serial row FOR UPDATE to guard against simultaneous race conditions
      SELECT * INTO v_serial_row 
      FROM public.inventory_unit_serials 
      WHERE id = v_serial_id 
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Serial unit % was not found in inventory.', v_serial_id;
      END IF;

      IF v_serial_row.status <> 'available' THEN
        RAISE EXCEPTION 'Serial "%" for product "%" is no longer available (currently %). Someone else may have just claimed it.',
          v_serial_row.serial_number, coalesce(v_item_name, 'Product'), v_serial_row.status;
      END IF;

      -- Bind to invoice item
      INSERT INTO public.invoice_item_serials (
        invoice_id, invoice_item_id, serial_id, serial_number
      ) VALUES (
        p_invoice_id, v_item_id, v_serial_id, v_serial_row.serial_number
      );

      -- Update unit serial status
      UPDATE public.inventory_unit_serials
      SET 
        status = 'sold',
        sold_invoice_id = p_invoice_id,
        sold_invoice_item_id = v_item_id,
        sold_at = now(),
        updated_at = now()
      WHERE id = v_serial_id;

      v_serials_arr := array_append(v_serials_arr, v_serial_row.serial_number);
    END LOOP;

    -- Update legacy invoice_items.serial_number string for invoice prints & reports
    IF array_length(v_serials_arr, 1) > 0 THEN
      UPDATE public.invoice_items
      SET serial_number = array_to_string(v_serials_arr, ', ')
      WHERE id = v_item_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invoice_serials(UUID, JSONB) TO authenticated, anon;
