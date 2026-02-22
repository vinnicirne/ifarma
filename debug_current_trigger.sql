-- DEBUG DO TRIGGER ATUAL
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Verificar qual trigger está ativo AGORA
SELECT 
  'TRIGGER ATIVO' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'orders'
ORDER BY trigger_name;

-- 2. Verificar o código exato do trigger
SELECT 
  'TRIGGER CODE' as info,
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'correct_billing_function'
   OR routine_name ILIKE '%billing%'
   OR routine_name ILIKE '%order%'
ORDER BY routine_name;

-- 3. Verificar logs recentes (se disponível)
-- Esta query pode não funcionar dependendo da configuração
SELECT 
  'RECENT LOGS' as info,
  *
FROM pg_stat_activity 
WHERE query ILIKE '%billing%'
   OR query ILIKE '%order%'
LIMIT 5;
