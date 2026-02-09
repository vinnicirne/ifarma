-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Promotions (Campaigns) Table
CREATE TABLE IF NOT EXISTS promotions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Promotion Participants Table (Many-to-Many for Stores)
CREATE TABLE IF NOT EXISTS promotion_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(promotion_id, pharmacy_id)
);

-- RLS Policies

-- Categories: Public read, Admin write
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" 
ON categories FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
CREATE POLICY "Admins can insert categories" 
ON categories FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can update categories" ON categories;
CREATE POLICY "Admins can update categories" 
ON categories FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
CREATE POLICY "Admins can delete categories" 
ON categories FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Promotions: Public read (active), Admin all, Pharmacy partial
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Promotions viewable by everyone" ON promotions;
CREATE POLICY "Promotions viewable by everyone" 
ON promotions FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;
CREATE POLICY "Admins can manage promotions" 
ON promotions FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Promotion Participants
ALTER TABLE promotion_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants viewable by involved parties" ON promotion_participants;
CREATE POLICY "Participants viewable by involved parties" 
ON promotion_participants FOR SELECT 
USING (
    -- Admin
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR
    -- Pharmacy Owner
    EXISTS (
        SELECT 1 FROM pharmacies
        WHERE pharmacies.id = promotion_participants.pharmacy_id
        AND pharmacies.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admins can manage participants" ON promotion_participants;
CREATE POLICY "Admins can manage participants" 
ON promotion_participants FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Pharmacies can join/leave" ON promotion_participants;
CREATE POLICY "Pharmacies can join/leave" 
ON promotion_participants FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM pharmacies
        WHERE pharmacies.id = pharmacy_id
        AND pharmacies.owner_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Pharmacies can update their status" ON promotion_participants;
CREATE POLICY "Pharmacies can update their status" 
ON promotion_participants FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM pharmacies
        WHERE pharmacies.id = pharmacy_id
        AND pharmacies.owner_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- FORCE SCHEMA CACHE RELOAD
NOTIFY pgrst, 'reload schema';
