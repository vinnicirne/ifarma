-- ATUALIZAR TRIGGER PARA USAR FUNCTION CORRETA
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Remover trigger antigo
DROP TRIGGER IF EXISTS process_order_billing_trigger ON orders;

-- 2. Remover function antiga se existir
DROP FUNCTION IF EXISTS process_order_billing_function();

-- 3. Criar função que chama Edge Function via HTTP
CREATE OR REPLACE FUNCTION process_order_billing_function()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
  api_url TEXT := 'https://gtjhpkakousmdrzjpdat.supabase.co/functions/v1/process-order-billing';
  api_key TEXT := Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
BEGIN
  -- Obter dados do pedido inserido
  SELECT * INTO order_record FROM NEW;
  
  -- Fazer chamada HTTP para Edge Function
  -- Em ambiente Supabase, usamos pg_http_extension se disponível
  -- Por enquanto, vamos usar lógica direta para evitar complexidade
  
  -- Lógica direta no trigger (mais confiável)
  UPDATE billing_cycles 
  SET 
    free_orders_used = CASE 
      WHEN free_orders_used < (SELECT free_orders_per_period FROM billing_plans WHERE id = (
        SELECT plan_id FROM pharmacy_subscriptions WHERE pharmacy_id = order_record.pharmacy_id AND status = 'active'
      ))
      THEN free_orders_used + 1
      ELSE free_orders_used
    END,
    overage_orders = CASE 
      WHEN free_orders_used >= (SELECT free_orders_per_period FROM billing_plans WHERE id = (
        SELECT plan_id FROM pharmacy_subscriptions WHERE pharmacy_id = order_record.pharmacy_id AND status = 'active'
      ))
      THEN overage_orders + 1
      ELSE overage_orders
    END
  WHERE pharmacy_id = order_record.pharmacy_id 
    AND period_start = CURRENT_DATE 
    AND status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recriar trigger
CREATE TRIGGER process_order_billing_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION process_order_billing_function();

-- 5. Verificar criação
SELECT 
  'TRIGGER CRIADO COM SUCESSO' as status,
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'process_order_billing_trigger';
