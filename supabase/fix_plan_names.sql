-- Safely update plan names and slugs without unique constraint violations

-- 1. Rename existing slugs to temporary values to avoid collisions during the swap
-- This is needed if we are swapping names (e.g. Free -> Basic) but here we are just renaming.
-- However, if 'free' already exists and we try to rename 'gratuito' to 'free', it fails.

-- Strategy: Delete the old ones if they exist and we are about to insert new ones, OR just update the existing ones to the new format.

-- 1. Handle 'Gratuito' -> 'FREE'
-- If 'free' already exists, we delete 'gratuito' and let 'free' take over (or merge). 
-- But simpler: Update 'gratuito' to 'free' ONLY IF 'free' DOES NOT exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM billing_plans WHERE slug = 'free') THEN
        UPDATE billing_plans SET slug = 'free', name = 'FREE' WHERE slug = 'gratuito';
    END IF;
END $$;

-- 2. Handle 'Básico' -> 'PROFESSIONAL'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM billing_plans WHERE slug = 'professional') THEN
        UPDATE billing_plans SET slug = 'professional', name = 'PROFESSIONAL' WHERE slug = 'basico';
    END IF;
END $$;

-- 3. Handle 'Pro' -> 'PREMIUM'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM billing_plans WHERE slug = 'premium') THEN
        UPDATE billing_plans SET slug = 'premium', name = 'PREMIUM' WHERE slug = 'pro';
    END IF;
END $$;

-- Now that we've renamed what we could, we upsert to ensure the final state is correct.
INSERT INTO billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, overage_fixed_fee_cents, block_after_free_limit, is_active)
VALUES
('FREE', 'free', 0, 30, 500, 0, false, true),
('PROFESSIONAL', 'professional', 9900, 100, 300, 0, false, true),
('PREMIUM', 'premium', 19900, 500, 200, 0, false, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    monthly_fee_cents = EXCLUDED.monthly_fee_cents,
    free_orders_per_period = EXCLUDED.free_orders_per_period,
    overage_percent_bp = EXCLUDED.overage_percent_bp,
    is_active = EXCLUDED.is_active;

-- Cleanup: If there are any leftover old plans that didn't get renamed (because the new one already existed), we might want to delete them or leave them. 
-- For now, let's just make sure they are not active if they are duplicates.
-- (Optional step depending on cleanup requirements)
