-- VERIFICAR TRIGGERS QUE ATUALIZAM BILLING_CYCLES
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Listar todos os triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_condition,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'billing_cycles' 
   OR event_object_table = 'orders'
ORDER BY trigger_name;

-- 2. Listar functions que podem estar relacionadas
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name ILIKE '%billing%' 
   OR routine_name ILIKE '%order%'
   OR routine_name ILIKE '%cycle%'
ORDER BY routine_name;

-- 3. Verificar RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('billing_cycles', 'orders')
ORDER BY tablename, policyname;
