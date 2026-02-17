-- diagnose_insert_error.sql
-- 1. Check User Profile and Role
SELECT * FROM public.profiles WHERE id = 'a87b5d25-faad-4b87-b4bf-af9cb869d43b';

-- 2. Check Pharmacy Details
SELECT id, owner_id, status, name FROM public.pharmacies WHERE id = '140d30de-77ec-47dc-ae90-059ce3a710e7';

-- 3. Check Pharmacy Membership
SELECT * FROM public.pharmacy_members WHERE user_id = 'a87b5d25-faad-4b87-b4bf-af9cb869d43b' AND pharmacy_id = '140d30de-77ec-47dc-ae90-059ce3a710e7';

-- 4. Check RLS on pharmacy_members
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'pharmacy_members';
SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'pharmacy_members';

-- 5. Test the Logic used in the Policy
SELECT 
  'Is Admin?' as check_type,
  EXISTS (SELECT 1 FROM public.profiles WHERE id = 'a87b5d25-faad-4b87-b4bf-af9cb869d43b' AND role IN ('admin', 'support', 'operator', 'specialist')) as result;

SELECT 
    'Is Member?' as check_type,
    '140d30de-77ec-47dc-ae90-059ce3a710e7'::uuid IN (
        SELECT pharmacy_id FROM public.pharmacy_members WHERE user_id = 'a87b5d25-faad-4b87-b4bf-af9cb869d43b'
    ) as result;

SELECT 
    'Is Owner?' as check_type,
    (SELECT owner_id FROM public.pharmacies WHERE id = '140d30de-77ec-47dc-ae90-059ce3a710e7') = 'a87b5d25-faad-4b87-b4bf-af9cb869d43b' as result;
