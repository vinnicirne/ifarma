-- ===============================================================
-- SCRIPT MESTRE DE ATUALIZAÇÃO FINAL DO BANCO DE DADOS
-- Este script consolida TODAS as correções pendentes (Chat, Pedidos, Perfis e Automação)
-- ===============================================================

BEGIN;

-- 1. ESTRUTURA DE FARMÁCIAS (CNPJ, Dados Legais e Automação de Mensagens)
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
ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_message_accept_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_message_accept_text TEXT DEFAULT 'Olá! Recebemos seu pedido e já estamos preparando.',
ADD COLUMN IF NOT EXISTS auto_message_cancel_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_message_cancel_text TEXT DEFAULT 'Infelizmente tivemos que cancelar seu pedido por um motivo de força maior. Entre em contato para mais detalhes.';

-- 2. AJUSTES NA TABELA DE PEDIDOS (Orders)
-- Adiciona coluna de quem recebeu e troco
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10, 2);

-- Corrigir Constraint de Status (Adicionando status modernos do app)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'pendente',           -- Aguardando farmácia
    'preparando',         -- Em separação
    'aguardando_motoboy', -- No pool de entregadores
    'pronto_entrega',     -- Aguardando retirada pelo motoboy escalado
    'retirado',           -- Motoboy já pegou o produto
    'em_rota',            -- Entregador a caminho do cliente
    'entregue',           -- Finalizado
    'cancelado',          -- Cancelado
    'aguardando_retirada' -- Status auxiliar
));

-- 3. AJUSTES NO CHAT (Order Messages)
ALTER TABLE public.order_messages 
ADD COLUMN IF NOT EXISTS sender_role TEXT,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 4. TELEMETRIA NO PERFIL DO MOTOBOY
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS battery_level INTEGER,
ADD COLUMN IF NOT EXISTS is_charging BOOLEAN,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE;

-- 5. REPARAÇÃO DE PERFIS ÓRFÃOS E TRIGGER DE AUTOCREATE
-- Inserir perfis faltantes
INSERT INTO public.profiles (id, email, role, is_active)
SELECT id, email, COALESCE(raw_user_meta_data->>'role', 'customer'), true
FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Garantir Trigger de Autocriação de Perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    true
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 6. NOVAS TABELAS DE SUPORTE (Se não existirem)

-- Tabela de Favoritos
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, product_id),
    UNIQUE(user_id, pharmacy_id)
);

-- Tabela de Promoções
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

-- Tabela de Configurações de Pagamento por Farmácia
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

-- Configurações padrão para farmácias existentes
INSERT INTO public.pharmacy_payment_settings (pharmacy_id)
SELECT id FROM public.pharmacies
WHERE id NOT IN (SELECT pharmacy_id FROM public.pharmacy_payment_settings)
ON CONFLICT DO NOTHING;


-- 6. POLÍTICAS DE SEGURANÇA (RLS) - REFORÇO FINAL

-- Chat (Acesso para cliente, motoboy e DONO da farmácia)
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participantes podem ver mensagens" ON public.order_messages;
CREATE POLICY "Participantes podem ver mensagens" ON public.order_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        LEFT JOIN public.pharmacies p ON o.pharmacy_id = p.id
        WHERE o.id = order_messages.order_id
        AND (
            o.customer_id = auth.uid() 
            OR o.motoboy_id = auth.uid()
            OR p.owner_id = auth.uid()
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

DROP POLICY IF EXISTS "Users can insert messages to their orders" ON public.order_messages;
CREATE POLICY "Users can insert messages to their orders" 
ON public.order_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Favoritos
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.favorites TO authenticated;
DROP POLICY IF EXISTS "Users manage their favorites" ON public.favorites;
CREATE POLICY "Users manage their favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);

-- Endereços (User Addresses)
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_addresses TO authenticated;
DROP POLICY IF EXISTS "Users manage their own addresses" ON public.user_addresses;
CREATE POLICY "Users manage their own addresses" ON public.user_addresses
    FOR ALL USING (auth.uid() = user_id);

-- Promoções
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.promotions TO anon, authenticated;
DROP POLICY IF EXISTS "Public read promotions" ON public.promotions;
CREATE POLICY "Public read promotions" ON public.promotions FOR SELECT USING (true);


COMMIT;

-- Notificar recarregamento do schema para o PostgREST
NOTIFY pgrst, 'reload schema';
