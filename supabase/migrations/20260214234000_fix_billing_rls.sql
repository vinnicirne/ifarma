-- ============================================================================
-- FIX: Billing RLS Policies
-- Description: Ensures pharmacies can read their own subscriptions and invoices
-- ============================================================================

-- 1. Enable RLS on billing tables if not enabled
ALTER TABLE pharmacy_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;

-- 2. Create/Update Policies for Subscriptions
DROP POLICY IF EXISTS "Pharmacy owners view own subscriptions" ON pharmacy_subscriptions;
CREATE POLICY "Pharmacy owners view own subscriptions" ON pharmacy_subscriptions
    FOR SELECT
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id)
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND pharmacy_id = pharmacy_subscriptions.pharmacy_id
        )
    );

-- 3. Create/Update Policies for Invoices
DROP POLICY IF EXISTS "Pharmacy owners view own invoices" ON billing_invoices;
CREATE POLICY "Pharmacy owners view own invoices" ON billing_invoices
    FOR SELECT
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id)
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND pharmacy_id = billing_invoices.pharmacy_id
        )
    );

-- 4. Create/Update Policies for Cycles
DROP POLICY IF EXISTS "Pharmacy owners view own cycles" ON billing_cycles;
CREATE POLICY "Pharmacy owners view own cycles" ON billing_cycles
    FOR SELECT
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id)
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND pharmacy_id = billing_cycles.pharmacy_id
        )
    );
