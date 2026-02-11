-- ===============================================
-- FIX DE PERMISSÕES PÚBLICAS (FARMÁCIAS E LOJAS)
-- Execute este script para garantir acesso público
-- ===============================================

-- 1. Farmácias (Público Pode Ler Tudo para Home)
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.pharmacies;
CREATE POLICY "Enable read access for all users" ON public.pharmacies FOR SELECT USING (true);

-- 2. System Settings (Público Pode Ler Configs como AdMob)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read system settings" ON public.system_settings;
CREATE POLICY "Public read system settings" ON public.system_settings FOR SELECT USING (true);

-- 3. App Feed Sections (Já deve estar OK, mas reforçando)
ALTER TABLE public.app_feed_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read feed" ON public.app_feed_sections;
CREATE POLICY "Public read feed" ON public.app_feed_sections FOR SELECT USING (true);

-- 4. Inserir mais configurações do AdMob para controle realtime
INSERT INTO public.system_settings (key, value, description)
VALUES 
('admob_position', 'BOTTOM_CENTER', 'Posição do Banner (TOP_CENTER, BOTTOM_CENTER)'),
('admob_size', 'ADAPTIVE_BANNER', 'Tamanho do Banner (BANNER, LARGE_BANNER, MEDIUM_RECTANGLE, FULL_BANNER, LEADERBOARD, ADAPTIVE_BANNER)')
ON CONFLICT (key) DO NOTHING;
