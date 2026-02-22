-- CRIAR TRIGGER PARA PROCESSAR BILLING DE PEDIDOS
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS process_order_billing_trigger ON orders;

-- 2. Criar função para chamar Edge Function
CREATE OR REPLACE FUNCTION process_order_billing_function()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
BEGIN
  -- Obter dados do pedido inserido
  SELECT * INTO order_record FROM NEW;
  
  -- Chamar Edge Function de processamento (via HTTP)
  -- Nota: Em produção, considere usar RPC direto se disponível
  PERFORM pg_notify(
    'process_order_billing',
    json_build_object(
      'order_id', order_record.id,
      'pharmacy_id', order_record.pharmacy_id,
      'action', 'process'
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger AFTER INSERT
CREATE TRIGGER process_order_billing_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION process_order_billing_function();

-- 4. Verificar se trigger foi criado
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'process_order_billing_trigger';
