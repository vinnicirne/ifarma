
-- Migration: Add missing asaas_status to billing_invoices if not exists
-- Date: 2026-02-16

DO $$
BEGIN
    -- asaas_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'asaas_status'
    ) THEN
        ALTER TABLE billing_invoices ADD COLUMN asaas_status TEXT;
    END IF;

    -- asaas_updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'billing_invoices' AND column_name = 'asaas_updated_at'
    ) THEN
        ALTER TABLE billing_invoices ADD COLUMN asaas_updated_at TIMESTAMPTZ;
    END IF;

END $$;
