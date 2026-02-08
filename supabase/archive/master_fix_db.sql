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

-- Permissões e RLS para Farmácias (CRÍTICO para o Painel funcionar)
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.pharmacies TO authenticated;
GRANT ALL ON public.pharmacies TO service_role;
GRANT SELECT ON public.pharmacies TO anon;

DROP POLICY IF EXISTS "Public view pharmacies" ON public.pharmacies;
CREATE POLICY "Public view pharmacies" ON public.pharmacies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners update their pharmacy" ON public.pharmacies;
CREATE POLICY "Owners update their pharmacy" ON public.pharmacies 
FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners insert their pharmacy" ON public.pharmacies;
CREATE POLICY "Owners insert their pharmacy" ON public.pharmacies 
FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 2. CRIAÇÃO DA TABELA DE FAVORITOS (Para Favorites.tsx)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, product_id),
    UNIQUE(user_id, pharmacy_id)
);

-- Permissões e RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

DROP POLICY IF EXISTS "Users manage their favorites" ON public.favorites;
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

-- Permissões e RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
GRANT SELECT ON public.promotions TO anon; -- Público pode ver

DROP POLICY IF EXISTS "Public read promotions" ON public.promotions;
CREATE POLICY "Public read promotions" ON public.promotions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Pharmacies manage promotions" ON public.promotions;
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

-- Permissões e RLS
ALTER TABLE public.ads_banners ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ads_banners TO authenticated;
GRANT ALL ON public.ads_banners TO service_role;
GRANT SELECT ON public.ads_banners TO anon; -- Público pode ver

DROP POLICY IF EXISTS "Public read ads" ON public.ads_banners;
CREATE POLICY "Public read ads" ON public.ads_banners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage ads" ON public.ads_banners;
CREATE POLICY "Admins manage ads" ON public.ads_banners FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 5. REAPLICANDO PERMISSÕES CRÍTICAS DE PEDIDOS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- Garantir permissões básicas na tabela orders também (caso tenha perdido)
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

DROP POLICY IF EXISTS "Pharmacies can view assigned orders" ON orders;
CREATE POLICY "Pharmacies can view assigned orders" ON orders
    FOR SELECT 
    USING (
        auth.uid() IN (SELECT owner_id FROM pharmacies WHERE id = orders.pharmacy_id) 
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'motoboy')
    );

-- 6. CRIAÇÃO DA TABELA DE ENDEREÇOS DO USUÁRIO (Correção UserProfile e Checkout)
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT, -- Apelido: Casa, Trabalho
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permissões e RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_addresses TO authenticated;
GRANT ALL ON public.user_addresses TO service_role;

DROP POLICY IF EXISTS "Usuários veem seus próprios endereços" ON public.user_addresses;
CREATE POLICY "Usuários veem seus próprios endereços" 
ON public.user_addresses FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários salvam seus endereços" ON public.user_addresses;
CREATE POLICY "Usuários salvam seus endereços" 
ON public.user_addresses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários editam seus endereços" ON public.user_addresses;
CREATE POLICY "Usuários editam seus endereços" 
ON public.user_addresses FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários apagam seus endereços" ON public.user_addresses;
CREATE POLICY "Usuários apagam seus endereços" 
ON public.user_addresses FOR DELETE 
USING (auth.uid() = user_id);

-- 7. CORREÇÃO DE PAGAMENTOS (Para Checkout.tsx funcionar)
CREATE TABLE IF NOT EXISTS public.pharmacy_payment_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    accepts_pix BOOLEAN DEFAULT true,
    accepts_cash BOOLEAN DEFAULT true,
    accepts_credit BOOLEAN DEFAULT true,
    accepts_debit BOOLEAN DEFAULT true,
    min_order_value DECIMAL(10,2) DEFAULT 0.00,
    min_installment_value DECIMAL(10,2) DEFAULT 10.00,
    max_installments INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(pharmacy_id)
);

-- Inserir configurações padrão para TODAS as farmácias que não têm (Resolve o erro 406)
INSERT INTO public.pharmacy_payment_settings (pharmacy_id)
SELECT id FROM public.pharmacies
WHERE id NOT IN (SELECT pharmacy_id FROM public.pharmacy_payment_settings);

-- Permissões
ALTER TABLE public.pharmacy_payment_settings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.pharmacy_payment_settings TO authenticated;
GRANT ALL ON public.pharmacy_payment_settings TO service_role;
GRANT SELECT ON public.pharmacy_payment_settings TO anon;

DROP POLICY IF EXISTS "Public read payment settings" ON public.pharmacy_payment_settings;
CREATE POLICY "Public read payment settings" 
ON public.pharmacy_payment_settings FOR SELECT 
USING (true);
