-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Fix Invoices & Sales Status Check Constraints
-- Allows 'partial', 'unpaid', 'pending' statuses on invoices and sales tables
-- so partial payments and unpaid credit bills record successfully.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Update check constraint on public.invoices
ALTER TABLE public.invoices 
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices 
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN (
    'paid', 'draft', 'cancelled', 'partial', 'unpaid', 'pending',
    'Paid', 'Draft', 'Cancelled', 'Partial', 'Unpaid', 'Pending'
  ));

-- 2. Update check constraint on public.sales
ALTER TABLE public.sales 
  DROP CONSTRAINT IF EXISTS sales_status_check;

ALTER TABLE public.sales 
  ADD CONSTRAINT sales_status_check 
  CHECK (status IN (
    'paid', 'draft', 'cancelled', 'partial', 'unpaid', 'pending',
    'Paid', 'Draft', 'Cancelled', 'Partial', 'Unpaid', 'Pending'
  ));

-- 3. Update create_invoice_v2 RPC to support 'partial' and 'unpaid'
CREATE OR REPLACE FUNCTION public.create_invoice_v2(
  p_customer_name    text,
  p_customer_contact text,
  p_customer_email   text,
  p_customer_gstin   text,
  p_tax_regime       text,
  p_discount         numeric,
  p_payment_method   text,
  p_status           text,
  p_notes            text,
  p_job_id           uuid,
  p_items            jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_invoice_id     uuid;
  v_invoice_code   text;
  v_subtotal       numeric := 0;
  v_total_cgst     numeric := 0;
  v_total_sgst     numeric := 0;
  v_total_igst     numeric := 0;
  v_grand_total    numeric := 0;
  v_round_off      numeric := 0;
  v_raw_total      numeric := 0;
  v_item           jsonb;
  v_product_id     uuid;
  v_item_name      text;
  v_quantity       numeric;
  v_selling_rate   numeric;
  v_selling_amount numeric;
  v_taxable_amount numeric;
  v_cgst_amount    numeric;
  v_sgst_amount    numeric;
  v_igst_amount    numeric;
  v_tax_mode       text;
  v_tax_percent    numeric;
  v_serial_number  text;
  v_hsn_code       text;
  v_purchase_rate  numeric;
  v_norm_status    text;
  v_norm_payment   text;
  v_norm_regime    text;
  v_amount_paid    numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_norm_status := CASE lower(COALESCE(p_status, 'paid'))
    WHEN 'paid'      THEN 'paid'
    WHEN 'draft'     THEN 'draft'
    WHEN 'partial'   THEN 'partial'
    WHEN 'unpaid'    THEN 'unpaid'
    WHEN 'pending'   THEN 'pending'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'paid'
  END;

  v_norm_payment := CASE lower(COALESCE(p_payment_method, 'Cash'))
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    ELSE p_payment_method
  END;

  v_norm_regime := CASE lower(COALESCE(p_tax_regime, 'intra_state'))
    WHEN 'intra_state' THEN 'intra_state'
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

  v_invoice_code := public.generate_invoice_code();

  INSERT INTO public.invoices (
    invoice_code, customer_name, customer_contact, customer_email,
    customer_gstin, tax_regime, subtotal, total_cgst, total_sgst, total_igst,
    discount, round_off, grand_total, payment_method, status, notes, job_id,
    created_by, paid_at
  ) VALUES (
    v_invoice_code, p_customer_name, p_customer_contact, p_customer_email,
    p_customer_gstin, v_norm_regime,
    0, 0, 0, 0,
    COALESCE(p_discount, 0), 0, 0,
    v_norm_payment, v_norm_status, p_notes, p_job_id, auth.uid(),
    CASE WHEN v_norm_status = 'paid' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id     := nullif((v_item->>'product_id'), '')::uuid;
    v_item_name      := COALESCE(v_item->>'item_name', 'Item');
    v_quantity       := COALESCE((v_item->>'quantity')::numeric, 1);
    v_selling_rate   := nullif((v_item->>'selling_rate'), '')::numeric;
    v_selling_amount := nullif((v_item->>'selling_amount'), '')::numeric;
    v_serial_number  := nullif((v_item->>'serial_number'), '');
    v_hsn_code       := nullif((v_item->>'hsn_code'), '');
    v_tax_mode       := COALESCE(nullif(v_item->>'tax_mode', ''), 'exclusive');
    v_tax_percent    := COALESCE(nullif((v_item->>'tax_percent'), '')::numeric, 18);

    IF v_product_id IS NOT NULL THEN
      SELECT i.purchase_rate INTO v_purchase_rate
      FROM public.inventory i WHERE i.product_id = v_product_id LIMIT 1;

      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := COALESCE(v_purchase_rate, 0);
        v_selling_amount := v_selling_rate * v_quantity;
      END IF;
    ELSE
      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := 0;
        v_selling_amount := 0;
      END IF;
    END IF;

    IF v_tax_mode = 'inclusive' THEN
      v_taxable_amount := v_selling_amount / (1 + (v_tax_percent / 100));
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amount := (v_selling_amount - v_taxable_amount) / 2;
        v_sgst_amount := v_cgst_amount;
        v_igst_amount := 0;
      ELSE
        v_cgst_amount := 0;
        v_sgst_amount := 0;
        v_igst_amount := v_selling_amount - v_taxable_amount;
      END IF;
    ELSE
      v_taxable_amount := v_selling_amount;
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amount := v_taxable_amount * (v_tax_percent / 200);
        v_sgst_amount := v_cgst_amount;
        v_igst_amount := 0;
      ELSE
        v_cgst_amount := 0;
        v_sgst_amount := 0;
        v_igst_amount := v_taxable_amount * (v_tax_percent / 100);
      END IF;
    END IF;

    v_subtotal   := v_subtotal + v_taxable_amount;
    v_total_cgst := v_total_cgst + v_cgst_amount;
    v_total_sgst := v_total_sgst + v_sgst_amount;
    v_total_igst := v_total_igst + v_igst_amount;

    INSERT INTO public.invoice_items (
      invoice_id, product_id, item_name, quantity, selling_rate,
      serial_number, hsn_code, tax_mode, tax_percent,
      cgst_rate, sgst_rate, igst_rate,
      taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount
    ) VALUES (
      v_invoice_id, v_product_id, v_item_name, v_quantity, v_selling_rate,
      v_serial_number, v_hsn_code, v_tax_mode, v_tax_percent,
      CASE WHEN v_norm_regime = 'intra_state' THEN v_tax_percent / 2 ELSE 0 END,
      CASE WHEN v_norm_regime = 'intra_state' THEN v_tax_percent / 2 ELSE 0 END,
      CASE WHEN v_norm_regime = 'inter_state' THEN v_tax_percent     ELSE 0 END,
      round(v_taxable_amount, 2),
      round(v_cgst_amount, 2),
      round(v_sgst_amount, 2),
      round(v_igst_amount, 2),
      round(v_taxable_amount + v_cgst_amount + v_sgst_amount + v_igst_amount, 2)
    );

    IF v_product_id IS NOT NULL THEN
      UPDATE public.inventory
      SET stock_quantity = GREATEST(0, stock_quantity - v_quantity),
          updated_at = now()
      WHERE product_id = v_product_id;

      INSERT INTO public.inventory_transactions (
        product_id, transaction_type, quantity, unit_price,
        reference_id, reference_type, notes, created_by
      ) VALUES (
        v_product_id, 'sale', v_quantity, v_selling_rate,
        v_invoice_id, 'invoice', 'Sold via invoice ' || v_invoice_code, auth.uid()
      );
    END IF;
  END LOOP;

  v_raw_total   := v_subtotal + v_total_cgst + v_total_sgst + v_total_igst - COALESCE(p_discount, 0);
  v_grand_total := round(v_raw_total);
  v_round_off   := v_grand_total - v_raw_total;

  v_amount_paid := CASE
    WHEN v_norm_status = 'paid' THEN v_grand_total
    ELSE 0
  END;

  UPDATE public.invoices
  SET subtotal    = round(v_subtotal, 2),
      total_cgst  = round(v_total_cgst, 2),
      total_sgst  = round(v_total_sgst, 2),
      total_igst  = round(v_total_igst, 2),
      grand_total = v_grand_total,
      round_off   = round(v_round_off, 2),
      amount_paid = v_amount_paid
  WHERE id = v_invoice_id;

  RETURN jsonb_build_object(
    'invoice_id',   v_invoice_id,
    'invoice_code', v_invoice_code,
    'grand_total',  v_grand_total,
    'amount_paid',  v_amount_paid,
    'status',       v_norm_status
  );
END;
$$;

-- 4. Update create_invoice RPC to support 'partial' and 'unpaid'
CREATE OR REPLACE FUNCTION public.create_invoice(
  p_customer_name    text,
  p_customer_contact text     DEFAULT NULL,
  p_customer_email   text     DEFAULT NULL,
  p_customer_gstin   text     DEFAULT NULL,
  p_tax_regime       text     DEFAULT 'intra_state',
  p_items            jsonb    DEFAULT '[]'::jsonb,
  p_discount         numeric  DEFAULT 0,
  p_payment_method   text     DEFAULT 'Cash',
  p_status           text     DEFAULT 'paid',
  p_notes            text     DEFAULT NULL,
  p_job_id           uuid     DEFAULT NULL,
  p_amount_paid      numeric  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_invoice_id     uuid;
  v_invoice_code   text;
  v_item           jsonb;
  v_product_id     uuid;
  v_item_name      text;
  v_quantity       numeric;
  v_selling_rate   numeric;
  v_selling_amount numeric;
  v_serial_number  text;
  v_hsn_code       text;
  v_tax_percent    numeric;
  v_cgst_rate      numeric;
  v_sgst_rate      numeric;
  v_igst_rate      numeric;
  v_tax_mode       text;
  v_line_total     numeric;
  v_taxable        numeric;
  v_cgst_amt       numeric;
  v_sgst_amt       numeric;
  v_igst_amt       numeric;
  v_subtotal       numeric := 0;
  v_total_cgst     numeric := 0;
  v_total_sgst     numeric := 0;
  v_total_igst     numeric := 0;
  v_total_tax      numeric := 0;
  v_grand_total    numeric;
  v_round_off      numeric;
  v_purchase_rate  numeric;
  v_norm_status    text;
  v_norm_payment   text;
  v_norm_regime    text;
  v_amount_paid    numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_norm_status := CASE lower(COALESCE(p_status, 'paid'))
    WHEN 'paid'      THEN 'paid'
    WHEN 'draft'     THEN 'draft'
    WHEN 'partial'   THEN 'partial'
    WHEN 'unpaid'    THEN 'unpaid'
    WHEN 'pending'   THEN 'pending'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'paid'
  END;

  v_norm_payment := CASE lower(COALESCE(p_payment_method, 'Cash'))
    WHEN 'cash'          THEN 'Cash'
    WHEN 'card'          THEN 'Card'
    WHEN 'upi'           THEN 'UPI'
    WHEN 'bank transfer' THEN 'Bank Transfer'
    ELSE p_payment_method
  END;

  v_norm_regime := CASE lower(COALESCE(p_tax_regime, 'intra_state'))
    WHEN 'intra_state' THEN 'intra_state'
    WHEN 'inter_state' THEN 'inter_state'
    ELSE 'intra_state'
  END;

  v_invoice_code := public.generate_invoice_code();

  INSERT INTO public.invoices (
    invoice_code, customer_name, customer_contact, customer_email,
    customer_gstin, tax_regime, subtotal, total_cgst, total_sgst, total_igst,
    discount, round_off, grand_total, payment_method, status, notes, job_id,
    created_by, paid_at
  ) VALUES (
    v_invoice_code, p_customer_name, p_customer_contact, p_customer_email,
    p_customer_gstin, v_norm_regime,
    0, 0, 0, 0,
    COALESCE(p_discount, 0), 0, 0,
    v_norm_payment, v_norm_status, p_notes, p_job_id, auth.uid(),
    CASE WHEN v_norm_status = 'paid' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id     := nullif((v_item->>'product_id'), '')::uuid;
    v_item_name      := COALESCE(v_item->>'item_name', 'Item');
    v_quantity       := COALESCE((v_item->>'quantity')::numeric, 1);
    v_selling_rate   := nullif((v_item->>'selling_rate'), '')::numeric;
    v_selling_amount := nullif((v_item->>'selling_amount'), '')::numeric;
    v_serial_number  := nullif((v_item->>'serial_number'), '');
    v_hsn_code       := nullif((v_item->>'hsn_code'), '');
    v_tax_mode       := COALESCE(nullif(v_item->>'tax_mode', ''), 'exclusive');
    v_tax_percent    := COALESCE(nullif((v_item->>'tax_percent'), '')::numeric, 18);

    IF v_product_id IS NOT NULL THEN
      SELECT i.purchase_rate INTO v_purchase_rate
      FROM public.inventory i WHERE i.product_id = v_product_id LIMIT 1;

      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := COALESCE(v_purchase_rate, 0);
        v_selling_amount := v_selling_rate * v_quantity;
      END IF;
    ELSE
      IF v_selling_rate IS NULL AND v_selling_amount IS NOT NULL THEN
        v_selling_rate := v_selling_amount / v_quantity;
      ELSIF v_selling_rate IS NOT NULL AND v_selling_amount IS NULL THEN
        v_selling_amount := v_selling_rate * v_quantity;
      ELSIF v_selling_rate IS NULL AND v_selling_amount IS NULL THEN
        v_selling_rate := 0;
        v_selling_amount := 0;
      END IF;
    END IF;

    IF v_norm_regime = 'intra_state' THEN
      v_cgst_rate := v_tax_percent / 2;
      v_sgst_rate := v_tax_percent / 2;
      v_igst_rate := 0;
    ELSE
      v_cgst_rate := 0;
      v_sgst_rate := 0;
      v_igst_rate := v_tax_percent;
    END IF;

    IF v_tax_mode = 'inclusive' THEN
      v_line_total := v_selling_amount;
      v_taxable    := v_line_total / (1 + (v_tax_percent / 100));
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amt := (v_line_total - v_taxable) / 2;
        v_sgst_amt := v_cgst_amt;
        v_igst_amt := 0;
      ELSE
        v_cgst_amt := 0;
        v_sgst_amt := 0;
        v_igst_amt := v_line_total - v_taxable;
      END IF;
    ELSE
      v_taxable := v_selling_amount;
      IF v_norm_regime = 'intra_state' THEN
        v_cgst_amt := v_taxable * (v_cgst_rate / 100);
        v_sgst_amt := v_taxable * (v_sgst_rate / 100);
        v_igst_amt := 0;
      ELSE
        v_cgst_amt := 0;
        v_sgst_amt := 0;
        v_igst_amt := v_taxable * (v_igst_rate / 100);
      END IF;
      v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    END IF;

    v_subtotal   := v_subtotal + v_taxable;
    v_total_cgst := v_total_cgst + v_cgst_amt;
    v_total_sgst := v_total_sgst + v_sgst_amt;
    v_total_igst := v_total_igst + v_igst_amt;

    INSERT INTO public.invoice_items (
      invoice_id, product_id, item_name, quantity, selling_rate,
      serial_number, hsn_code, tax_mode, tax_percent,
      cgst_rate, sgst_rate, igst_rate,
      taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount
    ) VALUES (
      v_invoice_id, v_product_id, v_item_name, v_quantity, v_selling_rate,
      v_serial_number, v_hsn_code, v_tax_mode, v_tax_percent,
      v_cgst_rate, v_sgst_rate, v_igst_rate,
      round(v_taxable, 2), round(v_cgst_amt, 2), round(v_sgst_amt, 2), round(v_igst_amt, 2),
      round(v_line_total, 2)
    );

    IF v_product_id IS NOT NULL THEN
      UPDATE public.inventory
      SET stock_quantity = GREATEST(0, stock_quantity - v_quantity),
          updated_at = now()
      WHERE product_id = v_product_id;

      INSERT INTO public.inventory_transactions (
        product_id, transaction_type, quantity, unit_price,
        reference_id, reference_type, notes, created_by
      ) VALUES (
        v_product_id, 'sale', v_quantity, v_selling_rate,
        v_invoice_id, 'invoice', 'Sold via invoice ' || v_invoice_code, auth.uid()
      );
    END IF;
  END LOOP;

  v_total_tax   := v_total_cgst + v_total_sgst + v_total_igst;
  v_grand_total := round(v_subtotal + v_total_tax - COALESCE(p_discount, 0));
  v_round_off   := v_grand_total - (v_subtotal + v_total_tax - COALESCE(p_discount, 0));

  v_amount_paid := CASE
    WHEN p_amount_paid IS NOT NULL THEN p_amount_paid
    WHEN v_norm_status = 'paid' THEN v_grand_total
    ELSE 0
  END;

  IF p_amount_paid IS NOT NULL THEN
    IF p_amount_paid >= v_grand_total AND v_grand_total > 0 THEN
      v_norm_status := 'paid';
    ELSIF p_amount_paid > 0 THEN
      v_norm_status := 'partial';
    ELSE
      v_norm_status := 'draft';
    END IF;
  END IF;

  UPDATE public.invoices
  SET subtotal    = round(v_subtotal, 2),
      total_cgst  = round(v_total_cgst, 2),
      total_sgst  = round(v_total_sgst, 2),
      total_igst  = round(v_total_igst, 2),
      grand_total = v_grand_total,
      round_off   = round(v_round_off, 2),
      amount_paid = v_amount_paid,
      status      = v_norm_status
  WHERE id = v_invoice_id;

  RETURN jsonb_build_object(
    'invoice_id',   v_invoice_id,
    'invoice_code', v_invoice_code,
    'grand_total',  v_grand_total,
    'amount_paid',  v_amount_paid,
    'status',       v_norm_status
  );
END;
$$;

