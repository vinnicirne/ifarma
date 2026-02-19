-- ============================================================================
-- MASTER ORDERS & CHAT RLS FIX
-- Ensuring Pharmacy Staff can access Orders and Chat
-- ============================================================================

BEGIN;

-- 1. FIX ORDERS POLICIES (Allow Staff Access)
DROP POLICY IF EXISTS "Farmácias podem ver pedidos da sua loja" ON orders;
CREATE POLICY "Pharmacy access to orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  pharmacy_id IN (
    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
  ) OR
  pharmacy_id IN (
    SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Farmácias podem atualizar pedidos da sua loja" ON orders;
CREATE POLICY "Pharmacy update to orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  pharmacy_id IN (
    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
  ) OR
  pharmacy_id IN (
    SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
  )
);

-- 2. FIX PHARMACIES POLICIES (Allow Staff Access)
DROP POLICY IF EXISTS "Lojistas podem atualizar sua farmácia" ON pharmacies;
CREATE POLICY "Pharmacy staff update"
ON public.pharmacies
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid() OR
  id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid())
);

COMMIT;
