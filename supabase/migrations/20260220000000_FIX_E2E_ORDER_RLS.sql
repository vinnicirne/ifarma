-- ============================================================================
-- FINAL FIX: ORDER RLS FOR MERCHANTS AND MOTOBOYS
-- Ensures they can see orders belonging to their pharmacy
-- ============================================================================

BEGIN;

-- 1. DROP ALL POTENTIAL CONFLICTING POLICIES ON ORDERS
DROP POLICY IF EXISTS "Pharmacy access to orders" ON orders;
DROP POLICY IF EXISTS "Farmácias podem ver pedidos da sua loja" ON orders;
DROP POLICY IF EXISTS "Staff can view their pharmacy orders" ON orders;
DROP POLICY IF EXISTS "Merchants can view their orders" ON orders;
DROP POLICY IF EXISTS "Motoboy can see orders from his pharmacy" ON orders;

-- 2. CREATE A CLEAN, ROBUST SELECT POLICY FOR MERCHANTS & STAFF
CREATE POLICY "Pharmacy staff can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
    -- Either owner of the pharmacy
    EXISTS (
        SELECT 1 FROM pharmacies 
        WHERE pharmacies.id = orders.pharmacy_id 
        AND pharmacies.owner_id = auth.uid()
    )
    OR
    -- Or has the pharmacy_id in their profile (Managers, Staff, Motoboys)
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.pharmacy_id = orders.pharmacy_id
    )
    OR
    -- Or is the customer of the order
    customer_id = auth.uid()
);

-- 3. ENSURE UPDATE POLICY ALSO WORKS FOR MERCHANTS
DROP POLICY IF EXISTS "Pharmacy update to orders" ON orders;
DROP POLICY IF EXISTS "Pharmacy staff can update orders" ON orders;

CREATE POLICY "Pharmacy staff can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM pharmacies 
        WHERE pharmacies.id = orders.pharmacy_id 
        AND pharmacies.owner_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.pharmacy_id = orders.pharmacy_id
    )
);

-- 4. ENSURE PROFILES ARE VISIBLE (Basic metadata for search/display)
-- Merchants need to see customers
DROP POLICY IF EXISTS "Profiles are public" ON profiles;
DROP POLICY IF EXISTS "Everyone can select profiles" ON profiles;
CREATE POLICY "Authenticated users can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

COMMIT;

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';
