-- 1. Tabela de Favoritos de Produtos
CREATE TABLE IF NOT EXISTS public.favorite_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- 2. Tabela de Favoritos de Farmácias
CREATE TABLE IF NOT EXISTS public.favorite_pharmacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, pharmacy_id)
);

-- 3. Tabela de Notificações Dinâmicas
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'informativa', -- 'promo', 'pedido', 'saude'
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Habilitar RLS
ALTER TABLE public.favorite_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Favoritos
CREATE POLICY "Usuários gerenciam seus próprios produtos favoritos" ON public.favorite_products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários gerenciam suas próprias farmácias favoritas" ON public.favorite_pharmacies FOR ALL USING (auth.uid() = user_id);

-- 6. Políticas de Notificações
CREATE POLICY "Usuários veem suas próprias notificações" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam suas notificações (marcar como lida)" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
