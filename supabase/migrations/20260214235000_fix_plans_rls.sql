-- ============================================================================
-- FIX: Billing Plans RLS
-- Description: Ensures billing_plans are visible to authenticated users.
--              The previous scripts might have enabled RLS but not added a SELECT policy.
-- ============================================================================

-- 1. Enable RLS (just in case)
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;

-- 2. Allow everyone (authenticated) to view plans
--    We can refine this later if needed, but for now, plans are public info for logged users.
DROP POLICY IF EXISTS "Authenticated users can view plans" ON billing_plans;
CREATE POLICY "Authenticated users can view plans" ON billing_plans
    FOR SELECT
    TO authenticated
    USING (true);
