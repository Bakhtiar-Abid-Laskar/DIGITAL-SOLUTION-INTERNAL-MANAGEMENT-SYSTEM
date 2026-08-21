-- M2. Drop obsolete computed totals
-- These columns are either computed dynamically in views or safely handled at the client level.
-- Dropping them removes redundant schema weight.

ALTER TABLE IF EXISTS public.invoices DROP COLUMN IF EXISTS total_amount;
ALTER TABLE IF EXISTS public.sale_items DROP COLUMN IF EXISTS total_price;
