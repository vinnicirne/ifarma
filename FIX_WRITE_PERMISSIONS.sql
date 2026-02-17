-- FIX_WRITE_PERMISSIONS.sql (Corrected)
-- Unified Permission Fix for Products and Pharmacies
-- Uses a SECURITY DEFINER function to reliably check permissions without RLS recursion.
-- Added DROP POLICY checks for existing policies to prevent errors.

BEGIN;

-- 1. Create Helper Function (Security Definer to bypass table locks)
CREATE OR REPLACE FUNCTION public.check_pharmacy_permission(target_pharmacy_id uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    -- Check if user is a member (Staff/Manager)
    IF EXISTS (
        SELECT 1 FROM public.pharmacy_members 
        WHERE pharmacy_id = target_pharmacy_id 
        AND user_id = auth.uid()
    ) THEN
        RETURN true;
    END IF;

    -- Check if user is the Owner
    IF EXISTS (
        SELECT 1 FROM public.pharmacies 
        WHERE id = target_pharmacy_id 
        AND owner_id = auth.uid()
    ) THEN
        RETURN true;
    END IF;

    -- Check if user is Admin (Internal Staff)
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'support', 'specialist')
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- 2. Fix PRODUCTS Policies (Insert/Update/Delete)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop old/conflicting policies
DROP POLICY IF EXISTS "Pharmacy manage own products" ON public.products;
DROP POLICY IF EXISTS "Staff manage all products" ON public.products;
-- Drop the policy we are about to create if it exists (Fix for previous error)
DROP POLICY IF EXISTS "Manage products" ON public.products;
DROP POLICY IF EXISTS "Admin manage products" ON public.products;


-- Single Unified Policy for Management
CREATE POLICY "Manage products" ON public.products
FOR ALL 
TO authenticated
USING (check_pharmacy_permission(pharmacy_id))
WITH CHECK (check_pharmacy_permission(pharmacy_id));

-- Ensure Internal Staff can also manage
CREATE POLICY "Admin manage products" ON public.products
FOR ALL
TO authenticated
USING (public.is_internal_staff());


-- 3. Fix PHARMACIES Policies (Update Store Info)
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners update own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Staff update all pharmacies" ON public.pharmacies;
-- Drop the policy we are about to create if it exists
DROP POLICY IF EXISTS "Manage pharmacy details" ON public.pharmacies;

-- Allow Owners AND Members to update the pharmacy details
CREATE POLICY "Manage pharmacy details" ON public.pharmacies
FOR UPDATE
TO authenticated
USING (check_pharmacy_permission(id))
WITH CHECK (check_pharmacy_permission(id));

-- 4. Fix PHARMACY_MEMBERS Policies (View/Manage Team)
-- Allow members to see their co-workers (needed for some UI checks)
DROP POLICY IF EXISTS "View members" ON public.pharmacy_members;
DROP POLICY IF EXISTS "View team members" ON public.pharmacy_members;

CREATE POLICY "View team members" ON public.pharmacy_members
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() -- Can see self
    OR 
    check_pharmacy_permission(pharmacy_id) -- Can see others in same pharmacy
);

COMMIT;

SELECT 'Write permissions fixed for Products, Pharmacies, and Members globally.' as result;
