-- ============================================
-- DIAGNÓSTICO: Motoboys não aparecem no Admin
-- ============================================

-- 1. VERIFICAR SE HÁ MOTOBOYS CADASTRADOS
SELECT 
    id, 
    email, 
    full_name, 
    role, 
    pharmacy_id, 
    is_active, 
    is_online,
    created_at
FROM profiles 
WHERE role = 'motoboy'
ORDER BY created_at DESC;

-- 2. VERIFICAR POLÍTICAS RLS DA TABELA PROFILES
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
WHERE tablename = 'profiles';

-- 3. TESTAR QUERY QUE O ADMIN USA
SELECT 
    id, 
    full_name, 
    phone, 
    email, 
    pharmacy_id, 
    is_active, 
    is_online, 
    created_at
FROM profiles
WHERE role = 'motoboy'
ORDER BY full_name;

-- 4. VERIFICAR SE O ADMIN TEM PERMISSÃO
SELECT 
    id, 
    email, 
    role 
FROM profiles 
WHERE email = 'viniciuscirne@gmail.com';

-- 5. SE NÃO APARECER NADA, DESABILITAR RLS TEMPORARIAMENTE
-- (Execute apenas se necessário)
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
