-- RESETAR CONTADORES DE BILLING CORRETAMENTE
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Resetar ciclo atual para valores corretos
UPDATE billing_cycles
SET 
  free_orders_used = 0,          -- Zera contador grátis
  overage_orders = 0,           -- Zera contador excedente
  overage_amount_cents = 0,      -- Zera valor excedente
  status = 'active'              -- Garante status ativo
WHERE pharmacy_id = 'ddb15d6a-3578-4a23-8fa5-b246258aa746'
  AND period_start = CURRENT_DATE
  AND status = 'active';

-- 2. Verificar resultado
SELECT 
  'BILLING CYCLE RESETADO' as info,
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
