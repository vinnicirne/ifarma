-- ============================================================================
-- FIX: Missing Billing Plans (Data & Permissions)
-- ============================================================================

-- 1. Ensure RLS is open for EVERYONE (public), not just authenticated
--    This ensures even if the session is loading, the plans can be fetched.
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON billing_plans;
DROP POLICY IF EXISTS "Authenticated users can view plans" ON billing_plans; -- drop old one

CREATE POLICY "Public read access" ON billing_plans
    FOR SELECT
    TO public
    USING (true);

-- 2. Ensure plans exist and are active
--    Update existing to be active
UPDATE billing_plans SET is_active = true;

-- 3. Insert default plans if table is empty
INSERT INTO billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, is_active)
SELECT 'Plano Gratuito', 'free', 0, 50, 500, true
WHERE NOT EXISTS (SELECT 1 FROM billing_plans WHERE slug = 'free');

INSERT INTO billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, is_active)
SELECT 'Plano Pro', 'pro', 9900, 200, 300, true
WHERE NOT EXISTS (SELECT 1 FROM billing_plans WHERE slug = 'pro');

INSERT INTO billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, is_active)
SELECT 'Plano Enterprise', 'enterprise', 29900, 1000, 100, true
WHERE NOT EXISTS (SELECT 1 FROM billing_plans WHERE slug = 'enterprise');

-- 4. Verify what we have
SELECT id, name, slug, is_active, monthly_fee_cents FROM billing_plans;
