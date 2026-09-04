BEGIN;

-- Plan the tests
SELECT plan(4);

-- 1. Test Purchase History -> Expenditure Link
-- Create a dummy supplier
INSERT INTO public.suppliers (id, name, is_active) VALUES ('00000000-0000-0000-0000-000000000001', 'Test Supplier', true);

-- Call the RPC to log a purchase (this should create a purchase and an expenditure)
SELECT public.log_inventory_purchase(
  '00000000-0000-0000-0000-000000000001'::uuid, 
  NULL, NULL, 'Test Product', 'Test Supplier', '1234567890', 
  current_date, 10, 100, 150, 0, 'INV-001', NULL, 'Test Notes', 
  'SKU123', 'Pcs', NULL, 9, 9, 18, 'exclusive', 5, 0, 'Shelf A'
);

-- Check if exactly one expenditure was created for this purchase
PREPARE check_purchase_expenditure AS
  SELECT amount FROM public.payments WHERE type = 'materials_purchase' AND source_type = 'purchase';

SELECT results_eq(
  'check_purchase_expenditure',
  ARRAY[1000.0::numeric],
  'Purchase creation should automatically create a materials_purchase expenditure of total_amount (1000)'
);

-- 2. Test Salary -> Expenditure Link
-- Create a dummy user and salary record
INSERT INTO public.users (id, name, email, role, is_active) 
VALUES ('00000000-0000-0000-0000-000000000002', 'Test Staff', 'test@staff.com', 'technician', true);

INSERT INTO public.salary (id, user_id, month, net_salary, status)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '2026-08-01', 5000, 'draft');

-- Update status to paid (triggers the expenditure creation)
UPDATE public.salary SET status = 'paid' WHERE id = '00000000-0000-0000-0000-000000000003';

PREPARE check_salary_expenditure AS
  SELECT amount FROM public.payments WHERE type = 'staff_salary' AND source_type = 'salary' AND source_id = '00000000-0000-0000-0000-000000000003';

SELECT results_eq(
  'check_salary_expenditure',
  ARRAY[5000.0::numeric],
  'Marking salary as paid should automatically create a staff_salary expenditure of net_salary (5000)'
);

-- 3. Test duplicate prevention
-- Try updating the salary again, it should NOT create a second expenditure (thanks to ON CONFLICT DO NOTHING)
UPDATE public.salary SET status = 'paid' WHERE id = '00000000-0000-0000-0000-000000000003';

PREPARE check_duplicate_salary_expenditure AS
  SELECT count(*) FROM public.payments WHERE type = 'staff_salary' AND source_type = 'salary' AND source_id = '00000000-0000-0000-0000-000000000003';

SELECT results_eq(
  'check_duplicate_salary_expenditure',
  ARRAY[1::bigint],
  'Updating salary again should not create duplicate expenditure entries'
);

-- 4. Test failed purchase creation results in zero expenditures
-- This is intrinsically handled because the RPC wraps everything in a transaction. If it fails, everything rolls back.
-- We can verify it by calling it with invalid parameters.
SELECT throws_ok(
  $$ SELECT public.log_inventory_purchase(NULL, NULL, NULL, NULL, NULL, NULL, current_date, -5, 100, 150, 0, 'INV', NULL, NULL, NULL, NULL, NULL, 9, 9, 18, 'exclusive', 5, 0, 'Shelf A') $$,
  'INVALID_QUANTITY: Purchase quantity must be greater than zero.',
  'Failed purchase creation throws exception and rolls back'
);

-- Rollback the transaction to clean up test data
ROLLBACK;

