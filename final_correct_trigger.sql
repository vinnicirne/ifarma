-- TRIGGER CORRETO E SIMPLES
-- Execute no Supabase Dashboard > SQL Editor (APÓS a limpeza)

-- Criar function com lógica 100% correta
CREATE OR REPLACE FUNCTION correct_billing_function()
RETURNS TRIGGER AS $$
DECLARE
  free_limit INTEGER;
  current_free INTEGER;
  current_overage INTEGER;
BEGIN
  -- Buscar limite grátis do plano
  SELECT COALESCE(bp.free_orders_per_period, 0) INTO free_limit
  FROM billing_plans bp
  JOIN pharmacy_subscriptions ps ON bp.id = ps.plan_id
  WHERE ps.pharmacy_id = NEW.pharmacy_id AND ps.status = 'active';
  
  -- Se não encontrou plano, não faz nada
  IF free_limit IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar contadores atuais
  SELECT COALESCE(free_orders_used, 0), COALESCE(overage_orders, 0) 
  INTO current_free, current_overage
  FROM billing_cycles 
  WHERE pharmacy_id = NEW.pharmacy_id 
    AND period_start = CURRENT_DATE 
    AND status = 'active'
  FOR UPDATE;
  
  -- Se não encontrou ciclo, não faz nada
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Decidir se conta como grátis ou excedente
  IF current_free < free_limit THEN
    -- Ainda tem franquia grátis
    UPDATE billing_cycles 
    SET free_orders_used = current_free + 1
    WHERE pharmacy_id = NEW.pharmacy_id 
      AND period_start = CURRENT_DATE 
      AND status = 'active';
      
    RAISE LOG '[BILLING] Pedido % contado como GRATIS (%/%)', NEW.id, current_free + 1, free_limit;
    
  ELSE
    -- Franquia esgotada
    UPDATE billing_cycles 
    SET overage_orders = current_overage + 1
    WHERE pharmacy_id = NEW.pharmacy_id 
      AND period_start = CURRENT_DATE 
      AND status = 'active';
      
    RAISE LOG '[BILLING] Pedido % contado como EXCEDENTE (% total)', NEW.id, current_overage + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER correct_billing_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION correct_billing_function();

-- Verificar criação
SELECT 
  'TRIGGER CORRETO CRIADO' as status,
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'correct_billing_trigger';
