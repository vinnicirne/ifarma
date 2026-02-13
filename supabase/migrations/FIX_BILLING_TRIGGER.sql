-- ============================================================================
-- FIX: Simplificar trigger para funcionar apenas com planos
-- ============================================================================

-- 1. Recriar função get_pharmacy_billing_rules (versão simplificada)
CREATE OR REPLACE FUNCTION get_pharmacy_billing_rules(p_pharmacy_id UUID)
RETURNS TABLE (
    free_orders_per_period INTEGER,
    overage_percent_bp INTEGER,
    overage_fixed_fee_cents INTEGER,
    block_after_free_limit BOOLEAN,
    monthly_fee_cents INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan RECORD;
BEGIN
    -- Buscar plano da farmácia
    SELECT 
        bp.free_orders_per_period,
        bp.overage_percent_bp,
        bp.overage_fixed_fee_cents,
        bp.block_after_free_limit,
        bp.monthly_fee_cents
    INTO v_plan
    FROM pharmacy_subscriptions ps
    JOIN billing_plans bp ON bp.id = ps.plan_id
    WHERE ps.pharmacy_id = p_pharmacy_id
    AND ps.status = 'active'
    LIMIT 1;

    -- Se não encontrou plano, usar configuração global
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            10::INTEGER AS free_orders_per_period,
            500::INTEGER AS overage_percent_bp,
            0::INTEGER AS overage_fixed_fee_cents,
            FALSE AS block_after_free_limit,
            0::INTEGER AS monthly_fee_cents;
    ELSE
        RETURN QUERY
        SELECT 
            v_plan.free_orders_per_period,
            v_plan.overage_percent_bp,
            v_plan.overage_fixed_fee_cents,
            v_plan.block_after_free_limit,
            v_plan.monthly_fee_cents;
    END IF;
END;
$$;

-- 2. Recriar função do trigger (versão simplificada)
CREATE OR REPLACE FUNCTION increment_billing_cycle_on_order_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cycle RECORD;
    v_rules RECORD;
    v_overage_value INTEGER := 0;
BEGIN
    -- Só processar se mudou para 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        
        -- Buscar ciclo ativo da farmácia
        SELECT * INTO v_cycle
        FROM billing_cycles
        WHERE pharmacy_id = NEW.pharmacy_id
        AND status = 'active'
        ORDER BY period_start DESC
        LIMIT 1;

        -- Se não encontrou ciclo ativo, não faz nada
        IF NOT FOUND THEN
            RETURN NEW;
        END IF;

        -- Buscar regras de billing
        SELECT * INTO v_rules FROM get_pharmacy_billing_rules(NEW.pharmacy_id);

        -- Incrementar contador
        IF v_cycle.free_orders_used < v_rules.free_orders_per_period THEN
            -- Ainda dentro do limite grátis
            UPDATE billing_cycles
            SET free_orders_used = free_orders_used + 1,
                updated_at = NOW()
            WHERE id = v_cycle.id;
        ELSE
            -- Excedeu o limite: calcular overage
            v_overage_value := v_rules.overage_fixed_fee_cents;
            
            -- Adicionar percentual sobre o valor do pedido
            IF v_rules.overage_percent_bp > 0 THEN
                v_overage_value := v_overage_value + (NEW.total_price * v_rules.overage_percent_bp / 10000);
            END IF;

            -- Atualizar ciclo com overage
            UPDATE billing_cycles
            SET overage_orders = overage_orders + 1,
                overage_amount_cents = overage_amount_cents + v_overage_value,
                updated_at = NOW()
            WHERE id = v_cycle.id;
        END IF;

    END IF;

    RETURN NEW;
END;
$$;

-- 3. Recriar trigger
DROP TRIGGER IF EXISTS trigger_increment_billing_cycle ON orders;
CREATE TRIGGER trigger_increment_billing_cycle
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_billing_cycle_on_order_delivered();

-- 4. Verificar
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'trigger_increment_billing_cycle';
