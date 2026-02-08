-- update_order_status_check.sql

-- 1. Drop the old check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Add the new check constraint with expanded statuses
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pendente',              -- New order
    'preparando',            -- Merchant accepted/preparing
    'pronto_entrega',        -- Ready for pickup (new)
    'aguardando_retirada',   -- Ready for pickup (alias)
    'aguardando_motoboy',    -- Waiting for driver assignment (Uber mode)
    'em_rota',               -- On the way
    'retirado',              -- Picked up by driver
    'entregue',              -- Delivered
    'cancelado'              -- Cancelled
));

-- 3. Update RLS for Motoboys (Crucial for "Available Orders")
DROP POLICY IF EXISTS "Motoboys podem ver pedidos atribuídos e disponíveis" ON orders;
CREATE POLICY "Motoboys podem ver pedidos atribuídos e disponíveis" ON orders
    FOR SELECT USING (
        motoboy_id = auth.uid() OR                           -- Assigned to me
        status = 'aguardando_motoboy' OR                     -- Open for grab
        (motoboy_id IS NULL AND status IN ('pronto_entrega', 'aguardando_retirada')) -- Ready but unassigned?
    );

-- 4. Create/Replace the assign RPC (since we couldn't find it)
CREATE OR REPLACE FUNCTION assign_order_to_motoboy(p_order_id UUID, p_motoboy_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order orders%ROWTYPE;
BEGIN
    -- Update the order
    UPDATE orders
    SET 
        motoboy_id = p_motoboy_id,
        status = 'aguardando_retirada', -- Default to Ready for Pickup when assigned manually
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
