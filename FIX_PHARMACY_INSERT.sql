-- FIX_PHARMACY_INSERT.sql
-- Allow pharmacy creation by Admins (Staff) AND new Merchants.

BEGIN;

-- 1. Enable RLS (Ensure it's ON)
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing INSERT policies (if any)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.pharmacies;
DROP POLICY IF EXISTS "Staff insert pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Authenticated insert pharmacies" ON public.pharmacies;

-- 3. Create INSERT Policy
-- Allows Authenticated users to create a pharmacy if they set themselves as owner.
-- Allows Staff/Admins to create pharmacies for anyone.
CREATE POLICY "Enable insert for authenticated users" ON public.pharmacies
FOR INSERT
TO authenticated
WITH CHECK (
    -- Merchant creating their own shop
    (owner_id = auth.uid())
    OR
    -- Admin/Support creating shop for someone else
    public.is_internal_staff()
);

COMMIT;

SELECT 'Pharmacy creation (INSERT) enabled.' as result;
