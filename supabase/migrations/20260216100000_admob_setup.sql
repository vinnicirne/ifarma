-- ============================================================================
-- SETUP ADMOB: Garante configuração e seção de feed para anúncios
-- Execute se os anúncios não aparecerem no APK
-- ============================================================================

-- 1. System Settings (admob_enabled, IDs)
INSERT INTO public.system_settings (key, value, description)
VALUES
    ('admob_enabled', 'true', 'Ativar anúncios AdMob (true/false)'),
    ('admob_app_id_android', 'ca-app-pub-3940256099942544~3347511713', 'AdMob App ID Android - usar IDs de teste em dev'),
    ('admob_banner_id_android', 'ca-app-pub-3940256099942544/6300978111', 'AdMob Banner Unit ID Android')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- 2. Seção admob.banner no Feed (se não existir)
INSERT INTO public.app_feed_sections (title, type, position, is_active, config)
SELECT 'Publicidade (AdMob)', 'admob.banner', 7, true, '{"size": "ADAPTIVE_BANNER"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.app_feed_sections WHERE type = 'admob.banner');
