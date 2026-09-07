-- Update get_purchase_history to seamlessly display multi-item purchase orders
CREATE OR REPLACE FUNCTION public.get_purchase_history(
  p_supplier_id UUID DEFAULT NULL,
  p_product_id  UUID DEFAULT NULL,
  p_start_date  DATE DEFAULT NULL,
  p_end_date    DATE DEFAULT NULL,
  p_search      TEXT DEFAULT NULL,
  p_limit       INT DEFAULT 20,
  p_offset      INT DEFAULT 0
)
RETURNS TABLE (
  purchase_id             UUID,
  purchase_code           TEXT,
  purchase_date           DATE,
  supplier_invoice_number TEXT,
  invoice_image_url       TEXT,
  quantity                NUMERIC,
  purchase_rate           NUMERIC,
  selling_rate            NUMERIC,
  subtotal                NUMERIC,
  tax_amount              NUMERIC,
  total_amount            NUMERIC,
  notes                   TEXT,
  created_at              TIMESTAMPTZ,
  supplier_id             UUID,
  supplier_name           TEXT,
  supplier_phone          TEXT,
  supplier_gstin          TEXT,
  supplier_address        TEXT,
  product_id              UUID,
  product_name            TEXT,
  product_sku             TEXT,
  product_unit            TEXT,
  logged_by_id            UUID,
  logged_by_name          TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search TEXT := trim(coalesce(p_search, ''));
BEGIN
  RETURN QUERY
    SELECT 
      pu.id AS purchase_id,
      pu.purchase_code,
      pu.purchase_date,
      pu.supplier_invoice_number,
      pu.invoice_image_url,
      coalesce(
        pu.quantity,
        (SELECT sum(pi.quantity) FROM public.purchase_items pi WHERE pi.purchase_id = pu.id),
        0
      ) AS quantity,
      pu.purchase_rate,
      pu.selling_rate,
      pu.subtotal,
      pu.tax_amount,
      pu.total_amount,
      pu.notes,
      pu.created_at,
      s.id AS supplier_id,
      coalesce(s.name, 'Unknown Supplier') AS supplier_name,
      s.phone AS supplier_phone,
      s.gstin AS supplier_gstin,
      s.address AS supplier_address,
      pu.product_id,
      coalesce(
        pr.name,
        (
          SELECT string_agg(p_sub.name, ', ') 
          FROM (
            SELECT p2.name 
            FROM public.purchase_items pi2 
            JOIN public.products p2 ON p2.id = pi2.product_id 
            WHERE pi2.purchase_id = pu.id 
            LIMIT 3
          ) p_sub
        ),
        'Multi-Item Order'
      ) AS product_name,
      pr.sku AS product_sku,
      coalesce(pr.unit, 'Pcs') AS product_unit,
      u.id AS logged_by_id,
      coalesce(u.name, 'Staff') AS logged_by_name
    FROM public.purchases pu
    LEFT JOIN public.suppliers s ON s.id = pu.supplier_id
    LEFT JOIN public.products pr ON pr.id = pu.product_id
    LEFT JOIN public.users u ON u.id = pu.logged_by
    WHERE (p_supplier_id IS NULL OR pu.supplier_id = p_supplier_id)
      AND (
        p_product_id IS NULL 
        OR pu.product_id = p_product_id
        OR EXISTS (
          SELECT 1 FROM public.purchase_items pi3 
          WHERE pi3.purchase_id = pu.id AND pi3.product_id = p_product_id
        )
      )
      AND (p_start_date IS NULL OR pu.purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR pu.purchase_date <= p_end_date)
      AND (
        v_search = '' 
        OR pu.purchase_code ILIKE ('%' || v_search || '%')
        OR pu.supplier_invoice_number ILIKE ('%' || v_search || '%')
        OR s.name ILIKE ('%' || v_search || '%')
        OR pr.name ILIKE ('%' || v_search || '%')
        OR EXISTS (
          SELECT 1 FROM public.purchase_items pi4
          JOIN public.products p4 ON p4.id = pi4.product_id
          WHERE pi4.purchase_id = pu.id AND p4.name ILIKE ('%' || v_search || '%')
        )
      )
    ORDER BY pu.purchase_date DESC, pu.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_purchase_history TO authenticated, anon;
