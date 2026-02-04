-- ===============================================================
-- SCRIPT MESTRE DE CORREÇÃO E EVOLUÇÃO (AUDITORIA FINAL)
-- ===============================================================

-- 1. CORREÇÃO DA TABELA DE FARMÁCIAS (Para PartnerRegistration.tsx funcionar)
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS legal_name TEXT,
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS establishment_phone TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT,
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Gratuito',
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS owner_last_name TEXT,
ADD COLUMN IF NOT EXISTS owner_cpf TEXT,
ADD COLUMN IF NOT EXISTS owner_rg TEXT,
ADD COLUMN IF NOT EXISTS owner_rg_issuer TEXT,
ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT false;

-- 2. CRIAÇÃO DA TABELA DE FAVORITOS (Para Favorites.tsx)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    -- Garante que não duplique favorito
    UNIQUE(user_id, product_id),
    UNIQUE(user_id, pharmacy_id)
);

-- RLS Favoritos
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);

-- 3. CRIAÇÃO DA TABELA DE PROMOÇÕES (Para PromotionManagement.tsx)
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pharmacy_id UUID REFERENCES public.pharmacies(id),
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Promoções
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read promotions" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Pharmacies manage promotions" ON public.promotions FOR ALL 
USING (auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = pharmacy_id));

-- 4. CRIAÇÃO DA TABELA DE ANÚNCIOS/BANNERS (Para AdManagement.tsx)
CREATE TABLE IF NOT EXISTS public.ads_banners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT,
    image_url TEXT NOT NULL,
    position TEXT CHECK (position IN ('Topo', 'Meio', 'Base')),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Anúncios (Admin controla)
ALTER TABLE public.ads_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ads" ON public.ads_banners FOR SELECT USING (true);
CREATE POLICY "Admins manage ads" ON public.ads_banners FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 5. REAPLICANDO PERMISSÕES CRÍTICAS DE PEDIDOS (Do fix anterior)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pharmacies can view assigned orders" ON orders;
CREATE POLICY "Pharmacies can view assigned orders" ON orders
    FOR SELECT 
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = orders.pharmacy_id) 
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'motoboy')
    );
