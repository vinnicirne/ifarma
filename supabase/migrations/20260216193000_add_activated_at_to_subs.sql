-- Migration: Add missing columns for Asaas Webhook
-- Date: 2026-02-16 19:30

DO $$
BEGIN
    -- pharmacy_subscriptions: activated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'activated_at') THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN activated_at TIMESTAMPTZ;
    END IF;

    -- pharmacy_subscriptions: asaas_last_error
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'asaas_last_error') THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN asaas_last_error TEXT;
    END IF;

    -- pharmacy_subscriptions: asaas_updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'asaas_updated_at') THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN asaas_updated_at TIMESTAMPTZ;
    END IF;

    -- billing_invoices: paid_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_invoices' AND column_name = 'paid_at') THEN
        ALTER TABLE billing_invoices ADD COLUMN paid_at TIMESTAMPTZ;
    END IF;

    -- billing_invoices: asaas_status (redundant check but safe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_invoices' AND column_name = 'asaas_status') THEN
        ALTER TABLE billing_invoices ADD COLUMN asaas_status TEXT;
    END IF;

    -- billing_invoices: asaas_updated_at (redundant check but safe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_invoices' AND column_name = 'asaas_updated_at') THEN
        ALTER TABLE billing_invoices ADD COLUMN asaas_updated_at TIMESTAMPTZ;
    END IF;

END $$;
