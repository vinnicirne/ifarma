-- ============================================================================
-- SQL: Rolling Billing Cycle Logic
-- Description: Updates the trigger to handle 30-day "rolling" cycles starting
--              on-demand (payment or first order).
-- ============================================================================

-- 1. Redefinir a função do trigger para suportar ciclos rolantes de 30 dias
CREATE OR REPLACE FUNCTION public.increment_billing_cycle_on_order_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cycle_id UUID;
    v_rules RECORD;
    v_overage_value INTEGER;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    -- Só processar se mudou para 'entregue'
    IF (NEW.status IN ('entregue', 'delivered')) AND (OLD.status IS NULL OR OLD.status NOT IN ('entregue', 'delivered')) THEN
        
        -- 1. Buscar ciclo ativo da farmácia
        -- Agora buscamos o ciclo que contém a data atual
        SELECT id INTO v_cycle_id
        FROM billing_cycles
        WHERE pharmacy_id = NEW.pharmacy_id
        AND status = 'active'
        AND period_start <= CURRENT_DATE
        AND period_end >= CURRENT_DATE
        LIMIT 1;

        -- 2. SE NÃO EXISTIR CICLO ATIVO, criar um agora com janela de 30 dias!
        IF v_cycle_id IS NULL THEN
            v_period_start := CURRENT_DATE;
            v_period_end := CURRENT_DATE + INTERVAL '30 days';
            
            -- Upsert para evitar race condition (pharmacy_id, period_start são únicos)
            INSERT INTO billing_cycles (
                pharmacy_id, 
                period_start, 
                period_end, 
                free_orders_used, 
                overage_orders, 
                overage_amount_cents, 
                status
            )
            VALUES (
                NEW.pharmacy_id, 
                v_period_start, 
                v_period_end, 
                0, 0, 0, 'active'
            )
            ON CONFLICT (pharmacy_id, period_start) DO UPDATE 
            SET status = 'active'
            RETURNING id INTO v_cycle_id;
            
            RAISE NOTICE 'Billing: Novo ciclo rolante de 30 dias criado para farmácia % (% a %)', 
                NEW.pharmacy_id, v_period_start, v_period_end;
        END IF;

        -- 3. Buscar regras de cobrança
        SELECT * INTO v_rules FROM get_pharmacy_billing_rules(NEW.pharmacy_id);

        -- 4. Incrementar contador
        -- Verificamos se ainda está na franquia grátis
        IF (SELECT free_orders_used FROM billing_cycles WHERE id = v_cycle_id) < COALESCE(v_rules.free_orders_per_period, 0) THEN
            UPDATE billing_cycles
            SET free_orders_used = free_orders_used + 1, updated_at = NOW()
            WHERE id = v_cycle_id;
        ELSE
            -- Calcular valor do excedente
            v_overage_value := COALESCE(v_rules.overage_fixed_fee_cents, 0);
            IF v_rules.overage_percent_bp > 0 THEN
                v_overage_value := v_overage_value + (NEW.total_price * v_rules.overage_percent_bp / 10000);
            END IF;

            UPDATE billing_cycles
            SET 
                overage_orders = overage_orders + 1,
                overage_amount_cents = overage_amount_cents + v_overage_value,
                updated_at = NOW()
            WHERE id = v_cycle_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2. Garantir que o trigger está aplicado
DROP TRIGGER IF EXISTS trigger_increment_billing_cycle ON public.orders;
CREATE TRIGGER trigger_increment_billing_cycle
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.increment_billing_cycle_on_order_delivered();
