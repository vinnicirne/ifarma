-- ===============================================
-- SETUP FINAL - IFARMA (RANKING + FEED + ADMOB)
-- Execute este script para garantir todas as tabelas
-- ===============================================

-- 1. RANKING INTELIGENTE (iFood Style)
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS sla_score NUMERIC DEFAULT 100;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS delivery_time_min INT DEFAULT 30;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS delivery_time_max INT DEFAULT 60;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pharmacies_sla_score ON public.pharmacies(sla_score);
CREATE INDEX IF NOT EXISTS idx_pharmacies_delivery_time_min ON public.pharmacies(delivery_time_min);
CREATE INDEX IF NOT EXISTS idx_pharmacies_is_sponsored ON public.pharmacies(is_sponsored);

-- 2. FEED DINÂMICO (Server-Driven UI)
CREATE TABLE IF NOT EXISTS public.app_feed_sections (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text,
    type text NOT NULL,
    position integer DEFAULT 0,
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Feed
ALTER TABLE public.app_feed_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read feed" ON public.app_feed_sections;
CREATE POLICY "Public read feed" ON public.app_feed_sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage feed" ON public.app_feed_sections;
CREATE POLICY "Admin manage feed" ON public.app_feed_sections FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Semente Inicial do Feed (Se Vazio)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.app_feed_sections) THEN
        INSERT INTO public.app_feed_sections (title, type, position, config)
        VALUES 
        ('Destaques da Semana', 'banner.top', 0, '{"images": []}'),
        ('Farmácias em Destaque', 'pharmacy_list.featured', 1, '{"limit": 5}'),
        ('Categorias', 'category_grid', 2, '{"limit": 4}'),
        ('Seleção Especial', 'pharmacy_list.bonus', 3, '{"limit": 5}'),
        ('Perto de Você', 'pharmacy_list.nearby', 4, '{"limit": 10}');
    END IF;
END $$;

-- 3. STORAGE (Banners)
INSERT INTO storage.buckets (id, name, public) VALUES ('app-assets', 'app-assets', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Select app-assets" ON storage.objects;
CREATE POLICY "Public Select app-assets" ON storage.objects FOR SELECT USING (bucket_id = 'app-assets');
DROP POLICY IF EXISTS "Admin Insert app-assets" ON storage.objects;
CREATE POLICY "Admin Insert app-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'app-assets' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 4. ADMOB (Settings)
INSERT INTO public.system_settings (key, value, description)
VALUES 
('admob_enabled', 'true', 'Ativar anúncios AdMob'),
('admob_app_id_android', 'ca-app-pub-3940256099942544~3347511713', 'AdMob App ID (Android)'),
('admob_banner_id_android', 'ca-app-pub-3940256099942544/6300978111', 'AdMob Banner Unit ID (Android)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
