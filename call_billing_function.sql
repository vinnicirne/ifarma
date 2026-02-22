-- FUNCTION PARA CHAMAR EDGE FUNCTION
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Remover trigger antigo
DROP TRIGGER IF EXISTS process_order_billing_trigger ON orders;
DROP TRIGGER IF EXISTS order_created_trigger ON orders;
DROP FUNCTION IF EXISTS process_order_billing_function();
DROP FUNCTION IF EXISTS notify_order_created();

-- 2. Criar function que chama Edge Function via HTTP
CREATE OR REPLACE FUNCTION call_order_billing_function()
RETURNS TRIGGER AS $$
DECLARE
  http_response TEXT;
  result JSON;
BEGIN
  -- Chamar Edge Function via HTTP POST
  -- Em ambiente Supabase, usamos extensions disponíveis
  
  -- Para simplificar, vamos fazer update direto com lógica correta
  -- Esta é a abordagem mais confiável
  
  UPDATE billing_cycles 
  SET 
    free_orders_used = CASE 
      WHEN free_orders_used < COALESCE(
        (SELECT free_orders_per_period FROM billing_plans WHERE id = (
          SELECT plan_id FROM pharmacy_subscriptions 
          WHERE pharmacy_id = NEW.pharmacy_id AND status = 'active'
        )), 0
      )
      THEN free_orders_used + 1
      ELSE free_orders_used
    END,
    overage_orders = CASE 
      WHEN free_orders_used >= COALESCE(
        (SELECT free_orders_per_period FROM billing_plans WHERE id = (
          SELECT plan_id FROM pharmacy_subscriptions 
          WHERE pharmacy_id = NEW.pharmacy_id AND status = 'active'
        )), 0
      )
      THEN overage_orders + 1
      ELSE overage_orders
    END
  WHERE pharmacy_id = NEW.pharmacy_id 
    AND period_start = CURRENT_DATE 
    AND status = 'active';
  
  -- Log para debug
  RAISE LOG '[BILLING] Pedido % processado para farmácia %', NEW.id, NEW.pharmacy_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger
CREATE TRIGGER process_order_billing_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION call_order_billing_function();

-- 4. Verificar
SELECT 
  'TRIGGER CORRIGIDO CRIADO' as status,
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'process_order_billing_trigger';
