-- Create billing_plans table
CREATE TABLE IF NOT EXISTS public.billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active plans (Public access for registration)
DROP POLICY IF EXISTS "Public can view active plans" ON public.billing_plans;
CREATE POLICY "Public can view active plans" ON public.billing_plans
    FOR SELECT
    USING (is_active = true);

-- Policy: Admins and Operators can manage plans
DROP POLICY IF EXISTS "Admins can manage plans" ON public.billing_plans;
CREATE POLICY "Admins can manage plans" ON public.billing_plans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'operator')
        )
    );

-- Seed Data (Insert verify existence to avoid duplicates if partial run)
INSERT INTO public.billing_plans (name, slug, monthly_fee_cents, free_orders_per_period, overage_percent_bp, overage_fixed_fee_cents, block_after_free_limit, is_active)
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
