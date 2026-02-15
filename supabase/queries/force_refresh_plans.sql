-- ============================================================================
-- FIX: Force Refresh Billing Plans Data
-- Description: Updates existing plans to ensure they are visible.
-- ============================================================================

-- 1. Ensure all plans are active
UPDATE billing_plans SET is_active = true;

-- 2. Ensure monthly_fee_cents is valid (non-null)
UPDATE billing_plans SET monthly_fee_cents = 0 WHERE monthly_fee_cents IS NULL;

-- 3. Ensure free_orders_per_period is valid
UPDATE billing_plans SET free_orders_per_period = 0 WHERE free_orders_per_period IS NULL;

-- 4. Ensure overage_percent_bp is valid
UPDATE billing_plans SET overage_percent_bp = 0 WHERE overage_percent_bp IS NULL;

-- 5. List the plans to confirm they exist (User, please check the "Results" tab after running)
SELECT id, name, slug, is_active, monthly_fee_cents FROM billing_plans;
