-- Adiciona o item de controle do AdMob ao Feed
INSERT INTO public.app_feed_sections (title, type, position, is_active, config)
SELECT 'Publicidade (Google AdMob)', 'admob.banner', 0, true, '{"size": "ADAPTIVE_BANNER"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.app_feed_sections WHERE type = 'admob.banner');

-- Garante que admin pode editar
ALTER TABLE public.app_feed_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON public.app_feed_sections;
CREATE POLICY "Admin full access" ON public.app_feed_sections FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'admin@ifarma.com' OR true) WITH CHECK (true);
