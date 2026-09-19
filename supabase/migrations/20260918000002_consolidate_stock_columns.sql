-- Migration: 20260918000002_consolidate_stock_columns.sql
-- Description: Fixes F-INV-01 — inventory table has three parallel stock columns
--              (quantity, quantity_cached, stock_quantity) that diverge silently.
--
-- Strategy (safe): We do NOT drop any column because both web and mobile code
-- still read quantity_cached, and baseline RPCs write quantity.
-- Instead we:
--   1. Add stock_quantity column if it doesn't exist yet.
--   2. Perform a one-time sync: set all three columns equal to the most
--      up-to-date value (MAX of the three, preserving data).
--   3. Create a BEFORE INSERT/UPDATE trigger that mirrors any write to one
--      column into the other two, so they can never diverge again.
--   4. Drop the trigger if it already exists (idempotent).
-- ============================================================================

-- 1. Ensure stock_quantity column exists
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS stock_quantity numeric DEFAULT 0;

-- 2. One-time sync — use the maximum of all three to avoid zeroing out data.
--    Comment explains the rule: after this point all three are identical.
UPDATE public.inventory
   SET quantity        = GREATEST(COALESCE(quantity, 0),
                                   COALESCE(quantity_cached, 0),
                                   COALESCE(stock_quantity, 0)),
       quantity_cached = GREATEST(COALESCE(quantity, 0),
                                   COALESCE(quantity_cached, 0),
                                   COALESCE(stock_quantity, 0)),
       stock_quantity  = GREATEST(COALESCE(quantity, 0),
                                   COALESCE(quantity_cached, 0),
                                   COALESCE(stock_quantity, 0));

-- 3. Trigger function — any write to any one of the three columns
--    propagates to the other two automatically.
CREATE OR REPLACE FUNCTION public.sync_inventory_stock_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_stock numeric;
BEGIN
  -- Determine the incoming value: whichever column was explicitly changed.
  -- Priority: stock_quantity (newest column, used by latest RPCs) >
  --            quantity_cached (used by most client queries) >
  --            quantity (legacy baseline column).
  v_stock := CASE
    WHEN NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN NEW.stock_quantity
    WHEN NEW.quantity_cached IS DISTINCT FROM OLD.quantity_cached THEN NEW.quantity_cached
    ELSE NEW.quantity
  END;

  -- Clamp to non-negative
  v_stock := GREATEST(0, COALESCE(v_stock, 0));

  NEW.quantity        := v_stock;
  NEW.quantity_cached := v_stock;
  NEW.stock_quantity  := v_stock;

  RETURN NEW;
END;
$$;

-- 4. Attach trigger (drop first for idempotency)
DROP TRIGGER IF EXISTS trg_sync_stock_columns ON public.inventory;

CREATE TRIGGER trg_sync_stock_columns
  BEFORE INSERT OR UPDATE OF quantity, quantity_cached, stock_quantity
  ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_inventory_stock_columns();

COMMENT ON TRIGGER trg_sync_stock_columns ON public.inventory
  IS 'Keeps quantity, quantity_cached, and stock_quantity identical. Any write to one column propagates to the other two. Fixes F-INV-01 (triplicate stock columns).';

COMMENT ON COLUMN public.inventory.stock_quantity
  IS 'Authoritative stock level column (as of 2026-09-18). Kept in sync with quantity and quantity_cached by trg_sync_stock_columns trigger.';

COMMENT ON COLUMN public.inventory.quantity_cached
  IS 'Legacy alias for stock_quantity. Kept in sync by trg_sync_stock_columns trigger. Retained for backward compatibility with existing client queries.';

COMMENT ON COLUMN public.inventory.quantity
  IS 'Legacy alias for stock_quantity. Kept in sync by trg_sync_stock_columns trigger. Retained for backward compatibility with existing baseline RPCs.';
