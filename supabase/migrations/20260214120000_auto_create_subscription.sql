-- Migration: Auto-create subscription on pharmacy registration
-- Author: Antigravity
-- Date: 2026-02-14

-- 1. Ensure 'plan' column exists in pharmacies table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacies' AND column_name = 'plan'
    ) THEN
        ALTER TABLE pharmacies ADD COLUMN plan TEXT DEFAULT 'gratuito';
    END IF;
END $$;

-- 2. Create function to handle new pharmacy subscription
CREATE OR REPLACE FUNCTION handle_new_pharmacy_subscription()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_id UUID;
    v_plan_slug TEXT;
BEGIN
    -- Determine plan slug (default to 'gratuito' if null)
    v_plan_slug := COALESCE(NEW.plan, 'gratuito');

    -- Find plan ID by slug
    SELECT id INTO v_plan_id
    FROM billing_plans
    WHERE slug = v_plan_slug OR name ILIKE v_plan_slug -- Fallback for name match
    LIMIT 1;

    -- If plan found, create subscription
    IF v_plan_id IS NOT NULL THEN
        INSERT INTO pharmacy_subscriptions (
            pharmacy_id,
            plan_id,
            status,
            current_period_start,
            current_period_end
        ) VALUES (
            NEW.id,
            v_plan_id,
            'active',
            NOW(),
            NOW() + INTERVAL '30 days' -- Initial period
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trigger_auto_create_subscription ON pharmacies;
CREATE TRIGGER trigger_auto_create_subscription
    AFTER INSERT ON pharmacies
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_pharmacy_subscription();
