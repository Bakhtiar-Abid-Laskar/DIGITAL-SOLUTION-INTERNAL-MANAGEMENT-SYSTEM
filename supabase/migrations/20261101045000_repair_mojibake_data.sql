-- Migration: 20261101045000_repair_mojibake_data.sql
-- Description: Clean up any mojibake sequences (e.g. \u00e2\u201a\u00b9 -> ₹, \u00e2\u2014\u008f -> —) in user text columns

DO $$
DECLARE
  v_corrupted_rupee TEXT := chr(226) || chr(8218) || chr(185); -- corrupted UTF-8 rupee
  v_corrupted_dash  TEXT := chr(226) || chr(8364) || chr(8221); -- corrupted UTF-8 em-dash
  v_rupee TEXT := chr(8377); -- ₹
  v_dash  TEXT := chr(8212); -- —
BEGIN
  -- Repair public.jobs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
    UPDATE public.jobs
    SET reported_issue = replace(replace(reported_issue, v_corrupted_rupee, v_rupee), v_corrupted_dash, v_dash)
    WHERE reported_issue LIKE '%' || v_corrupted_rupee || '%' OR reported_issue LIKE '%' || v_corrupted_dash || '%';

    UPDATE public.jobs
    SET remarks = replace(replace(remarks, v_corrupted_rupee, v_rupee), v_corrupted_dash, v_dash)
    WHERE remarks LIKE '%' || v_corrupted_rupee || '%' OR remarks LIKE '%' || v_corrupted_dash || '%';

    UPDATE public.jobs
    SET work_notes = replace(replace(work_notes, v_corrupted_rupee, v_rupee), v_corrupted_dash, v_dash)
    WHERE work_notes LIKE '%' || v_corrupted_rupee || '%' OR work_notes LIKE '%' || v_corrupted_dash || '%';
  END IF;

  -- Repair public.payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    UPDATE public.payments
    SET description = replace(replace(description, v_corrupted_rupee, v_rupee), v_corrupted_dash, v_dash)
    WHERE description LIKE '%' || v_corrupted_rupee || '%' OR description LIKE '%' || v_corrupted_dash || '%';

    UPDATE public.payments
    SET notes = replace(replace(notes, v_corrupted_rupee, v_rupee), v_corrupted_dash, v_dash)
    WHERE notes LIKE '%' || v_corrupted_rupee || '%' OR notes LIKE '%' || v_corrupted_dash || '%';
  END IF;

  -- Repair public.invoices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    UPDATE public.invoices
    SET notes = replace(replace(notes, v_corrupted_rupee, v_rupee), v_corrupted_dash, v_dash)
    WHERE notes LIKE '%' || v_corrupted_rupee || '%' OR notes LIKE '%' || v_corrupted_dash || '%';
  END IF;

  -- Repair public.sales
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales') THEN
    UPDATE public.sales
    SET notes = replace(replace(notes, v_corrupted_rupee, v_rupee), v_corrupted_dash, v_dash)
    WHERE notes LIKE '%' || v_corrupted_rupee || '%' OR notes LIKE '%' || v_corrupted_dash || '%';
  END IF;

  -- Repair public.inventory
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
    UPDATE public.inventory
    SET name = replace(replace(name, v_corrupted_rupee, v_rupee), v_corrupted_dash, v_dash)
    WHERE name LIKE '%' || v_corrupted_rupee || '%' OR name LIKE '%' || v_corrupted_dash || '%';

    UPDATE public.inventory
    SET description = replace(replace(description, v_corrupted_rupee, v_rupee), v_corrupted_dash, v_dash)
    WHERE description LIKE '%' || v_corrupted_rupee || '%' OR description LIKE '%' || v_corrupted_dash || '%';
  END IF;
END $$;
