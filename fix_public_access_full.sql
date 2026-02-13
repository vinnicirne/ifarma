-- =================================================================
-- FIX FINAL DE ACESSO PÚBLICO (ANON) - Baseado no Diagnóstico
-- =================================================================

-- 1. Pharmacies (Home precisa ver lojas aprovadas)
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read approved pharmacies" ON public.pharmacies;
CREATE POLICY "Public read approved pharmacies"
ON public.pharmacies FOR SELECT
TO anon, authenticated
USING (status ILIKE '%aprovado%' OR status ILIKE '%approved%' OR status ILIKE '%active%');

-- 2. App Feed Sections (Home não monta sem isso)
ALTER TABLE public.app_feed_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active feed sections" ON public.app_feed_sections;
CREATE POLICY "Public read active feed sections"
ON public.app_feed_sections FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 3. Categories (Grid de categorias)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active categories" ON public.categories;
CREATE POLICY "Public read active categories"
ON public.categories FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 4. Promotions (Banners)
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active promotions" ON public.promotions;
CREATE POLICY "Public read active promotions"
ON public.promotions FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 5. Ads Campaigns (Se houver)
CREATE TABLE IF NOT EXISTS public.ads_campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    is_active boolean DEFAULT true
);
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active ad campaigns" ON public.ads_campaigns;
CREATE POLICY "Public read active ad campaigns"
ON public.ads_campaigns FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 6. Garantir Dados no Feed (Fallback se estiver vazio)
INSERT INTO public.app_feed_sections (type, title, position, is_active, config)
SELECT 'pharmacy_list.featured', 'Lojas em Destaque', 1, true, '{"limit": 10}'
WHERE NOT EXISTS (SELECT 1 FROM public.app_feed_sections WHERE type = 'pharmacy_list.featured');

INSERT INTO public.app_feed_sections (type, title, position, is_active, config)
SELECT 'pharmacy_list.nearby', 'Perto de Você', 2, true, '{"limit": 20}'
WHERE NOT EXISTS (SELECT 1 FROM public.app_feed_sections WHERE type = 'pharmacy_list.nearby');

-- 7. Diagnóstico Final
SELECT 'Policy Setup Complete' as status;
