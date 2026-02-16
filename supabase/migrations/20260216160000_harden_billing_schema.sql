
-- ============================================================================
-- MIGRATION: Harden Billing Invoices Schema
-- Description: Standardizes column naming (lowercase) and ensures consistency 
--              between Edge Functions and Database.
-- ============================================================================

BEGIN;

-- 1. Renomear Pharmacy_id para pharmacy_id (se necessário)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'Pharmacy_id'
    ) THEN
        ALTER TABLE billing_invoices RENAME COLUMN "Pharmacy_id" TO pharmacy_id;
    END IF;
END $$;

-- 2. Garantir que asaas_invoice_id seja a coluna padrão
DO $$
BEGIN
    -- Se existe asaas_payment_id mas não existe asaas_invoice_id, renomeia
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'asaas_payment_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'asaas_invoice_id'
    ) THEN
        ALTER TABLE billing_invoices RENAME COLUMN asaas_payment_id TO asaas_invoice_id;
    END IF;

    -- Se existirem as duas, garante que asaas_invoice_id está preenchida e remove a obsoleta
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'asaas_payment_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'asaas_invoice_id'
    ) THEN
        UPDATE billing_invoices SET asaas_invoice_id = COALESCE(asaas_invoice_id, asaas_payment_id);
        ALTER TABLE billing_invoices DROP COLUMN asaas_payment_id;
    END IF;

    -- Se nenhuma existe (improvável), cria
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'asaas_invoice_id'
    ) THEN
        ALTER TABLE billing_invoices ADD COLUMN asaas_invoice_id TEXT;
    END IF;
END $$;

-- 3. Garantir índices e constraints
CREATE INDEX IF NOT EXISTS idx_billing_invoices_asaas_invoice_id ON billing_invoices(asaas_invoice_id);
ALTER TABLE billing_invoices DROP CONSTRAINT IF EXISTS billing_invoices_asaas_invoice_id_key;
ALTER TABLE billing_invoices ADD CONSTRAINT billing_invoices_asaas_invoice_id_key UNIQUE (asaas_invoice_id);

-- 4. Garantir colunas no pharmacies
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS asaas_status TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS asaas_last_error TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS asaas_updated_at TIMESTAMPTZ;

-- 5. Garantir que as outras colunas estão em lowercase (caso o dashboard tenha criado algo esquisito)
-- Nota: PostgreSQL por padrão converte para lowercase CamelCase se não estiver entre aspas, 
-- mas se o usuário criou com aspas, precisamos renomear explicitamente.

COMMIT;
