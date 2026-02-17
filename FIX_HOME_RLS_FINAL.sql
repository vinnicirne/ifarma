-- FIX_HOME_RLS_FINAL.sql (Corrected)
-- This script fixes the RLS policies by ENSURING existing ones are dropped first.

BEGIN;

-- 1. FIX PROMOTIONS (Used in Main Carousel)
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view promotions" ON public.promotions;
DROP POLICY IF EXISTS "Public read promotions" ON public.promotions;
-- Create
CREATE POLICY "Public view promotions" ON public.promotions 
FOR SELECT TO anon, authenticated USING (is_active = true);

-- 2. FIX CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view categories" ON public.categories;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
-- Create
CREATE POLICY "Public view categories" ON public.categories 
FOR SELECT TO anon, authenticated USING (is_active = true);

-- 3. FIX ADS CAMPAIGNS
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view ads" ON public.ads_campaigns;
DROP POLICY IF EXISTS "Public read ads" ON public.ads_campaigns;
-- Create
CREATE POLICY "Public view ads" ON public.ads_campaigns 
FOR SELECT TO anon, authenticated USING (is_active = true);

-- 4. FIX APP FEED SECTIONS
ALTER TABLE public.app_feed_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Feed" ON public.app_feed_sections;
DROP POLICY IF EXISTS "Public read app_feed_sections" ON public.app_feed_sections;
DROP POLICY IF EXISTS "Public read feed" ON public.app_feed_sections;
DROP POLICY IF EXISTS "Public view feed" ON public.app_feed_sections;
-- Create
CREATE POLICY "Public view feed" ON public.app_feed_sections 
FOR SELECT TO anon, authenticated USING (is_active = true);

-- 5. FIX SYSTEM SETTINGS (The one that failed previously)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
DROP POLICY IF EXISTS "Public read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_public_read_maps_key" ON public.system_settings;
DROP POLICY IF EXISTS "Public view settings" ON public.system_settings; -- Added this drop
-- Create
CREATE POLICY "Public view settings" ON public.system_settings 
FOR SELECT TO anon, authenticated USING (true);

-- 6. VERIFY PHARMACIES (Just in case)
DROP POLICY IF EXISTS "Public view approved pharmacies" ON public.pharmacies;
CREATE POLICY "Public view approved pharmacies" ON public.pharmacies 
FOR SELECT TO anon, authenticated 
USING (status ILIKE '%aprov%' OR status ILIKE '%prov%' OR status ILIKE '%activ%' OR status ILIKE '%tiv%');

COMMIT;

SELECT 'Home screen fixed: Promotions, Categories, Feed, Ads, and Settings are now public.' as result;
