-- FIX_HOME_RLS.sql
-- The Home Screen crashes if these tables are locked. 
-- We must allow public read access (SELECT) for everyone (anon + authenticated).

BEGIN;

-- 1. App Feed Sections
ALTER TABLE public.app_feed_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view feed" ON public.app_feed_sections;
CREATE POLICY "Public view feed" ON public.app_feed_sections 
FOR SELECT TO anon, authenticated USING (is_active = true);

-- 2. Banners (Promotions Carousel)
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY; -- Might be 'promotions' or 'banners', checking both just in case
DROP POLICY IF EXISTS "Public view banners" ON public.banners;
CREATE POLICY "Public view banners" ON public.banners 
FOR SELECT TO anon, authenticated USING (is_active = true);

-- 3. Categories (Grid)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view categories" ON public.categories;
CREATE POLICY "Public view categories" ON public.categories 
FOR SELECT TO anon, authenticated USING (is_active = true);

-- 4. Ads Campaigns (Internal Ads)
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view ads" ON public.ads_campaigns;
CREATE POLICY "Public view ads" ON public.ads_campaigns 
FOR SELECT TO anon, authenticated USING (is_active = true);

COMMIT;

SELECT 'Home screen permissions fixed' as result;
