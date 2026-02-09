-- ==========================================================
-- FIX SYSTEM SETTINGS PERMISSIONS (RLS)
-- Executar no Editor SQL do Supabase
-- ==========================================================

-- 1. Ensure system_settings table exists with correct structure
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value text,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.system_settings;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Public read access" ON public.system_settings;
DROP POLICY IF EXISTS "System settings are viewable by everyone" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can insert system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_settings;

-- 4. Create comprehensive policies

-- Public Read Access: Everyone (even unauthenticated, if needed for login page etc) needs to read settings
CREATE POLICY "System settings are viewable by everyone"
ON public.system_settings
FOR SELECT
USING (true);

-- Admin Write Access: Only admins can Insert/Update/Delete
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 5. Insert Default AdMob Settings if they don't exist (Optional, but good for initialization)
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('admob_enabled', 'false', 'Enable/Disable AdMob Ads'),
    ('admob_app_id_android', '', 'AdMob App ID for Android'),
    ('admob_banner_id_android', '', 'AdMob Banner ID for Android'),
    ('admob_interstitial_id_android', '', 'AdMob Interstitial ID for Android')
ON CONFLICT (key) DO NOTHING;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
