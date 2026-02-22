-- =============================================================================
-- SCRIPT DE LIMPEZA E FIX BILLING DEFINITIVO
-- Foco: Corrigir contagem de pedidos, status de assinatura e ciclos.
-- =============================================================================

BEGIN;

-- 1. LIMPEZA DE TRIGGERS ANTIGOS (Evita contagem múltipla)
DROP TRIGGER IF EXISTS process_order_billing_trigger ON orders;
DROP TRIGGER IF EXISTS order_created_trigger ON orders;
DROP TRIGGER IF EXISTS trigger_increment_billing_cycle ON orders;
DROP TRIGGER IF EXISTS correct_billing_trigger ON orders;
DROP TRIGGER IF EXISTS billing_on_order_delivered ON orders;

-- 2. CORREÇÃO DE STATUS E PLANOS
-- Converter qualquer farmácia com status 'trialing' para 'active' no plano free
DO $$
DECLARE
    v_free_plan_id UUID;
BEGIN
    SELECT id INTO v_free_plan_id FROM public.billing_plans WHERE slug = 'free' LIMIT 1;

    IF v_free_plan_id IS NOT NULL THEN
        -- Corrigir assinaturas 'trialing'
        UPDATE public.pharmacy_subscriptions
        SET status = 'active', 
            plan_id = v_free_plan_id,
            updated_at = NOW()
        WHERE status = 'trialing';

        -- Garantir que farmácias aprovadas tenham assinatura
        INSERT INTO public.pharmacy_subscriptions (pharmacy_id, plan_id, status, started_at)
        SELECT id, v_free_plan_id, 'active', NOW()
        FROM public.pharmacies p
        WHERE p.status = 'approved'
          AND NOT EXISTS (SELECT 1 FROM public.pharmacy_subscriptions ps WHERE ps.pharmacy_id = p.id)
        ON CONFLICT (pharmacy_id) DO NOTHING;
    END IF;
END $$;

-- 3. GARANTIR CICLOS DE FATURAMENTO ATIVOS
-- Cada farmácia ativa PRECISA de um ciclo ativo para contar pedidos
INSERT INTO public.billing_cycles (pharmacy_id, status, period_start, period_end, free_orders_used, overage_orders, overage_amount_cents)
SELECT 
    ps.pharmacy_id, 
    'active', 
    CURRENT_DATE, 
    CURRENT_DATE + INTERVAL '30 days',
    0, 0, 0
FROM public.pharmacy_subscriptions ps
WHERE ps.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM public.billing_cycles bc WHERE bc.pharmacy_id = ps.pharmacy_id AND bc.status = 'active')
ON CONFLICT (pharmacy_id, period_start) DO NOTHING;

-- 4. FUNÇÃO DE CONTAGEM ROBUSTA (AUTO-HEALING)
CREATE OR REPLACE FUNCTION public.update_billing_on_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription RECORD;
  v_cycle RECORD;
  v_overage_amount INTEGER := 0;
BEGIN
  -- Aciona quando o status muda para 'delivered' ou 'entregue'
  IF (NEW.status IN ('delivered', 'entregue')) AND (OLD.status IS NULL OR (OLD.status NOT IN ('delivered', 'entregue'))) THEN

    -- A) Localizar assinatura ativa da farmácia
    SELECT ps.*, bp.slug as plan_slug, bp.free_orders_per_period, bp.overage_percent_bp, bp.overage_fixed_fee_cents 
    INTO v_subscription
    FROM public.pharmacy_subscriptions ps
    JOIN public.billing_plans bp ON bp.id = ps.plan_id
    WHERE ps.pharmacy_id = NEW.pharmacy_id AND ps.status IN ('active', 'pending_asaas')
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    -- B) Localizar ciclo ativo atual
    SELECT * INTO v_cycle
    FROM public.billing_cycles
    WHERE pharmacy_id = NEW.pharmacy_id AND status = 'active'
    ORDER BY period_start DESC
    LIMIT 1;

    -- C) AUTO-HEALING: Se não houver ciclo ativo, cria um agora
    IF NOT FOUND THEN
      INSERT INTO public.billing_cycles (pharmacy_id, status, period_start, period_end, free_orders_used, overage_orders, overage_amount_cents)
      VALUES (NEW.pharmacy_id, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 0, 0, 0)
      ON CONFLICT (pharmacy_id, period_start) 
      DO UPDATE SET status = 'active'
      RETURNING * INTO v_cycle;
    END IF;

    -- D) INCREMENTAR CONTADORES
    IF v_cycle.free_orders_used < v_subscription.free_orders_per_period THEN
      UPDATE public.billing_cycles
      SET free_orders_used = free_orders_used + 1,
          updated_at = NOW()
      WHERE id = v_cycle.id;
    ELSE
      v_overage_amount := COALESCE(v_subscription.overage_fixed_fee_cents, 0);
      v_overage_amount := v_overage_amount + ROUND(COALESCE(NEW.total_price, 0) * 100.0 * COALESCE(v_subscription.overage_percent_bp, 0) / 10000.0)::INTEGER;

      UPDATE public.billing_cycles
      SET overage_orders = overage_orders + 1,
          overage_amount_cents = overage_amount_cents + v_overage_amount,
          updated_at = NOW()
      WHERE id = v_cycle.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REINSTALAR O TRIGGER ÚNICO
CREATE TRIGGER billing_on_order_delivered
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION public.update_billing_on_order_delivered();

COMMIT;

-- VERIFICAÇÃO FINAL
SELECT 'Tudo pronto! Triggers e Ciclos corrigidos.' as status;
