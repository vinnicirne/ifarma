-- ============================================================================
-- MIGRATION: RBAC for Billing and Staff Management
-- Description: Adds 'role' to profiles, creates 'pharmacy_staff' table, and ensures single active subscription.
-- ============================================================================

-- 1. Add Global Role to Profiles (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT CHECK (role IN ('admin', 'user')) DEFAULT 'user';
    END IF;
END $$;

-- 2. Create Pharmacy Staff Table (if not exists)
CREATE TABLE IF NOT EXISTS pharmacy_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'manager', 'billing', 'staff')) DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pharmacy_id, user_id)
);

-- 3. Enable RLS on Pharmacy Staff
ALTER TABLE pharmacy_staff ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Global Admins can do everything
CREATE POLICY "Admins can manage all staff" ON pharmacy_staff
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. RLS Policy: Owners can manage their staff
CREATE POLICY "Owners can manage their staff" ON pharmacy_staff
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM pharmacies 
            WHERE id = pharmacy_staff.pharmacy_id 
            AND owner_id = auth.uid()
        )
    );

-- 6. RLS Policy: Users can view their own staffing
CREATE POLICY "Users can view their own allocations" ON pharmacy_staff
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());


-- 7. Ensure Single Active Subscription Constraint
-- (First, clean up any duplicates just in case)
UPDATE pharmacy_subscriptions 
SET status = 'canceled', ended_at = now() 
WHERE status = 'active' 
AND id NOT IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY pharmacy_id ORDER BY created_at DESC) as rn
        FROM pharmacy_subscriptions 
        WHERE status = 'active'
    ) t WHERE rn = 1
);

-- Now add the index if not exists
CREATE UNIQUE INDEX IF NOT EXISTS one_active_sub_per_pharmacy 
ON pharmacy_subscriptions (pharmacy_id) 
WHERE (status = 'active');
