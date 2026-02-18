-- ============================================
-- AUDITORIA COMPLETA DO BANCO DE DADOS
-- Diagnóstico 100% completo para identificar o estado exato
-- ============================================

-- 🎯 OBJETIVO: Entender exatamente o que existe no banco agora

-- ============================================
-- 1. STATUS GERAL DO BANCO
-- ============================================

SELECT 
    '=== INFO GERAL DO BANCO ===' as secao,
    current_database() as database_name,
    CURRENT_USER as logged_user,
    version() as postgres_version,
    NOW() as audit_timestamp;

-- ============================================
-- 2. TODAS AS TABELAS DO ESQUEMA PUBLIC
-- ============================================

SELECT 
    '=== TODAS AS TABELAS ===' as secao,
    table_name,
    table_type,
    is_insertable_into
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- 3. STATUS RLS DE CADA TABELA
-- ============================================

SELECT 
    '=== STATUS RLS ===' as secao,
    schemaname,
    tablename,
    rowlevelsecurity as rls_enabled,
    hasrowsecurity as has_rls
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    )
ORDER BY tablename;

-- ============================================
-- 4. TODAS AS RLS POLICIES EXISTENTES (DETALHADO)
-- ============================================

SELECT 
    '=== RLS POLICIES COMPLETAS ===' as secao,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN SUBSTRING(qual, 1, 100) || '...'
        ELSE 'SEM CONDIÇÃO'
    END as condicao_resumida,
    CASE 
        WHEN with_check IS NOT NULL THEN 'TEM WITH_CHECK'
        ELSE 'SEM WITH_CHECK'
    END as tem_with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 5. ESTRUTURA COMPLETA DA TABELA PROFILES
-- ============================================

SELECT 
    '=== ESTRUTURA PROFILES ===' as secao,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 6. CONSTRAINTS DA TABELA PROFILES
-- ============================================

SELECT 
    '=== CONSTRAINTS PROFILES ===' as secao,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ============================================
-- 7. ÍNDICES DA TABELA PROFILES
-- ============================================

SELECT 
    '=== ÍNDICES PROFILES ===' as secao,
    indexname,
    indexdef,
    CASE 
        WHEN indexdef LIKE '%UNIQUE%' THEN 'ÚNICO'
        ELSE 'COMUM'
    END as tipo_indice
FROM pg_indexes 
WHERE tablename = 'profiles' 
    AND schemaname = 'public'
ORDER BY indexname;

-- ============================================
-- 8. CHAVES ESTRANGEIRAS ENVOLVENDO PROFILES
-- ============================================

SELECT 
    '=== CHAVES ESTRANGEIRAS PROFILES ===' as secao,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND (tc.table_name = 'profiles' OR ccu.table_name = 'profiles')
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- 9. DADOS DA TABELA PROFILES (ANÁLISE)
-- ============================================

SELECT 
    '=== ANÁLISE DADOS PROFILES ===' as secao,
    COUNT(*) as total_registros,
    COUNT(DISTINCT id) as usuarios_unicos,
    COUNT(DISTINCT email) as emails_unicos,
    COUNT(DISTINCT role) as tipos_role,
    COUNT(DISTINCT pharmacy_id) as pharmacies_unicas,
    COUNT(DISTINCT CASE WHEN pharmacy_id IS NOT NULL THEN id END) as com_pharmacy_id,
    COUNT(DISTINCT CASE WHEN pharmacy_id IS NULL THEN id END) as sem_pharmacy_id,
    COUNT(CASE WHEN is_active = true THEN 1 END) as ativos,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inativos
FROM profiles;

-- ============================================
-- 10. DISTRIBUIÇÃO DE ROLES EM PROFILES
-- ============================================

SELECT 
    '=== DISTRIBUIÇÃO ROLES ===' as secao,
    role,
    COUNT(*) as quantidade,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM profiles), 2) as percentual,
    COUNT(DISTINCT pharmacy_id) as pharmacies_unicas,
    COUNT(CASE WHEN pharmacy_id IS NULL THEN 1 END) as sem_pharmacy
FROM profiles 
GROUP BY role 
ORDER BY quantidade DESC;

-- ============================================
-- 11. VERIFICAR TABELA PHARMACIES
-- ============================================

SELECT 
    '=== ANÁLISE PHARMACIES ===' as secao,
    COUNT(*) as total_farmacias,
    COUNT(DISTINCT id) as ids_unicos,
    COUNT(DISTINCT owner_id) as owners_unicos,
    COUNT(DISTINCT status) as status_unicos,
    STRING_AGG(DISTINCT status, ', ') as tipos_status
FROM pharmacies;

-- ============================================
-- 12. VERIFICAR RELACIONAMENTO PROFILES-PHARMACIES
-- ============================================

SELECT 
    '=== RELACIONAMENTO PROFILES-PHARMACIES ===' as secao,
    p.role,
    COUNT(p.id) as total_profiles,
    COUNT(p.pharmacy_id) as com_pharmacy_id,
    COUNT(ph.id) as pharmacies_existentes,
    COUNT(CASE WHEN ph.id IS NULL THEN 1 END) as pharmacy_inexistente,
    COUNT(CASE WHEN ph.id IS NOT NULL THEN 1 END) as pharmacy_valido
FROM profiles p
LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
WHERE p.role IN ('merchant', 'manager', 'staff', 'motoboy')
GROUP BY p.role
ORDER BY p.role;

-- ============================================
-- 13. VERIFICAR OUTRAS TABELAS IMPORTANTES
-- ============================================

SELECT 
    '=== OUTRAS TABELAS IMPORTANTES ===' as secao,
    table_name,
    COALESCE(
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public'),
        0
    ) as num_colunas,
    COALESCE(
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.table_name AND schemaname = 'public'),
        0
    ) as num_policies
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('orders', 'products', 'categories', 'billing_plans', 'notifications')
ORDER BY table_name;

-- ============================================
-- 14. DIAGNÓSTICO FINAL DE PROBLEMAS
-- ============================================

SELECT 
    '=== DIAGNÓSTICO FINAL ===' as secao,
    'PROFILES' as tabela,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') = 0 
        THEN '🚨 CRÍTICO: Sem policies RLS em profiles'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') < 3 
        THEN '⚠️ ATENÇÃO: Poucas policies em profiles'
        ELSE '✅ OK: Policies presentes em profiles'
    END as status_profiles,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pharmacy_id') = 0
        THEN '🚨 CRÍTICO: Coluna pharmacy_id não existe'
        ELSE '✅ OK: Coluna pharmacy_id existe'
    END as status_pharmacy_id,
    CASE 
        WHEN (SELECT COUNT(*) FROM profiles) = 0
        THEN '🚨 CRÍTICO: Tabela profiles vazia'
        ELSE '✅ OK: Tabela profiles tem dados'
    END as status_dados
UNION ALL
SELECT 
    '=== DIAGNÓSTICO FINAL ===' as secao,
    'PHARMACIES' as tabela,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'pharmacies' AND schemaname = 'public') = 0 
        THEN '🚨 CRÍTICO: Sem policies RLS em pharmacies'
        ELSE '✅ OK: Policies presentes em pharmacies'
    END as status_profiles,
    CASE 
        WHEN (SELECT COUNT(*) FROM pharmacies) = 0
        THEN '⚠️ ATENÇÃO: Tabela pharmacies vazia'
        ELSE '✅ OK: Tabela pharmacies tem dados'
    END as status_pharmacy_id,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'pharmacies' AND column_name = 'owner_id') = 0
        THEN '🚨 CRÍTICO: Coluna owner_id não existe em pharmacies'
        ELSE '✅ OK: Coluna owner_id existe em pharmacies'
    END as status_dados
UNION ALL
SELECT 
    '=== DIAGNÓSTICO FINAL ===' as secao,
    'ORDERS' as tabela,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'orders' AND schemaname = 'public') = 0 
        THEN '🚨 CRÍTICO: Sem policies RLS em orders'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'orders' AND schemaname = 'public') < 4 
        THEN '⚠️ ATENÇÃO: Poucas policies em orders'
        ELSE '✅ OK: Policies presentes em orders'
    END as status_profiles,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id') = 0
        THEN '🚨 CRÍTICO: Coluna customer_id não existe em orders'
        ELSE '✅ OK: Estrutura orders OK'
    END as status_pharmacy_id,
    CASE 
        WHEN (SELECT COUNT(*) FROM orders) = 0
        THEN '⚠️ ATENÇÃO: Tabela orders vazia'
        ELSE '✅ OK: Tabela orders tem dados'
    END as status_dados;

-- ============================================
-- 15. RESUMO FINAL
-- ============================================

SELECT 
    '=== RESUMO FINAL ===' as secao,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies_sistema,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowlevelsecurity = true) as tabelas_com_rls,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tabelas,
    NOW() as timestamp_final;

-- ============================================
-- INSTRUÇÕES
-- ============================================

-- 1. Execute este SQL completo no Supabase Dashboard
-- 2. Analise cada seção cuidadosamente
-- 3. Preste atenção especial ao DIAGNÓSTICO FINAL
-- 4. Identifique exatamente o que falta ou está quebrado
-- 5. Com base no resultado, criaremos o SQL exato para corrigir
