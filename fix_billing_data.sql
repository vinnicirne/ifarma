-- CORREÇÃO DEFINITIVA DOS DADOS DE BILLING
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Atualizar subscription para ACTIVE (se pagamento foi confirmado)
UPDATE pharmacy_subscriptions
SET 
  status = 'active',
  activated_at = NOW(),
  next_billing_date = (CURRENT_DATE + INTERVAL '30 days')::date,  -- Próximo em 30 dias (23/03/2026)
  started_at = CURRENT_TIMESTAMP,
  asaas_last_error = null,
  asaas_updated_at = NOW()
WHERE pharmacy_id = 'ddb15d6a-3578-4a23-8fa5-b246258aa746';

-- 2. Resetar ciclo atual com datas corretas
UPDATE billing_cycles
SET 
  free_orders_used = 0,          -- Reseta contagem errada
  overage_orders = 0,           -- Reseta excedentes
  overage_amount_cents = 0,      -- Reseta custo
  period_end = (CURRENT_DATE + INTERVAL '30 days')::date,  -- Fim em 30 dias (23/03/2026)
  status = 'active'              -- Ativo pois pagamento foi confirmado
WHERE pharmacy_id = 'ddb15d6a-3578-4a23-8fa5-b246258aa746'
  AND period_start = CURRENT_DATE;  -- Atualiza apenas o ciclo de hoje

-- 3. Verificar dados corrigidos
SELECT 
  'SUBSCRIPTION' as tipo,
  status,
  activated_at,
  next_billing_date,
  started_at
FROM pharmacy_subscriptions 
WHERE pharmacy_id = 'ddb15d6a-3578-4a23-8fa5-b246258aa746'

UNION ALL

SELECT 
  'BILLING CYCLE' as tipo,
  status,
  period_start as activated_at,
  period_end as next_billing_date,
  null as started_at
FROM billing_cycles 
WHERE pharmacy_id = 'ddb15d6a-3578-4a23-8fa5-b246258aa746'
  AND period_start = CURRENT_DATE;
