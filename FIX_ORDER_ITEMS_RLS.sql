-- FIX_ORDER_ITEMS_RLS.sql
-- Fix RLS: Enable customers to insert order items and view them.
-- Also allows pharmacies/admin to view items.

BEGIN;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 1. DROP old policies
DROP POLICY IF EXISTS "Lojistas podem ver itens" ON public.order_items;
DROP POLICY IF EXISTS "Participantes podem ver itens do pedido" ON public.order_items;
DROP POLICY IF EXISTS "Customer insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Customer view order items" ON public.order_items;
DROP POLICY IF EXISTS "Pharmacy view order items" ON public.order_items;
DROP POLICY IF EXISTS "Admin view order items" ON public.order_items;

-- 2. CREATE NEW POLICIES

-- CUSTOMER: Create Items (INSERT)
-- Allowed if the parent Order belongs to them.
CREATE POLICY "Customer insert order items" ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE public.orders.id = order_items.order_id
        AND public.orders.customer_id = auth.uid()
    )
);

-- CUSTOMER: View Items (SELECT)
-- Allowed if the parent Order belongs to them.
CREATE POLICY "Customer view order items" ON public.order_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE public.orders.id = order_items.order_id
        AND public.orders.customer_id = auth.uid()
    )
);

-- PHARMACY: View Items (SELECT)
-- Allowed if the user is Owner/Member of the Pharmacy related to the Order.
-- Uses my `check_pharmacy_permission` function for robust check.
CREATE POLICY "Pharmacy view order items" ON public.order_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE public.orders.id = order_items.order_id
        AND public.check_pharmacy_permission(public.orders.pharmacy_id)
    )
);

-- ADMIN: View Items (SELECT)
-- Allowed for internal staff (Support/Admin).
CREATE POLICY "Admin view order items" ON public.order_items
FOR SELECT
TO authenticated
USING (public.is_internal_staff());

COMMIT;

SELECT 'Order Items RLS (Insert/Select) fixed.' as result;
