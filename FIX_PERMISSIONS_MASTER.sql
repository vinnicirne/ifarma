-- ============================================================================
-- FIX PERMISSIONS MASTER SCRIPT
-- Resets and enforces correct RLS policies for Profiles, Pharmacies, Products, and Orders
-- ============================================================================

BEGIN;

-- 1. Helper Functions (Role System)
-- ============================================================================

-- Check if user is a Global Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Check if user is Staff (Admin or assigned Staff role)
-- Note: 'staff' in profiles context usually means internal platform staff/support
CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'support', 'operator', 'specialist')
  );
$$;

-- Check if user is a member of a specific pharmacy
CREATE OR REPLACE FUNCTION public.is_pharmacy_member(pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_members 
    WHERE pharmacy_id = $1 
    AND user_id = auth.uid()
  );
$$;

-- 2. Profiles (Users)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can update all profiles" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Allow admins/internal staff to view anyone
CREATE POLICY "Staff can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (public.is_internal_staff());

-- Allow admins/internal staff to update anyone
CREATE POLICY "Staff can update all profiles" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (public.is_internal_staff());


-- 3. Pharmacies
-- ============================================================================
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view approved pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Owners view own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Owners update own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Staff view all pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Staff update all pharmacies" ON public.pharmacies;

-- Public: View approved pharmacies (Active/Approved)
CREATE POLICY "Public view approved pharmacies" 
ON public.pharmacies FOR SELECT 
TO anon, authenticated 
USING (status ILIKE '%prov%' OR status ILIKE '%active%');

-- Owners/Members: View their own pharmacy
CREATE POLICY "Owners view own pharmacy" 
ON public.pharmacies FOR SELECT 
TO authenticated 
USING (
  owner_id = auth.uid() 
  OR public.is_pharmacy_member(id)
);

-- Owners: Update their own pharmacy
CREATE POLICY "Owners update own pharmacy" 
ON public.pharmacies FOR UPDATE 
TO authenticated 
USING (owner_id = auth.uid());

-- Internal Staff: View all
CREATE POLICY "Staff view all pharmacies" 
ON public.pharmacies FOR SELECT 
TO authenticated 
USING (public.is_internal_staff());

-- Internal Staff: Update all
CREATE POLICY "Staff update all pharmacies" 
ON public.pharmacies FOR UPDATE 
TO authenticated 
USING (public.is_internal_staff());


-- 4. Products
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view active products" ON public.products;
DROP POLICY IF EXISTS "Pharmacy manage own products" ON public.products;
DROP POLICY IF EXISTS "Staff manage all products" ON public.products;

-- Public: View active products
CREATE POLICY "Public view active products" 
ON public.products FOR SELECT 
TO anon, authenticated 
USING (is_active = true);

-- Pharmacy: Manage their own products
CREATE POLICY "Pharmacy manage own products" 
ON public.products FOR ALL 
TO authenticated 
USING (
  pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_members WHERE user_id = auth.uid()
  )
  OR 
  (SELECT owner_id FROM public.pharmacies WHERE id = products.pharmacy_id) = auth.uid()
);

-- Staff: Manage all products
CREATE POLICY "Staff manage all products" 
ON public.products FOR ALL 
TO authenticated 
USING (public.is_internal_staff());


-- 5. Orders
-- ============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer view own orders" ON public.orders;
DROP POLICY IF EXISTS "Customer create orders" ON public.orders;
DROP POLICY IF EXISTS "Pharmacy view own orders" ON public.orders;
DROP POLICY IF EXISTS "Pharmacy update own orders" ON public.orders;
DROP POLICY IF EXISTS "Staff manage all orders" ON public.orders;

-- Customer: View own orders
CREATE POLICY "Customer view own orders" 
ON public.orders FOR SELECT 
TO authenticated 
USING (customer_id = auth.uid());

-- Customer: Create orders
CREATE POLICY "Customer create orders" 
ON public.orders FOR INSERT 
TO authenticated 
WITH CHECK (customer_id = auth.uid());

-- Pharmacy: View incoming orders
CREATE POLICY "Pharmacy view own orders" 
ON public.orders FOR SELECT 
TO authenticated 
USING (
  pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_members WHERE user_id = auth.uid()
  )
  OR 
  (SELECT owner_id FROM public.pharmacies WHERE id = orders.pharmacy_id) = auth.uid()
);

-- Pharmacy: Update their orders (e.g. status)
CREATE POLICY "Pharmacy update own orders" 
ON public.orders FOR UPDATE 
TO authenticated 
USING (
  pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_members WHERE user_id = auth.uid()
  )
  OR 
  (SELECT owner_id FROM public.pharmacies WHERE id = orders.pharmacy_id) = auth.uid()
);

-- Staff: Manage all orders
CREATE POLICY "Staff manage all orders" 
ON public.orders FOR ALL 
TO authenticated 
USING (public.is_internal_staff());


-- 6. Grant Usage on Public Schema (Just in case)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

COMMIT;

SELECT 'Permissions fixed successfully' as result;
