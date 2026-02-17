-- check_orphans.sql
-- Check for members linked to non-existent pharmacies
SELECT 'Orphaned Members' as type, count(*) 
FROM public.pharmacy_members pm
LEFT JOIN public.pharmacies p ON pm.pharmacy_id = p.id
WHERE p.id IS NULL;

-- Check for products linked to non-existent pharmacies
SELECT 'Orphaned Products' as type, count(*) 
FROM public.products pr
LEFT JOIN public.pharmacies p ON pr.pharmacy_id = p.id
WHERE p.id IS NULL;

-- Return details if any (limit 5)
SELECT pm.user_id, pm.pharmacy_id 
FROM public.pharmacy_members pm
LEFT JOIN public.pharmacies p ON pm.pharmacy_id = p.id
WHERE p.id IS NULL
LIMIT 5;
