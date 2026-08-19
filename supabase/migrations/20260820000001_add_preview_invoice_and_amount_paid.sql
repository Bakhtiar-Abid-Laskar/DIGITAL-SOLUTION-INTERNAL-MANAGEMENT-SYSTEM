-- =============================================================================
-- Migration: 20260820000001_add_preview_invoice_and_amount_paid.sql
-- Description:
--   1. Add amount_paid column to invoices table
--   2. Create preview_invoice() RPC used by the admin panel sales/new page
--      to show a live tax-calculated preview before the invoice is committed.
-- =============================================================================

-- ─── 1. Add amount_paid to invoices ──────────────────────────────────────────
alter table public.invoices
  add column if not exists amount_paid numeric default 0
    constraint invoices_amount_paid_nonneg check (amount_paid >= 0);

-- Backfill: paid invoices → amount_paid = grand_total
update public.invoices
set amount_paid = grand_total
where status = 'paid'
  and (amount_paid = 0 or amount_paid is null);

comment on column public.invoices.amount_paid
  is 'Amount actually received. For paid invoices defaults to grand_total.';

-- ─── 2. Create preview_invoice() RPC ─────────────────────────────────────────
-- Mirrors the calculation logic in create_invoice() exactly, but does NOT
-- write to any table. Returns a preview JSON identical in shape to what
-- create_invoice() would produce, so the UI can show totals live.
--
-- Parameters match the call site in admin-panel/src/app/(admin)/sales/new/page.tsx:
--   supabase.rpc('preview_invoice', { p_items, p_tax_regime, p_discount })

create or replace function public.preview_invoice(
  p_items       jsonb    default '[]',
  p_tax_regime  text     default 'intra_state',
  p_discount    numeric  default 0
)
returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_item           jsonb;
  v_product_id     uuid;
  v_item_name      text;
  v_quantity       numeric;
  v_selling_rate   numeric;
  v_selling_amount numeric;
  v_serial_number  text;
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
  v_norm_regime    text;

  v_items_out      jsonb   := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  v_norm_regime := case lower(p_tax_regime)
    when 'intra_state' then 'intra_state'
    when 'inter_state' then 'inter_state'
    else 'intra_state'
  end;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id     := nullif((v_item->>'product_id'), '')::uuid;
    v_item_name      := coalesce(v_item->>'item_name', 'Item');
    v_quantity       := coalesce((v_item->>'quantity')::numeric, 1);
    v_selling_rate   := nullif((v_item->>'selling_rate'), '')::numeric;
    v_selling_amount := nullif((v_item->>'selling_amount'), '')::numeric;
    v_serial_number  := nullif((v_item->>'serial_number'), '');
    v_cgst_rate      := coalesce(nullif((v_item->>'cgst_rate'), '')::numeric, 0);
    v_sgst_rate      := coalesce(nullif((v_item->>'sgst_rate'), '')::numeric, 0);
    v_igst_rate      := coalesce(nullif((v_item->>'igst_rate'), '')::numeric, 0);
    v_tax_mode       := coalesce(nullif(v_item->>'tax_mode', ''), 'exclusive');

    -- Resolve rates from inventory/products if product_id supplied
    if v_product_id is not null then
      if v_selling_rate is null and v_selling_amount is not null then
        v_selling_rate := v_selling_amount / v_quantity;
      elsif v_selling_rate is not null and v_selling_amount is null then
        v_selling_amount := v_selling_rate * v_quantity;
      elsif v_selling_rate is null and v_selling_amount is null then
        select coalesce(i.purchase_rate, 0) into v_selling_rate
        from public.inventory i where i.product_id = v_product_id limit 1;
        v_selling_amount := coalesce(v_selling_rate, 0) * v_quantity;
      end if;

      select coalesce(p.cgst_rate, 9), coalesce(p.sgst_rate, 9),
             coalesce(p.igst_rate, 18), coalesce(p.tax_mode, 'exclusive')
      into v_cgst_rate, v_sgst_rate, v_igst_rate, v_tax_mode
      from public.products p where p.id = v_product_id;
    else
      if v_selling_rate is null and v_selling_amount is not null then
        v_selling_rate := v_selling_amount / v_quantity;
      elsif v_selling_rate is not null and v_selling_amount is null then
        v_selling_amount := v_selling_rate * v_quantity;
      elsif v_selling_rate is null and v_selling_amount is null then
        v_selling_rate := 0; v_selling_amount := 0;
      end if;
    end if;

    -- Zero out the irrelevant tax component based on regime
    if v_norm_regime = 'inter_state' then
      v_cgst_rate := 0; v_sgst_rate := 0;
    else
      v_igst_rate := 0;
    end if;

    -- Calculate tax amounts
    if v_tax_mode = 'inclusive' then
      declare v_combined_rate numeric := v_cgst_rate + v_sgst_rate + v_igst_rate;
      begin
        v_taxable  := round(coalesce(v_selling_amount, 0) / (1 + v_combined_rate / 100), 2);
        v_cgst_amt := round(v_taxable * v_cgst_rate / 100, 2);
        v_sgst_amt := round(v_taxable * v_sgst_rate / 100, 2);
        v_igst_amt := round(v_taxable * v_igst_rate / 100, 2);
        v_line_total := coalesce(v_selling_amount, 0);
      end;
    else
      v_taxable    := coalesce(v_selling_amount, 0);
      v_cgst_amt   := round(v_taxable * v_cgst_rate / 100, 2);
      v_sgst_amt   := round(v_taxable * v_sgst_rate / 100, 2);
      v_igst_amt   := round(v_taxable * v_igst_rate / 100, 2);
      v_line_total := v_taxable + v_cgst_amt + v_sgst_amt + v_igst_amt;
    end if;

    v_subtotal   := v_subtotal   + coalesce(v_taxable, 0);
    v_total_cgst := v_total_cgst + coalesce(v_cgst_amt, 0);
    v_total_sgst := v_total_sgst + coalesce(v_sgst_amt, 0);
    v_total_igst := v_total_igst + coalesce(v_igst_amt, 0);
    v_total_tax  := v_total_tax  + coalesce(v_cgst_amt, 0) + coalesce(v_sgst_amt, 0) + coalesce(v_igst_amt, 0);

    v_items_out := v_items_out || jsonb_build_object(
      'item_name',       v_item_name,
      'quantity',        v_quantity,
      'selling_rate',    coalesce(v_selling_rate, 0),
      'serial_number',   v_serial_number,
      'taxable_amount',  coalesce(v_taxable, 0),
      'cgst_rate',       v_cgst_rate,
      'sgst_rate',       v_sgst_rate,
      'igst_rate',       v_igst_rate,
      'cgst_amount',     coalesce(v_cgst_amt, 0),
      'sgst_amount',     coalesce(v_sgst_amt, 0),
      'igst_amount',     coalesce(v_igst_amt, 0),
      'line_total',      coalesce(v_line_total, 0)
    );
  end loop;

  v_grand_total := v_subtotal + v_total_tax - coalesce(p_discount, 0);
  v_round_off   := round(v_grand_total) - v_grand_total;
  v_grand_total := round(v_grand_total);

  return jsonb_build_object(
    'subtotal',    round(v_subtotal, 2),
    'total_cgst',  round(v_total_cgst, 2),
    'total_sgst',  round(v_total_sgst, 2),
    'total_igst',  round(v_total_igst, 2),
    'total_tax',   round(v_total_tax, 2),
    'discount',    coalesce(p_discount, 0),
    'round_off',   round(v_round_off, 2),
    'grand_total', v_grand_total,
    'items',       v_items_out
  );
end;
$$;

-- Grant to authenticated users (admin + receptionist use this)
grant execute on function public.preview_invoice(jsonb, text, numeric) to authenticated;

comment on function public.preview_invoice(jsonb, text, numeric)
  is 'Read-only preview of invoice totals. Identical calculation to create_invoice() but writes nothing to DB. Used by the admin panel sales/new page for live total display.';
