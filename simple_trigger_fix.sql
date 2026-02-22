-- TRIGGER SIMPLES + EDGE FUNCTION
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Remover trigger e function antigos
DROP TRIGGER IF EXISTS process_order_billing_trigger ON orders;
DROP FUNCTION IF EXISTS process_order_billing_function();

-- 2. Criar trigger simples que apenas notifica
CREATE OR REPLACE FUNCTION notify_order_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Envia notificação que será capturada por listener
  PERFORM pg_notify(
    'order_created',
    json_build_object(
      'order_id', NEW.id,
      'pharmacy_id', NEW.pharmacy_id,
      'created_at', NEW.created_at
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger AFTER INSERT
CREATE TRIGGER order_created_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_created();

-- 4. Verificar criação
SELECT 
  'TRIGGER SIMPLES CRIADO' as status,
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'order_created_trigger';
