-- ============================================
-- FIX: Remove Feed Duplicates & Restore AdMob
-- ============================================

-- 1. LIMPAR TODAS AS SEÇÕES EXISTENTES
DELETE FROM public.app_feed_sections;

-- 2. INSERIR SEÇÕES CORRETAS (SEM DUPLICATAS)
INSERT INTO public.app_feed_sections (title, type, position, is_active, config) VALUES
('Destaques da Semana', 'banner.top', 1, true, '{"images": []}'),
('Publicidade (Google AdMob)', 'admob.banner', 2, true, '{}'),
('Categorias', 'category_grid', 3, true, '{"limit": 10}'),
('Ofertas Especiais', 'pharmacy_list.bonus', 4, true, '{"limit": 5}'),
('Perto de Você', 'pharmacy_list.nearby', 5, true, '{"limit": 5}'),
('Farmácias em Destaque', 'pharmacy_list.featured', 6, true, '{"limit": 5}');

-- 3. VERIFICAR RESULTADO
SELECT 
    position,
    title,
    type,
    is_active,
    config
FROM public.app_feed_sections
ORDER BY position;
