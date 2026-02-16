-- Migration: Restore subscription columns
-- Author: Antigravity
-- Date: 2026-02-15

DO $$
BEGIN
    -- current_period_start
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'current_period_start'
    ) THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN current_period_start TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- current_period_end
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'current_period_end'
    ) THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
    END IF;

    -- cancel_at_period_end
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_subscriptions' AND column_name = 'cancel_at_period_end'
    ) THEN
        ALTER TABLE pharmacy_subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pharmacy_subscriptions_period_end ON pharmacy_subscriptions(current_period_end);
