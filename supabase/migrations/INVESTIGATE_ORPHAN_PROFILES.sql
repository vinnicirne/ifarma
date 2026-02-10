-- INVESTIGAR POR QUE A CONSTRAINT FALHA

-- 1. Verificar se há perfis órfãos (sem usuário correspondente no auth.users)
SELECT 
    p.id,
    p.email,
    p.role,
    CASE 
        WHEN au.id IS NULL THEN '❌ SEM USUÁRIO NO AUTH'
        ELSE '✅ USUÁRIO EXISTE'
    END as status
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at DESC;

-- 2. Contar quantos perfis órfãos existem
SELECT 
    COUNT(*) as total_profiles,
    COUNT(au.id) as profiles_with_user,
    COUNT(*) - COUNT(au.id) as orphan_profiles
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id;

-- 3. Listar perfis órfãos (se houver)
SELECT 
    p.id,
    p.email,
    p.role,
    p.created_at
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE au.id IS NULL;
