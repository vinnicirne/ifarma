-- Debug: Verificar se o trigger e ciclo de billing estão funcionando
-- Execute este SQL no Supabase e verifique os resultados

-- 1. Verificar se o trigger existe
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name
FROM pg_trigger 
WHERE tgrelid = 'public.orders'::regclass
AND tgfoid::regproc = 'increment_billing_cycle_on_order_delivered'::regproc;

-- 2. Verificar se a função do trigger existe
SELECT 
    proname as function_name,
    prosrc as source
FROM pg_proc 
WHERE proname = 'increment_billing_cycle_on_order_delivered';

-- 3. Verificar ciclos ativos
SELECT 
    id,
    pharmacy_id,
    status,
    free_orders_used,
    overage_orders,
    period_start,
    period_end,
    updated_at
FROM billing_cycles 
WHERE status = 'active'
ORDER BY updated_at DESC;

-- 4. Verificar pedidos entregues recentes (últimas 24h)
SELECT 
    id,
    pharmacy_id,
    status,
    delivered_at,
    updated_at
FROM orders 
WHERE status = 'entregue'
AND delivered_at >= NOW() - INTERVAL '24 hours'
ORDER BY delivered_at DESC
LIMIT 10;

-- 5. Verificar se há entregas sem delivered_at (inconsistente)
SELECT 
    COUNT(*) as pedidos_entregues_sem_delivered_at
FROM orders 
WHERE status = 'entregue'
AND delivered_at IS NULL;
