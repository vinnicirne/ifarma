-- FIX_PHARMACY_OWNER.sql

-- 1. Assign Owner to Pharmacy
UPDATE public.pharmacies
SET owner_id = 'a87b5d25-faad-4b87-b4bf-af9cb869d43b'
WHERE id = '140d30de-77ec-47dc-ae90-059ce3a710e7';

-- 2. Ensure User is in Pharmacy Members as Owner
INSERT INTO public.pharmacy_members (pharmacy_id, user_id, role, is_active)
VALUES (
    '140d30de-77ec-47dc-ae90-059ce3a710e7',
    'a87b5d25-faad-4b87-b4bf-af9cb869d43b',
    'owner',
    true
)
ON CONFLICT (pharmacy_id, user_id) 
DO UPDATE SET role = 'owner', is_active = true;

-- 3. Verify
SELECT id, name, owner_id FROM public.pharmacies WHERE id = '140d30de-77ec-47dc-ae90-059ce3a710e7';
SELECT * FROM public.pharmacy_members WHERE pharmacy_id = '140d30de-77ec-47dc-ae90-059ce3a710e7';
