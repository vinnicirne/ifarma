-- rigorous_inspection.sql

-- 1. Check Pharmacy Existence Explicitly with Count
SELECT 
    'Pharmacies Count' as check_name, 
    COUNT(*) as count 
FROM public.pharmacies 
WHERE id = '140d30de-77ec-47dc-ae90-059ce3a710e7';

-- 2. Check Members Existence Explicitly with Count
SELECT 
    'Members Count' as check_name, 
    COUNT(*) as count 
FROM public.pharmacy_members 
WHERE pharmacy_id = '140d30de-77ec-47dc-ae90-059ce3a710e7';

-- 3. Get exact definition of the FK constraint on products
SELECT 
    conname as constraint_name, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'products_pharmacy_id_fkey';

-- 4. Check data types of the columns involved
SELECT 
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE 
    (table_name = 'pharmacies' AND column_name = 'id') 
    OR 
    (table_name = 'products' AND column_name = 'pharmacy_id');
