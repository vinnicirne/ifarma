-- ============================================================================
-- FIX: Merchant/Manager cannot delete (deactivate) team members
-- Root Cause: Only "User update own profile" (auth.uid() = id) and
--             "Staff update any profile" (is_staff()) exist.
--             Merchants are NOT returned as "staff" by is_staff(), so they
--             cannot update other profiles even from their own pharmacy.
-- Solution: Add RLS policy allowing merchant/manager to update profiles
--           of members from the same pharmacy.
-- ============================================================================

-- Allow merchant or manager to update profiles in the same pharmacy
DROP POLICY IF EXISTS "Merchant update pharmacy team profiles" ON public.profiles;
CREATE POLICY "Merchant update pharmacy team profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        -- The profile belongs to the caller's pharmacy
        pharmacy_id IN (
            SELECT pharmacy_id FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('merchant', 'manager', 'admin')
        )
        -- Cannot update yourself (covered by "User update own profile")
        AND id != auth.uid()
    )
    WITH CHECK (
        pharmacy_id IN (
            SELECT pharmacy_id FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('merchant', 'manager', 'admin')
        )
        AND id != auth.uid()
    );

-- Also allow reading all profiles from own pharmacy (needed to list the team)
DROP POLICY IF EXISTS "Merchant view pharmacy team profiles" ON public.profiles;
CREATE POLICY "Merchant view pharmacy team profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        pharmacy_id IN (
            SELECT pharmacy_id FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('merchant', 'manager', 'admin')
        )
    );

NOTIFY pgrst, 'reload schema';
