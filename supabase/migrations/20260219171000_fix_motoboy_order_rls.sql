-- ============================================================================
-- FIX: Motoboy cannot update order status (RLS missing UPDATE policy)
-- Root Cause: RLS has SELECT for motoboy but NO UPDATE policy.
--             Supabase RLS blocks silently: error=null but 0 rows affected.
-- ============================================================================

BEGIN;

-- 1. Add UPDATE policy for motoboy on orders
-- Motoboy can only update orders assigned to them (via motoboy_id column)
DROP POLICY IF EXISTS "Motoboy update own assigned orders" ON public.orders;
CREATE POLICY "Motoboy update own assigned orders"
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (motoboy_id = auth.uid())
    WITH CHECK (motoboy_id = auth.uid());

-- 2. Also allow motoboy to accept a order from the queue
-- When accepting: motoboy_id may still be NULL (not yet assigned to them)
-- The assign_order_to_motoboy RPC handles this atomically and uses SECURITY DEFINER
-- But the direct update in MotoboyDashboard.tsx needs this policy:
DROP POLICY IF EXISTS "Motoboy can accept pending orders" ON public.orders;
CREATE POLICY "Motoboy can accept pending orders"
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (
        -- Either already assigned to this motoboy
        motoboy_id = auth.uid()
        OR
        -- Or the order is in the queue (assigned to this motoboy's pharmacy)
        pharmacy_id IN (
            SELECT pharmacy_id FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'motoboy'
        )
    )
    WITH CHECK (
        motoboy_id = auth.uid()
        OR
        pharmacy_id IN (
            SELECT pharmacy_id FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'motoboy'
        )
    );

-- 3. Also add 'aceito' to the status constraint (it may not be there yet if other migration wasn't applied)
-- We already created 20260219170000 for this, but add as safety here
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN (
        'pending', 'confirmed', 'preparing', 'ready', 'assigning', 'transferred_to_motoboy', 'delivering', 'delivered', 'cancelled', 'returned',
        'pendente', 'confirmado', 'preparando',
        'aceito',
        'pronto_entrega',
        'pronto',
        'atribuindo', 'transferido_para_motoboy',
        'aguardando_motoboy',
        'aguardando_retirada',
        'retirado',
        'em_rota',
        'entregue',
        'cancelado',
        'devolvido'
    ));

NOTIFY pgrst, 'reload schema';

COMMIT;
