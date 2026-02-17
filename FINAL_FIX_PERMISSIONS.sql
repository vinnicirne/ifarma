-- ============================================================================
-- FINAL FIX PERMISSIONS (CLEANUP & APPLY)
-- Execute this script in Supabase SQL Editor to fix all permission issues.
-- ============================================================================

BEGIN;

-- 1. CLEANUP: Drop all existing/conflicting policies found
-- ============================================================================

-- Products Cleanup
DROP POLICY IF EXISTS "Admin full access products" ON public.products;
DROP POLICY IF EXISTS "Customers view products from approved pharmacies" ON public.products;
DROP POLICY IF EXISTS "Merchant manage own pharmacy products" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "products_all_admin_or_owner" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_owner_manage" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_select_public_active" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;

-- Profiles Cleanup
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

-- Pharmacies Cleanup
DROP POLICY IF EXISTS "Todos podem ver farmácias aprovadas" ON public.pharmacies;
DROP POLICY IF EXISTS "pharmacies_admin_all" ON public.pharmacies;
DROP POLICY IF EXISTS "pharmacies_owner_update" ON public.pharmacies;
DROP POLICY IF EXISTS "pharmacies_public_read" ON public.pharmacies;
DROP POLICY IF EXISTS "pharmacies_select" ON public.pharmacies;
DROP POLICY IF EXISTS "pharmacies_select_admin_or_owner_or_approved" ON public.pharmacies;
DROP POLICY IF EXISTS "pharmacies_update" ON public.pharmacies;
DROP POLICY IF EXISTS "pharmacies_update_admin_or_owner" ON public.pharmacies;

-- Orders Cleanup
DROP POLICY IF EXISTS "Admins podem ver todos os pedidos" ON public.orders;
DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Clientes podem ver seus próprios pedidos" ON public.orders;
DROP POLICY IF EXISTS "Farmácias podem atualizar pedidos da sua loja" ON public.orders;
DROP POLICY IF EXISTS "Farmácias podem ver pedidos da sua loja" ON public.orders;
DROP POLICY IF EXISTS "Motoboys podem ver pedidos atribuídos" ON public.orders;

-- 2. APPLY: Enforce Correct Policies
-- ============================================================================

-- Helper Functions (Idempotent)
CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'support', 'operator', 'specialist'));
$$;

CREATE OR REPLACE FUNCTION public.is_pharmacy_member(pharmacy_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.pharmacy_members WHERE pharmacy_id = $1 AND user_id = auth.uid());
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_internal_staff());
CREATE POLICY "Staff can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_internal_staff());

-- Pharmacies Policies
CREATE POLICY "Public view approved pharmacies" ON public.pharmacies FOR SELECT TO anon, authenticated USING (status ILIKE '%prov%' OR status ILIKE '%active%');
CREATE POLICY "Owners view own pharmacy" ON public.pharmacies FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_pharmacy_member(id));
CREATE POLICY "Owners update own pharmacy" ON public.pharmacies FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Staff view all pharmacies" ON public.pharmacies FOR SELECT TO authenticated USING (public.is_internal_staff());
CREATE POLICY "Staff update all pharmacies" ON public.pharmacies FOR UPDATE TO authenticated USING (public.is_internal_staff());

-- Products Policies
CREATE POLICY "Public view active products" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Pharmacy manage own products" ON public.products FOR ALL TO authenticated USING (
  pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_members WHERE user_id = auth.uid()) OR 
  (SELECT owner_id FROM public.pharmacies WHERE id = products.pharmacy_id) = auth.uid()
);
CREATE POLICY "Staff manage all products" ON public.products FOR ALL TO authenticated USING (public.is_internal_staff());

-- Orders Policies
CREATE POLICY "Customer view own orders" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Customer create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Pharmacy view own orders" ON public.orders FOR SELECT TO authenticated USING (
  pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_members WHERE user_id = auth.uid()) OR 
  (SELECT owner_id FROM public.pharmacies WHERE id = orders.pharmacy_id) = auth.uid()
);
CREATE POLICY "Pharmacy update own orders" ON public.orders FOR UPDATE TO authenticated USING (
  pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_members WHERE user_id = auth.uid()) OR 
  (SELECT owner_id FROM public.pharmacies WHERE id = orders.pharmacy_id) = auth.uid()
);
CREATE POLICY "Staff manage all orders" ON public.orders FOR ALL TO authenticated USING (public.is_internal_staff());

COMMIT;

SELECT 'All permissions cleaned and fixed successfully' as result;
