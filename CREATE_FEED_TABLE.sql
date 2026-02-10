-- ============================================
-- CRIAÇÃO DA TABELA DE FEED DO APP
-- Permite configurar a Home dinamicamente
-- ============================================

-- 1. Tabela app_feed_sections
CREATE TABLE IF NOT EXISTS public.app_feed_sections (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text,
    type text NOT NULL, -- 'banner.top', 'pharmacy_list.featured', 'category_grid', 'pharmacy_list.bonus', 'pharmacy_list.nearby'
    position integer DEFAULT 0,
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb, -- { "images": ["url1"], "title_color": "#fff", "limit": 5 }
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Segurança (RLS)
ALTER TABLE public.app_feed_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read feed" ON public.app_feed_sections;
CREATE POLICY "Public read feed" ON public.app_feed_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage feed" ON public.app_feed_sections;
CREATE POLICY "Admin manage feed" ON public.app_feed_sections FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 3. Storage para Banners
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies do Storage (Simplificadas)
DROP POLICY IF EXISTS "Public Select app-assets" ON storage.objects;
CREATE POLICY "Public Select app-assets" ON storage.objects FOR SELECT USING (bucket_id = 'app-assets');

DROP POLICY IF EXISTS "Admin All app-assets" ON storage.objects;
CREATE POLICY "Admin All app-assets" ON storage.objects FOR ALL USING (
    bucket_id = 'app-assets' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Dados Iniciais (Apenas se tabela vazia)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.app_feed_sections) THEN
        INSERT INTO public.app_feed_sections (title, type, position, config)
        VALUES 
        ('Destaques da Semana', 'banner.top', 0, '{"images": []}'),
        ('Farmácias em Destaque', 'pharmacy_list.featured', 1, '{"limit": 5}'),
        ('Categorias', 'category_grid', 2, '{}'),
        ('Ofertas Especiais', 'pharmacy_list.bonus', 3, '{"limit": 5}'),
        ('Perto de Você', 'pharmacy_list.nearby', 4, '{"limit": 10}');
    END IF;
END $$;
