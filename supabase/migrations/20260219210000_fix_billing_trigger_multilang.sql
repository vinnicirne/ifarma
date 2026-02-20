-- ============================================================================
-- FIX: Suporte a status em Português no billing trigger
-- Motivo: O sistema usa 'entregue' (pt-BR) mas o trigger só olhava 'delivered' (en)
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_billing_cycle_on_order_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cycle RECORD;
    v_rules RECORD;
    v_overage_value INTEGER := 0;
BEGIN
    -- Só processar se mudou para 'delivered' OU 'entregue'
    IF (NEW.status IN ('delivered', 'entregue')) AND (OLD.status IS NULL OR (OLD.status NOT IN ('delivered', 'entregue'))) THEN
        
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
                -- total_price é assumed em centavos ou valor real? 
                -- NEW.total_price * v_rules.overage_percent_bp / 10000 assume base points (10000 = 100%)
                v_overage_value := v_overage_value + ROUND(NEW.total_price * v_rules.overage_percent_bp / 10000.0)::INTEGER;
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

COMMIT;

NOTIFY pgrst, 'reload schema';
