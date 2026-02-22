-- REMOVER FUNCTION ANTIGA QUE CONTA ERRADO
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Remover trigger antigo (nome correto baseado no erro)
DROP TRIGGER IF EXISTS trigger_increment_billing_cycle ON orders;

-- 2. Remover function antiga
DROP FUNCTION IF EXISTS increment_billing_cycle_on_order_delivered();

-- 3. Verificar se foi removida
SELECT 
  'FUNCTION ANTIGA REMOVIDA' as status,
  routine_name
FROM information_schema.routines 
WHERE routine_name = 'increment_billing_cycle_on_order_delivered';

-- 4. Verificar triggers restantes
SELECT 
  'TRIGGERS RESTANTES' as info,
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'orders'
ORDER BY trigger_name;
