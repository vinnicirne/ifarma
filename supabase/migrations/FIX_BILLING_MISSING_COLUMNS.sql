-- ============================================================================
-- FIX: Adicionar colunas faltantes nas tabelas de billing
-- ============================================================================

-- 1. billing_cycles: Adicionar overage_amount_cents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_cycles' AND column_name = 'overage_amount_cents'
    ) THEN
        ALTER TABLE billing_cycles ADD COLUMN overage_amount_cents INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 2. pharmacy_subscriptions: Adicionar next_billing_date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'next_billing_date'
    ) THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN next_billing_date DATE;
    END IF;
END $$;

-- 3. Verificar colunas criadas
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('billing_cycles', 'pharmacy_subscriptions')
AND column_name IN ('overage_amount_cents', 'next_billing_date')
ORDER BY table_name, column_name;
