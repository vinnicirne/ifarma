-- LIMPEZA COMPLETA DE TRIGGERS E FUNCTIONS
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Remover TODOS os triggers relacionados a orders/billing
DROP TRIGGER IF EXISTS process_order_billing_trigger ON orders;
DROP TRIGGER IF EXISTS order_created_trigger ON orders;
DROP TRIGGER IF EXISTS billing_trigger ON orders;
DROP TRIGGER IF EXISTS order_billing_trigger ON orders;

-- 2. Remover TODAS as functions relacionadas
DROP FUNCTION IF EXISTS process_order_billing_function();
DROP FUNCTION IF EXISTS notify_order_created();
DROP FUNCTION IF EXISTS call_order_billing_function();
DROP FUNCTION IF EXISTS billing_function();

-- 3. Verificar se ainda existe algum trigger
SELECT 
  'TRIGGERS RESTANTES' as info,
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table IN ('orders', 'billing_cycles')
ORDER BY trigger_name;

-- 4. Resetar contadores novamente
UPDATE billing_cycles
SET 
  free_orders_used = 0,
  overage_orders = 0,
  overage_amount_cents = 0,
  status = 'active'
WHERE pharmacy_id = 'ddb15d6a-3578-4a23-8fa5-b246258aa746'
  AND period_start = CURRENT_DATE
  AND status = 'active';

-- 5. Verificar resultado final
SELECT 
  'BILLING CYCLE LIMPO' as info,
  pharmacy_id,
  period_start,
  period_end,
  status,
  free_orders_used,
  overage_orders,
  overage_amount_cents
FROM billing_cycles 
WHERE pharmacy_id = 'ddb15d6a-3578-4a23-8fa5-b246258aa746'
  AND period_start = CURRENT_DATE
  AND status = 'active';
