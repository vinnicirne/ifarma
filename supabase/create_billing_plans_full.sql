-- Create billing_plans table
CREATE TABLE IF NOT EXISTS billing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    monthly_fee_cents INTEGER NOT NULL DEFAULT 0,
    free_orders_per_period INTEGER NOT NULL DEFAULT 0,
    overage_percent_bp INTEGER NOT NULL DEFAULT 0, -- Basis points (e.g., 500 = 5%)
    overage_fixed_fee_cents INTEGER DEFAULT 0,
    block_after_free_limit BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on billing_plans
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active plans (Public access for registration)
DROP POLICY IF EXISTS "Public can view active plans" ON billing_plans;
CREATE POLICY "Public can view active plans" ON billing_plans
    FOR SELECT
    USING (is_active = true);

-- Policy: Only service_role can modify plans
DROP POLICY IF EXISTS "Service role can manage plans" ON billing_plans;
CREATE POLICY "Service role can manage plans" ON billing_plans
    USING (auth.role() = 'service_role');


-- Create pharmacy_subscriptions table
CREATE TABLE IF NOT EXISTS pharmacy_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id),
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    asaas_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'overdue', 'canceled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    next_billing_date TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on pharmacy_subscriptions
ALTER TABLE pharmacy_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert (for registration)
DROP POLICY IF EXISTS "Public can create subscriptions" ON pharmacy_subscriptions;
CREATE POLICY "Public can create subscriptions" ON pharmacy_subscriptions
    FOR INSERT
    WITH CHECK (true);

-- Policy: Pharmacy owners can view their own subscription
-- Assumes pharmacies table has owner_id and we can join or checking logic via app
-- For now, kept simple or relying on service_role for backend logic
-- This is a simplification; in production, strict checks on auth.uid() vs pharmacy.owner_id needed.


-- Seed Data
INSERT INTO billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, overage_fixed_fee_cents, block_after_free_limit, is_active)
VALUES
('Gratuito', 'gratuito', 0, 30, 500, 0, false, true),
('Básico', 'basico', 9900, 100, 300, 0, false, true),
('Pro', 'pro', 19900, 500, 200, 0, false, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    monthly_fee_cents = EXCLUDED.monthly_fee_cents,
    free_orders_per_period = EXCLUDED.free_orders_per_period,
    overage_percent_bp = EXCLUDED.overage_percent_bp,
    is_active = EXCLUDED.is_active;
