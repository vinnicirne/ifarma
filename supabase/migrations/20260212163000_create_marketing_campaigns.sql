-- ============================================
-- MARKETING CAMPAIGNS - SCHEMA & RLS
-- ============================================

-- 0. Helper Function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Create Table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    target_audience TEXT DEFAULT 'all', -- 'all', 'inactive_30d', 'all_android', etc.
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Policy: Admins can do everything
DROP POLICY IF EXISTS "Admins can manage campaigns" ON marketing_campaigns;
CREATE POLICY "Admins can manage campaigns" ON marketing_campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Service Role (Edge Functions) can read/update campaigns
DROP POLICY IF EXISTS "Service role can manage campaigns" ON marketing_campaigns;
CREATE POLICY "Service role can manage campaigns" ON marketing_campaigns
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- 4. Create Trigger for updated_at
DROP TRIGGER IF EXISTS update_marketing_campaigns_updated_at ON marketing_campaigns;
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
