-- Update existing plans to match new naming convention
-- We update based on monthly fee to guess which is which, or we can truncate and re-seed if safe.
-- Assuming:
-- Gratuito -> FREE
-- Básico -> PROFESSIONAL
-- Pro -> PREMIUM

-- First, let's try to update existing ones to preserve IDs if possible, or just insert new ones.

-- 1. FREE (was Gratuito)
UPDATE billing_plans
SET name = 'FREE', slug = 'free', monthly_fee_cents = 0
WHERE slug = 'gratuito' OR monthly_fee_cents = 0;

-- 2. PROFESSIONAL (was Básico - intermediate)
UPDATE billing_plans
SET name = 'PROFESSIONAL', slug = 'professional', monthly_fee_cents = 9900
WHERE slug = 'basico' OR (monthly_fee_cents > 0 AND monthly_fee_cents < 15000);

-- 3. PREMIUM (was Pro - expensive)
UPDATE billing_plans
SET name = 'PREMIUM', slug = 'premium', monthly_fee_cents = 19900
WHERE slug = 'pro' OR monthly_fee_cents >= 15000;

-- Insert if they didn't exist
INSERT INTO billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, overage_fixed_fee_cents, block_after_free_limit, is_active)
VALUES
('FREE', 'free', 0, 30, 500, 0, false, true),
('PROFESSIONAL', 'professional', 9900, 100, 300, 0, false, true),
('PREMIUM', 'premium', 19900, 500, 200, 0, false, true)
ON CONFLICT (slug) DO NOTHING;
