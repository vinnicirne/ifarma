-- ============================================================================
-- PATCH: Adicionar campo slug aos planos existentes
-- ============================================================================

-- 1. Adicionar coluna slug (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_plans' AND column_name = 'slug'
    ) THEN
        ALTER TABLE billing_plans ADD COLUMN slug TEXT;
    END IF;
END $$;

-- 2. Gerar slugs para planos existentes
UPDATE billing_plans
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g'),
        '^_|_$', '', 'g'
    )
)
WHERE slug IS NULL OR slug = '';

-- 3. Adicionar constraint UNIQUE no slug
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'billing_plans_slug_key'
    ) THEN
        ALTER TABLE billing_plans ADD CONSTRAINT billing_plans_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 4. Adicionar NOT NULL no slug
ALTER TABLE billing_plans ALTER COLUMN slug SET NOT NULL;

-- 5. Criar índice (se não existir)
CREATE INDEX IF NOT EXISTS idx_billing_plans_slug ON billing_plans(slug);

-- 6. Adicionar coluna asaas_customer_id em pharmacy_subscriptions (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'asaas_customer_id'
    ) THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN asaas_customer_id TEXT;
    END IF;
END $$;

-- ============================================================================
-- FIM DO PATCH
-- ============================================================================
