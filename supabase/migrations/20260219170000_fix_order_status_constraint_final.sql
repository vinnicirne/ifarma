-- ============================================================================
-- FIX: orders_status_check constraint missing 'pronto_entrega' and 'aceito'
-- Root Cause: Frontend sends 'pronto_entrega' and 'aceito' but constraint only has 'pronto'
-- ============================================================================

BEGIN;

-- Drop the existing constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Recreate with all statuses used by the frontend
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN (
        -- English
        'pending', 'confirmed', 'preparing', 'ready', 'assigning', 'transferred_to_motoboy', 'delivering', 'delivered', 'cancelled', 'returned',
        -- Portuguese (used by frontend)
        'pendente', 'confirmado', 'preparando',
        'aceito',              -- ← MISSING: used by merchant when accepting
        'pronto_entrega',      -- ← MISSING: used after preparing, before dispatch
        'pronto',              -- legacy
        'atribuindo', 'transferido_para_motoboy',
        'aguardando_motoboy',  -- waiting for driver assignment
        'aguardando_retirada', -- driver assigned, waiting for pickup
        'retirado',            -- driver picked up order
        'em_rota',             -- en route to customer
        'entregue',            -- delivered
        'cancelado',           -- cancelled
        'devolvido'            -- returned
    ));

NOTIFY pgrst, 'reload schema';

COMMIT;
