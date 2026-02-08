-- fix_motoboy_delivery.sql

-- 1. Drop existing check constraints on order status (try common names)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check1;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_check;

-- 2. SANITIZE DATA: Delete orders with invalid status (as requested)
DELETE FROM orders
WHERE status NOT IN (
    'pendente', 'aceito', 'preparando', 'pronto_entrega', 'aguardando_retirada', 
    'aguardando_motoboy', 'em_rota', 'retirado', 'entregue', 'cancelado', 'recusado'
);

-- 3. Add new comprehensive status check
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pendente',              -- New, unassigned
    'aceito',               -- Accepted by motoboy
    'preparando',            -- Merchant preparing
    'pronto_entrega',        -- Ready for pickup (legacy)
    'aguardando_retirada',   -- Ready for pickup (preferred)
    'aguardando_motoboy',    -- Waiting for driver assignment (future use)
    'em_rota',               -- On the way
    'retirado',              -- Picked up
    'entregue',              -- Delivered
    'cancelado',             -- Cancelled
    'recusado'               -- Rejected
));

-- 4. Update RLS policies to allow Motoboys to see their assignments
DROP POLICY IF EXISTS "Motoboys podem ver pedidos atribuídos" ON orders;
CREATE POLICY "Motoboys podem ver pedidos atribuídos" ON orders
    FOR SELECT USING (
        motoboy_id = auth.uid() 
        OR 
        (status = 'aguardando_motoboy' AND motoboy_id IS NULL)
    );

-- 5. Create or Replace the assignment function (used by Merchant App)
-- DROP FIRST to avoid return type conflict
DROP FUNCTION IF EXISTS assign_order_to_motoboy(uuid, uuid);

CREATE OR REPLACE FUNCTION assign_order_to_motoboy(p_order_id UUID, p_motoboy_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order orders%ROWTYPE;
BEGIN
    UPDATE orders
    SET 
        motoboy_id = p_motoboy_id,
        status = 'aguardando_retirada', -- Move to explicit 'ready' state so motoboy sees it
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    IF FOUND THEN
        RETURN to_jsonb(v_order);
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
