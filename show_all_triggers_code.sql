-- MOSTRAR CÓDIGO COMPLETO DE TODOS OS TRIGGERS
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Listar todos os triggers com código completo
SELECT 
  'TRIGGER COMPLETO' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_condition,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'orders'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- 2. Mostrar código das functions relacionadas
SELECT 
  'FUNCTION COMPLETA' as info,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND (
    routine_name ILIKE '%billing%' 
    OR routine_name ILIKE '%order%'
    OR routine_name ILIKE '%cycle%'
  )
ORDER BY routine_name;

-- 3. Mostrar apenas triggers da tabela orders
SELECT 
  'TRIGGERS NA TABELA ORDERS' as info,
  tgname as trigger_name,
  tgfoid::regclass as table_name,
  tgenabled as enabled,
  tgdeferrable as deferrable,
  tginitdeferred as initially_deferred
FROM pg_trigger tg
JOIN pg_class tgfoid ON tg.tgfoid = tgfoid.oid
WHERE tg.tgrelid = 'public.orders'::regclass
ORDER BY tg.tgname;
