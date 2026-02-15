-- STRICT CLEANUP: Enforce ONLY the 3 canonical plans (FREE, PROFESSIONAL, PREMIUM)

-- 1. Update any subscriptions pointing to old plans to point to the new ones (based on price/characteristics)
-- This is a bit risky if we don't know the IDs, but we can try to map by slug/name before deleting.
-- For a dev/staging environment where we just want to fix the registration form, we might just soft-delete or hard-delete if no subscriptions exist.

-- Let's identify the 'keepers' by slug: 'free', 'professional', 'premium'.
-- Any plan with a different slug should be deleted or marked inactive.

-- 1. Ensure the 3 canonical plans exist and are correct
INSERT INTO billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, overage_fixed_fee_cents, block_after_free_limit, is_active)
VALUES
('FREE', 'free', 0, 30, 500, 0, false, true),
('PROFESSIONAL', 'professional', 9900, 100, 300, 0, false, true),
('PREMIUM', 'premium', 19900, 500, 200, 0, false, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    monthly_fee_cents = EXCLUDED.monthly_fee_cents,
    is_active = true;

-- 2. Delete or Deactivate all other plans
-- We'll just Delete them to clean up the UI as requested.
-- Note: This might fail if there are foreign keys (subscriptions). If so, we'll just set is_active = false.
DELETE FROM billing_plans 
WHERE slug NOT IN ('free', 'professional', 'premium');

-- If DELETE fails due to foreign keys, the transaction would rollback. 
-- In that case, we can try to update subscriptions or just set is_active=false.
-- Let's try to set is_active = false for any survivors if the delete fails (using a separate statement in a real console, but here we can't easily do try/catch in one go unless we use a block).

-- Safe fallback: Mark all others as inactive
UPDATE billing_plans 
SET is_active = false 
WHERE slug NOT IN ('free', 'professional', 'premium');
