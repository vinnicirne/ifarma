-- ============================================================================
-- MIGRATION: Add asaas_customer_id to pharmacy_subscriptions
-- Description: Ensures the column exists to prevent 500 errors in Edge Functions
--              when trying to insert this field.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'asaas_customer_id'
    ) THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN asaas_customer_id TEXT;
    END IF;
END $$;
