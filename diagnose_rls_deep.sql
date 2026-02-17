-- diagnose_rls_deep.sql

-- 1. Check Specific Pharmacy & Owner (Again)
SELECT id, name, status, owner_id FROM public.pharmacies WHERE id = '140d30de-77ec-47dc-ae90-059ce3a710e7';

-- 2. Check User Profile
SELECT id, role, email FROM public.profiles WHERE id = 'a87b5d25-faad-4b87-b4bf-af9cb869d43b';

-- 3. Check Specific Membership
SELECT * FROM public.pharmacy_members 
WHERE pharmacy_id = '140d30de-77ec-47dc-ae90-059ce3a710e7' 
AND user_id = 'a87b5d25-faad-4b87-b4bf-af9cb869d43b';

-- 4. Check for Systemic "Orphan" Pharmacies (Members pointing to non-existent pharmacies)
SELECT DISTINCT pharmacy_id 
FROM public.pharmacy_members 
WHERE pharmacy_id NOT IN (SELECT id FROM public.pharmacies);

-- 5. List ALL Policies on Products to see if there's a conflict
SELECT polname, polpermissive, polroles, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'public.products'::regclass;
