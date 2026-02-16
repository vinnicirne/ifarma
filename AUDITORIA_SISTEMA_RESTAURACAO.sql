-- =====================================================
-- IFARMA - PATCH RESTAURAÇÃO COMPLETA DO SISTEMA
-- Descrição: Criação de tabelas faltantes e correção de campos
-- =====================================================

BEGIN;

-- 1. Restauração de PROMOTIONS
-- Garantir campos esperados pelo frontend
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Tabela de Participantes das Promoções
CREATE TABLE IF NOT EXISTS public.promotion_participants (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(promotion_id, pharmacy_id)
);

-- 3. Tabelas de ADS (Anúncios Patrocinados)
CREATE TABLE IF NOT EXISTS public.ads_campaigns (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    destination_type TEXT DEFAULT 'store', -- store, external
    destination_id TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    region_id TEXT DEFAULT 'global',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ads_metrics (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    campaign_id UUID REFERENCES public.ads_campaigns(id) ON DELETE CASCADE UNIQUE,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de COLEÇÕES (Dor e Febre, Infantil, etc)
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'symptom', -- symptom, audience, campaign, seasonality
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Atualização de CATEGORIES
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 6. Configuração de Storage Buckets
-- Bucket para Ads
INSERT INTO storage.buckets (id, name, public)
VALUES ('ads-banners', 'ads-banners', true)
ON CONFLICT (id) DO NOTHING;

-- 7. RLS e Políticas de Segurança
ALTER TABLE public.promotion_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Políticas Unificadas Staff
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['promotion_participants', 'ads_campaigns', 'ads_metrics', 'collections', 'promotions'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Staff manage %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Staff manage %I" ON public.%I FOR ALL USING (public.is_staff())', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Public read %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Public read %I" ON public.%I FOR SELECT USING (true)', t, t);
    END LOOP;
END $$;

-- Políticas de Storage para Ads
DROP POLICY IF EXISTS "Public access for ads-banners" ON storage.objects;
CREATE POLICY "Public access for ads-banners" ON storage.objects FOR SELECT TO public USING (bucket_id = 'ads-banners');

DROP POLICY IF EXISTS "Staff manage ads-banners" ON storage.objects;
CREATE POLICY "Staff manage ads-banners" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'ads-banners') WITH CHECK (bucket_id = 'ads-banners');

COMMIT;
