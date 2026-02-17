-- check_constraint_and_simulate.sql

-- 1. Inspect the Constraint Definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'products_pharmacy_id_fkey';

-- 2. Verify Pharmacy Exists (again, strictly)
SELECT id, length(id::text) FROM public.pharmacies WHERE id = '140d30de-77ec-47dc-ae90-059ce3a710e7';

-- 3. Simulate Insertion as the User
BEGIN;
  -- Switch to the user (mocking Auth)
  -- Note: In Supabase SQL Editor, we can't easily switch 'auth.uid()' without set_config for specific claims if using getting started patterns, 
  -- but we can test if the ID exists in the table directly first.
  
  -- Try to insert strictly using the same ID
  INSERT INTO public.products (
    name, pharmacy_id, price, stock, description, is_active
  ) VALUES (
    'Teste Diagnostico FK',
    '140d30de-77ec-47dc-ae90-059ce3a710e7', -- The ID from the error
    1.00,
    10,
    'Teste de inserção',
    true
  ) RETURNING id;

ROLLBACK; -- Always rollback the test
