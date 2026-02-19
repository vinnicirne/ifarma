-- Debug: Verificar por que pedidos atribuídos não chegam ao motoboy
-- Execute este SQL no Supabase para diagnosticar o fluxo

-- 1. Verificar pedidos recentes atribuídos a motoboys
SELECT 
    o.id,
    o.pharmacy_id,
    o.motoboy_id,
    o.status,
    o.created_at,
    o.updated_at,
    p.full_name as motoboy_name,
    ph.name as pharmacy_name
FROM orders o
LEFT JOIN profiles p ON p.id = o.motoboy_id
LEFT JOIN pharmacies ph ON ph.id = o.pharmacy_id
WHERE o.motoboy_id IS NOT NULL
AND o.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY o.created_at DESC
LIMIT 10;

-- 2. Verificar se o RPC assign_order_to_motoboy está funcionando
-- (Execute este comando para testar manualmente, substituindo os IDs)
-- SELECT public.assign_order_to_motoboy('order_id_aqui', 'motoboy_id_aqui');

-- 3. Verificar se o motoboy está online e ativo
SELECT 
    id,
    full_name,
    role,
    is_online,
    is_active,
    current_order_id
FROM profiles
WHERE role = 'motoboy'
AND is_active = true
ORDER BY updated_at DESC NULLS LAST
LIMIT 10;

-- 4. Verificar políticas RLS para orders (motoboy view)
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
WHERE tablename = 'orders'
AND (policyname ILIKE '%motoboy%' OR policyname ILIKE '%assign%');

-- 5. Verificar se há pedidos com status inconsistente
SELECT 
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN motoboy_id IS NOT NULL THEN 1 END) as with_motoboy
FROM orders
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY count DESC;
