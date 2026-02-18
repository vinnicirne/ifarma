-- ============================================
-- AUDITORIA COMPLETA DO SISTEMA - DIAGNÓSTICO RIGOROSO
-- Identifica exatamente o que foi quebrado
-- ============================================

-- 🚨 OBJETIVO: Encontrar a causa raiz dos erros

-- ============================================
-- 1. VERIFICAR STATUS DAS TABELAS PRINCIPAIS
-- ============================================

SELECT 
    'TABELAS PRINCIPAIS' as info,
    table_name,
    table_type,
    is_insertable_into,
    is_typed
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'pharmacies', 'products', 'orders', 'categories')
ORDER BY table_name;

-- ============================================
-- 2. VERIFICAR RLS STATUS POR TABELA
-- ============================================

SELECT 
    'RLS STATUS' as info,
    schemaname,
    tablename,
    rowlevelsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'pharmacies', 'products', 'orders', 'categories')
ORDER BY tablename;

-- ============================================
-- 3. VERIFICAR TODAS AS RLS POLICIES EXISTENTES
-- ============================================

SELECT 
    'RLS POLICIES EXISTENTES' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'HAS_CONDITION'
        ELSE 'NO_CONDITION'
    END as has_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 4. VERIFICAR COLUNAS DA TABELA PROFILES
-- ============================================

SELECT 
    'COLUNAS - PROFILES' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 5. VERIFICAR CONSTRAINTS DA TABELA PROFILES
-- ============================================

SELECT 
    'CONSTRAINTS - PROFILES' as info,
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu 
    ON cc.constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'profiles' 
    AND ccu.table_schema = 'public';

-- ============================================
-- 6. VERIFICAR ÍNDICES DA TABELA PROFILES
-- ============================================

SELECT 
    'ÍNDICES - PROFILES' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'profiles' 
    AND schemaname = 'public'
ORDER BY indexname;

-- ============================================
-- 7. VERIFICAR CHAVES ESTRANGEIRAS
-- ============================================

SELECT 
    'FOREIGN KEYS' as info,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('profiles', 'pharmacies', 'products', 'orders')
ORDER BY tc.table_name;

-- ============================================
-- 8. TESTAR CONEXÃO BÁSICA
-- ============================================

SELECT 
    'TESTE CONEXÃO' as info,
    NOW() as timestamp,
    current_database() as database,
    current_user() as user;

-- ============================================
-- 9. VERIFICAR SE TABELA PROFILES TEM DADOS
-- ============================================

SELECT 
    'DADOS - PROFILES' as info,
    COUNT(*) as total_registros,
    COUNT(DISTINCT role) as roles_unicos,
    COUNT(DISTINCT pharmacy_id) as pharmacies_unicas,
    COUNT(DISTINCT id) as usuarios_unicos
FROM profiles;

-- ============================================
-- 10. VERIFICAR PERFIS POR ROLE
-- ============================================

SELECT 
    'PERFIS POR ROLE' as info,
    role,
    COUNT(*) as quantidade,
    COUNT(DISTINCT pharmacy_id) as pharmacies
FROM profiles 
GROUP BY role 
ORDER BY quantidade DESC;

-- ============================================
-- 11. VERIFICAR SE EXISTEM USUÁRIOS SEM PHARMACY_ID
-- ============================================

SELECT 
    'USUÁRIOS SEM PHARMACY_ID' as info,
    role,
    COUNT(*) as quantidade
FROM profiles 
WHERE pharmacy_id IS NULL 
GROUP BY role 
ORDER BY quantidade DESC;

-- ============================================
-- 12. VERIFICAR SE PHARMACIES EXISTE
-- ============================================

SELECT 
    'DADOS - PHARMACIES' as info,
    COUNT(*) as total_farmacias,
    COUNT(DISTINCT owner_id) as owners_unicos,
    COUNT(DISTINCT status) as status_unicos
FROM pharmacies;

-- ============================================
-- 13. DIAGNÓSTICO FINAL
-- ============================================

SELECT 
    'DIAGNÓSTICO FINAL' as info,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') = 0 
        THEN '🚨 CRÍTICO: Nenhuma policy RLS na tabela profiles'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') < 3 
        THEN '⚠️ ATENÇÃO: Poucas policies RLS na tabela profiles'
        ELSE '✅ OK: Policies RLS presentes na tabela profiles'
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
    END as status_dados;

-- ============================================
-- INSTRUÇÕES PARA ANÁLISE
-- ============================================

-- 1. Execute este SQL completo no Supabase Dashboard
-- 2. Analise cada seção para identificar problemas
-- 3. Preste atenção especial às seções:
--    - RLS STATUS (se RLS está ativo)
--    - RLS POLICIES EXISTENTES (quais policies existem)
--    - DIAGNÓSTICO FINAL (resumo dos problemas)
-- 4. Compare com o esperado do schema original
