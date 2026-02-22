-- =============================================================================
-- SOLUÇÃO DEFINITIVA: CONTADOR DE PEDIDOS E BILLING
-- Execute no SQL Editor do Supabase para corrigir o faturamento.
-- =============================================================================

BEGIN;

-- 1. Limpeza de Triggers e Functions Antigas (Evita duplicidade e conflitos)
DROP TRIGGER IF EXISTS trigger_increment_billing_cycle ON public.orders;
DROP TRIGGER IF EXISTS billing_on_order_delivered ON public.orders;
DROP TRIGGER IF EXISTS correct_billing_trigger ON public.orders;

-- 2. Criação da Function com Lógica Robusta
-- Suporta status em pt-BR ('entregue') e en ('delivered')
-- Corrige cálculo de preço (Numeric para Cents)
CREATE OR REPLACE FUNCTION public.update_billing_on_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription RECORD;
  v_cycle RECORD;
  v_plan RECORD;
  v_overage_amount INTEGER := 0;
BEGIN
  -- Aciona apenas quando o status muda para 'delivered' ou 'entregue'
  IF (NEW.status IN ('delivered', 'entregue')) AND (OLD.status IS NULL OR (OLD.status NOT IN ('delivered', 'entregue'))) THEN

    -- A) Localizar assinatura ativa da farmácia
    SELECT * INTO v_subscription
    FROM public.pharmacy_subscriptions
    WHERE pharmacy_id = NEW.pharmacy_id AND status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE NOTICE '[BILLING] Pharmacy % sem assinatura ativa. Ignorando.', NEW.pharmacy_id;
      RETURN NEW;
    END IF;

    -- B) Localizar o plano vinculado à assinatura
    SELECT * INTO v_plan
    FROM public.billing_plans
    WHERE id = v_subscription.plan_id;

    IF NOT FOUND THEN
      RAISE NOTICE '[BILLING] Plano não encontrado para sub %. Ignorando.', v_subscription.id;
      RETURN NEW;
    END IF;

    -- C) Localizar ciclo ativo atual
    SELECT * INTO v_cycle
    FROM public.billing_cycles
    WHERE pharmacy_id = NEW.pharmacy_id AND status = 'active'
    ORDER BY period_start DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE NOTICE '[BILLING] Ciclo ativo não encontrado para pharmacy %. Ignorando.', NEW.pharmacy_id;
      RETURN NEW;
    END IF;

    -- D) REGRA DE NEGÓCIO: Incrementar Contadores
    IF v_cycle.free_orders_used < v_plan.free_orders_per_period THEN
      -- D.1) Dentro da franquia grátis
      UPDATE public.billing_cycles
      SET free_orders_used = free_orders_used + 1,
          updated_at = NOW()
      WHERE id = v_cycle.id;
      
      RAISE NOTICE '[BILLING] Pedido % (Farmacia %) contado como GRÁTIS (%/%)', 
          NEW.id, NEW.pharmacy_id, v_cycle.free_orders_used + 1, v_plan.free_orders_per_period;

    ELSE
      -- D.2) Pedido Excedente (Overage)
      -- Cálculo: Taxa Fixa + (Preço * Percentual / 10000)
      -- Nota: NEW.total_price é Numeric (reais), multiplicamos por 100 para centavos.
      v_overage_amount := v_plan.overage_fixed_fee_cents;
      v_overage_amount := v_overage_amount + ROUND(NEW.total_price * 100.0 * v_plan.overage_percent_bp / 10000.0)::INTEGER;

      UPDATE public.billing_cycles
      SET overage_orders = overage_orders + 1,
          overage_amount_cents = overage_amount_cents + v_overage_amount,
          updated_at = NOW()
      WHERE id = v_cycle.id;
      
      RAISE NOTICE '[BILLING] Pedido % (Farmacia %) contado como EXCEDENTE. Valor: % centavos.', 
          NEW.id, NEW.pharmacy_id, v_overage_amount;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Criar o trigger definitivo
CREATE TRIGGER billing_on_order_delivered
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_billing_on_order_delivered();

COMMIT;

-- Logs de Sucesso
SELECT '✅ SUCESSO' as status, 'Trigger billing_on_order_delivered ativado com suporte a pt-BR e fix de preço.' as mensagem;
