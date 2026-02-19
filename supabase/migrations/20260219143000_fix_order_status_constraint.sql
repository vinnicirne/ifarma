-- ============================================================================
-- FIX: ORDER STATUS CONSTRAINT ALIGNMENT (CLT-03/Merchant Fix)
-- ============================================================================

BEGIN;

-- Drop existing constraint
DO $$
DECLARE
    constraint_name RECORD;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.orders'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || quote_ident(constraint_name.conname);
    END LOOP;
END $$;

-- Add updated, more inclusive status check
-- We add 'pronto_entrega' and 'aceito' to match MerchantOrderManagement.tsx logic
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN (
        'pending', 'confirmed', 'preparing', 'ready', 'assigning', 'transferred_to_motoboy', 'delivering', 'delivered', 'cancelled', 'returned',
        'pendente', 'confirmado', 'preparando', 'pronto', 'atribuindo', 'transferido_para_motoboy', 'em_rota', 'entregue', 'cancelado', 'devolvido',
        'aguardando_motoboy', 'aguardando_retirada', 'retirado', 'pronto_entrega', 'aceito'
    ));

COMMIT;

NOTIFY pgrst, 'reload schema';
