-- ==========================================
-- SCRIPT DE CORREÇÃO TOTAL (FEED + RLS + STATUS)
-- ==========================================

-- 1. Garantir que a tabela de seções do feed existe
CREATE TABLE IF NOT EXISTS public.app_feed_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL, -- 'pharmacy_list.featured', 'pharmacy_list.nearby', 'admob.banner'
    title text,
    position integer DEFAULT 0,
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 2. Habilitar RLS e garantir acesso público ao FEED
ALTER TABLE public.app_feed_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Feed" ON public.app_feed_sections;
CREATE POLICY "Public Read Feed" 
ON public.app_feed_sections FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- 3. Popular o Feed se estiver vazio
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.app_feed_sections) THEN
        INSERT INTO public.app_feed_sections (type, title, position, is_active, config)
        VALUES 
            ('pharmacy_list.featured', 'Lojas em Destaque', 1, true, '{"limit": 10}'),
            ('pharmacy_list.nearby', 'Perto de Você', 2, true, '{"limit": 20}');
    END IF;
END $$;

-- 4. Garantir acesso público às FARMÁCIAS (RLS)
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Pharmacies" ON public.pharmacies;
CREATE POLICY "Public Read Pharmacies" 
ON public.pharmacies FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- 5. Normalizar Status das Farmácias para 'Aprovado' (Padronização)
-- Isso garante que valores como 'approved', 'APROVADO', 'Ativo' virem 'Aprovado' oficial.
UPDATE public.pharmacies
SET status = 'Aprovado'
WHERE status ILIKE '%aprovado%' OR status ILIKE '%approved%' OR status ILIKE '%active%';

-- Confirmação
SELECT 'FIX COMPLETO REALIZADO' as status, count(*) as farmacias_aprovadas FROM public.pharmacies WHERE status = 'Aprovado';
SELECT * FROM public.app_feed_sections ORDER BY position;
