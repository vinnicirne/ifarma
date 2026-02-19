-- Fix: Recriar trigger do contador de pedidos para funcionar corretamente
-- Problema: trigger não estava incrementando free_orders_used
-- Solução: recriar função e trigger com lógica simplificada

-- 1. Remover trigger antigo
DROP TRIGGER IF EXISTS trigger_increment_billing_cycle ON public.orders;

-- 2. Recriar função do trigger (versão corrigida)
CREATE OR REPLACE FUNCTION public.increment_billing_cycle_on_order_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cycle_id UUID;
    v_rules RECORD;
BEGIN
    -- Só processar se mudou para 'entregue'
    IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status != 'entregue') THEN
        
        -- Buscar ciclo ativo da farmácia
        SELECT id INTO v_cycle_id
        FROM billing_cycles
        WHERE pharmacy_id = NEW.pharmacy_id
        AND status = 'active'
        ORDER BY period_start DESC
        LIMIT 1;

        -- Se encontrou ciclo, incrementar contador
        IF v_cycle_id IS NOT NULL THEN
            UPDATE billing_cycles
            SET 
                free_orders_used = free_orders_used + 1,
                updated_at = NOW()
            WHERE id = v_cycle_id;
            
            -- Log para debug
            RAISE LOG 'Billing: incremented free_orders_used for cycle % to %', 
                v_cycle_id, 
                (SELECT free_orders_used FROM billing_cycles WHERE id = v_cycle_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Recriar trigger
CREATE TRIGGER trigger_increment_billing_cycle
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.increment_billing_cycle_on_order_delivered();

-- 4. Verificar se trigger foi criado
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name
FROM pg_trigger 
WHERE tgrelid = 'public.orders'::regclass
AND tgfoid::regproc = 'increment_billing_cycle_on_order_delivered'::regproc;
