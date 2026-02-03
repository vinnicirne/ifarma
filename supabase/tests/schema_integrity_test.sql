-- Schema Integrity Tests
-- Scripts para verificar integridade do banco de dados

-- ========================================
-- 1. VERIFICAÇÃO DE TABELAS ESSENCIAIS
-- ========================================

DO $$
DECLARE
    required_tables TEXT[] := ARRAY[
        'profiles',
        'pharmacies',
        'orders',
        'order_items',
        'products',
        'addresses',
        'messages',
        'notifications',
        'device_tokens',
        'location_history',
        'schema_migrations'
    ];
    missing_tables TEXT[] := '{}';
    tbl TEXT;
    table_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'IFARMA - SCHEMA INTEGRITY TEST';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    RAISE NOTICE '1. Verificando tabelas essenciais...';
    
    FOREACH tbl IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tbl
        ) THEN
            missing_tables := array_append(missing_tables, tbl);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING '❌ Tabelas faltando: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ Todas as tabelas essenciais existem';
    END IF;
    
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public';
    
    RAISE NOTICE 'Total de tabelas no schema public: %', table_count;
    RAISE NOTICE '';
END $$;

-- ========================================
-- 2. VERIFICAÇÃO DE RLS POLICIES
-- ========================================

DO $$
DECLARE
    tables_with_rls INTEGER;
    tables_without_rls TEXT[];
    tbl RECORD;
BEGIN
    RAISE NOTICE '2. Verificando Row Level Security (RLS)...';
    
    SELECT COUNT(*) INTO tables_with_rls
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true;
    
    -- Listar tabelas sem RLS que deveriam ter
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
        AND tablename NOT IN ('schema_migrations', 'system_settings')
    LOOP
        tables_without_rls := array_append(tables_without_rls, tbl.tablename);
    END LOOP;
    
    RAISE NOTICE '✅ Tabelas com RLS habilitado: %', tables_with_rls;
    
    IF array_length(tables_without_rls, 1) > 0 THEN
        RAISE WARNING '⚠️  Tabelas sem RLS: %', array_to_string(tables_without_rls, ', ');
    ELSE
        RAISE NOTICE '✅ Todas as tabelas críticas têm RLS';
    END IF;
    RAISE NOTICE '';
END $$;

-- ========================================
-- 3. VERIFICAÇÃO DE ÍNDICES
-- ========================================

DO $$
DECLARE
    index_count INTEGER;
    missing_indexes TEXT[] := '{}';
BEGIN
    RAISE NOTICE '3. Verificando índices...';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    RAISE NOTICE '✅ Total de índices criados: %', index_count;
    
    -- Verificar índices críticos para performance
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'orders' 
        AND indexname LIKE '%status%'
    ) THEN
        missing_indexes := array_append(missing_indexes, 'orders(status)');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'orders' 
        AND indexname LIKE '%motoboy%'
    ) THEN
        missing_indexes := array_append(missing_indexes, 'orders(motoboy_id)');
    END IF;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING '⚠️  Índices críticos faltando: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE '✅ Índices críticos presentes';
    END IF;
    RAISE NOTICE '';
END $$;

-- ========================================
-- 4. VERIFICAÇÃO DE FOREIGN KEYS
-- ========================================

DO $$
DECLARE
    fk_count INTEGER;
    broken_fks RECORD;
    has_broken_fks BOOLEAN := false;
BEGIN
    RAISE NOTICE '4. Verificando Foreign Keys...';
    
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE '✅ Total de Foreign Keys: %', fk_count;
    
    -- Verificar FKs quebradas (órfãos)
    -- Exemplo: orders sem pharmacy válida
    FOR broken_fks IN
        SELECT COUNT(*) as orphan_count, 'orders -> pharmacies' as relationship
        FROM orders o
        WHERE NOT EXISTS (SELECT 1 FROM pharmacies p WHERE p.id = o.pharmacy_id)
        HAVING COUNT(*) > 0
    LOOP
        has_broken_fks := true;
        RAISE WARNING '❌ Registros órfãos encontrados: % em %', broken_fks.orphan_count, broken_fks.relationship;
    END LOOP;
    
    IF NOT has_broken_fks THEN
        RAISE NOTICE '✅ Nenhum registro órfão encontrado';
    END IF;
    RAISE NOTICE '';
END $$;

-- ========================================
-- 5. VERIFICAÇÃO DE REALTIME
-- ========================================

DO $$
DECLARE
    realtime_tables INTEGER;
BEGIN
    RAISE NOTICE '5. Verificando Realtime...';
    
    SELECT COUNT(*) INTO realtime_tables
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime';
    
    RAISE NOTICE '✅ Tabelas com Realtime habilitado: %', realtime_tables;
    
    IF realtime_tables < 5 THEN
        RAISE WARNING '⚠️  Poucas tabelas com Realtime. Verifique configuração.';
    END IF;
    RAISE NOTICE '';
END $$;

-- ========================================
-- 6. VERIFICAÇÃO DE MIGRATIONS
-- ========================================

DO $$
DECLARE
    migration_count INTEGER;
    latest_migration RECORD;
BEGIN
    RAISE NOTICE '6. Verificando Migrations...';
    
    SELECT COUNT(*) INTO migration_count
    FROM schema_migrations
    WHERE status = 'success';
    
    SELECT * INTO latest_migration
    FROM get_latest_migration();
    
    RAISE NOTICE '✅ Total de migrations aplicadas: %', migration_count;
    RAISE NOTICE 'Última migration: % - %', latest_migration.version, latest_migration.name;
    RAISE NOTICE 'Aplicada em: %', latest_migration.applied_at;
    RAISE NOTICE '';
END $$;

-- ========================================
-- RESUMO FINAL
-- ========================================

DO $$
DECLARE
    table_count INTEGER;
    rls_count INTEGER;
    index_count INTEGER;
    fk_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMO DA INTEGRIDADE DO SCHEMA';
    RAISE NOTICE '========================================';
    
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
    SELECT COUNT(*) INTO rls_count FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE schemaname = 'public';
    SELECT COUNT(*) INTO fk_count FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE 'Tabelas: %', table_count;
    RAISE NOTICE 'RLS habilitado: %', rls_count;
    RAISE NOTICE 'Índices: %', index_count;
    RAISE NOTICE 'Foreign Keys: %', fk_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Teste de integridade concluído!';
    RAISE NOTICE '========================================';
END $$;
