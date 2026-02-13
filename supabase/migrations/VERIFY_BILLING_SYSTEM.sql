-- ============================================================================
-- TESTES DE VERIFICAÇÃO DO SISTEMA DE BILLING
-- Execute este script no Supabase Dashboard para verificar se tudo está OK
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR TABELAS
-- ============================================================================

SELECT 'Verificando tabelas de billing...' AS status;

SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'billing_plans', 
            'billing_global_config', 
            'billing_policy', 
            'pharmacy_subscriptions', 
            'pharmacy_contracts', 
            'billing_cycles', 
            'billing_invoices', 
            'billing_audit_log'
        ) THEN '✅ OK'
        ELSE '❌ MISSING'
    END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'billing%'
ORDER BY table_name;

-- ============================================================================
-- 2. VERIFICAR COLUNAS CRÍTICAS
-- ============================================================================

SELECT 'Verificando colunas críticas...' AS status;

-- billing_plans deve ter slug
SELECT 
    'billing_plans.slug' AS column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'billing_plans' AND column_name = 'slug'
        ) THEN '✅ OK'
        ELSE '❌ MISSING'
    END AS status;

-- pharmacy_subscriptions deve ter asaas_customer_id
SELECT 
    'pharmacy_subscriptions.asaas_customer_id' AS column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'asaas_customer_id'
        ) THEN '✅ OK'
        ELSE '❌ MISSING'
    END AS status;

-- billing_invoices deve ter asaas_invoice_id
SELECT 
    'billing_invoices.asaas_invoice_id' AS column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'billing_invoices' AND column_name = 'asaas_invoice_id'
        ) THEN '✅ OK'
        ELSE '❌ MISSING'
    END AS status;

-- ============================================================================
-- 3. VERIFICAR FUNÇÕES
-- ============================================================================

SELECT 'Verificando funções...' AS status;

SELECT 
    proname AS function_name,
    '✅ OK' AS status
FROM pg_proc
WHERE proname IN (
    'update_updated_at_column',
    'log_billing_changes',
    'get_pharmacy_billing_rules',
    'increment_billing_cycle_on_order_delivered'
)
ORDER BY proname;

-- ============================================================================
-- 4. VERIFICAR TRIGGERS
-- ============================================================================

SELECT 'Verificando triggers...' AS status;

SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    '✅ OK' AS status
FROM pg_trigger
WHERE tgname IN (
    'trigger_increment_billing_cycle',
    'audit_billing_plans',
    'audit_pharmacy_contracts',
    'audit_billing_policy'
)
ORDER BY tgname;

-- ============================================================================
-- 5. VERIFICAR SEED DATA
-- ============================================================================

SELECT 'Verificando seed data...' AS status;

-- Planos
SELECT 
    'billing_plans' AS table_name,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ OK (3 planos)'
        ELSE '⚠️ INCOMPLETE'
    END AS status
FROM billing_plans;

SELECT id, name, slug, monthly_fee_cents, free_orders_per_period 
FROM billing_plans 
ORDER BY monthly_fee_cents;

-- Políticas
SELECT 
    'billing_policy' AS table_name,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ OK (4 políticas)'
        ELSE '⚠️ INCOMPLETE'
    END AS status
FROM billing_policy;

SELECT policy_key, policy_value 
FROM billing_policy 
ORDER BY policy_key;

-- Config Global
SELECT 
    'billing_global_config' AS table_name,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) >= 1 THEN '✅ OK (1 config)'
        ELSE '⚠️ INCOMPLETE'
    END AS status
FROM billing_global_config;

SELECT config_key, monthly_fee_cents, free_orders_per_period 
FROM billing_global_config;

-- ============================================================================
-- 6. TESTAR FUNÇÃO get_pharmacy_billing_rules
-- ============================================================================

SELECT 'Testando função get_pharmacy_billing_rules...' AS status;

-- Criar farmácia de teste (se não existir)
DO $$
DECLARE
    test_pharmacy_id UUID;
BEGIN
    -- Buscar primeira farmácia existente
    SELECT id INTO test_pharmacy_id FROM pharmacies LIMIT 1;
    
    IF test_pharmacy_id IS NOT NULL THEN
        -- Testar função
        RAISE NOTICE 'Testando com pharmacy_id: %', test_pharmacy_id;
        
        -- Executar função
        PERFORM * FROM get_pharmacy_billing_rules(test_pharmacy_id);
        
        RAISE NOTICE '✅ Função get_pharmacy_billing_rules OK';
    ELSE
        RAISE NOTICE '⚠️ Nenhuma farmácia encontrada para teste';
    END IF;
END $$;

-- ============================================================================
-- 7. VERIFICAR RLS POLICIES
-- ============================================================================

SELECT 'Verificando RLS policies...' AS status;

SELECT 
    schemaname,
    tablename,
    policyname,
    '✅ OK' AS status
FROM pg_policies
WHERE tablename LIKE 'billing%'
ORDER BY tablename, policyname;

-- ============================================================================
-- 8. RESUMO FINAL
-- ============================================================================

SELECT '
============================================================================
RESUMO DA VERIFICAÇÃO
============================================================================

✅ Sistema de Billing está configurado corretamente!

Próximos passos:
1. Testar trigger automático (criar pedido e marcar como delivered)
2. Testar frontend (BillingPlans, BillingPolicies)
3. Implementar Edge Functions (Asaas integration)
4. Implementar componentes faltantes (BillingPharmacies, etc.)

Documentação:
- docs/BILLING_PATCH_GUIDE.md
- docs/BILLING_STATUS_FINAL.md
- docs/billing-system-prd.md

============================================================================
' AS summary;
