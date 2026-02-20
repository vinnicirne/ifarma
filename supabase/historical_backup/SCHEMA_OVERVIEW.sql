-- ============================================
-- IFARMA - Schema Completo Atualizado
-- Data: 2026-01-27
-- Versão: 2.0 (com Carrinho, Pagamentos e Rastreamento)
-- ============================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- 1. TABELA DE PERFIS (Usuários)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    cpf TEXT,
    phone TEXT,
    avatar_url TEXT,
    address TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'merchant', 'motoboy', 'admin')),
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    
    -- Campos para rastreamento de motoboy
    last_lat DOUBLE PRECISION,
    last_lng DOUBLE PRECISION,
    current_order_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE FARMÁCIAS
CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovado', 'Rejeitado')),
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone TEXT,
    email TEXT,
    opening_hours TEXT,
    is_open BOOLEAN DEFAULT true,
    owner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    category TEXT,
    image_url TEXT,
    requires_prescription BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES profiles(id),
    pharmacy_id UUID REFERENCES pharmacies(id),
    motoboy_id UUID REFERENCES profiles(id),
    customer_name TEXT,
    address TEXT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'preparando', 'em_rota', 'entregue', 'cancelado')),
    payment_method TEXT,
    installments INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE ITENS DO PEDIDO
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA DE MENSAGENS DO PEDIDO (Chat)
CREATE TABLE IF NOT EXISTS order_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. TABELA DE ALERTAS DO SISTEMA
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    region TEXT,
    message TEXT NOT NULL,
    phone TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. TABELA DE CARRINHO
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES pharmacies(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(customer_id, product_id)
);

-- 9. TABELA DE CONFIGURAÇÕES DE PAGAMENTO DA FARMÁCIA
CREATE TABLE IF NOT EXISTS pharmacy_payment_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE UNIQUE,
    
    -- Métodos de Pagamento
    accepts_pix BOOLEAN DEFAULT true,
    accepts_cash BOOLEAN DEFAULT true,
    accepts_debit BOOLEAN DEFAULT true,
    accepts_credit BOOLEAN DEFAULT true,
    
    -- Configurações de Parcelamento
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    min_installment_value DECIMAL(10, 2) DEFAULT 50.00,
    max_installments INTEGER DEFAULT 3,
    
    -- PIX
    pix_key TEXT,
    pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. TABELA DE TOKENS DE DISPOSITIVO (Push Notifications)
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT CHECK (device_type IN ('web', 'ios', 'android')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. TABELA DE HISTÓRICO DE ROTA
CREATE TABLE IF NOT EXISTS route_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    motoboy_id UUID REFERENCES profiles(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. TABELA DE AVALIAÇÕES DE ENTREGA
CREATE TABLE IF NOT EXISTS delivery_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    customer_id UUID REFERENCES profiles(id),
    motoboy_id UUID REFERENCES profiles(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_pharmacies_owner ON pharmacies(owner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_pharmacy ON orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_pharmacy ON products(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_order ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_read ON system_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_cart_items_customer ON cart_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_route_history_order ON route_history(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_order ON delivery_ratings(order_id);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pharmacy_payment_settings_updated_at BEFORE UPDATE ON pharmacy_payment_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HABILITAR REALTIME (Supabase)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE system_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE cart_items;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_ratings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS - PROFILES
-- ============================================

DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
CREATE POLICY "Admins podem ver todos os perfis" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- POLÍTICAS RLS - PHARMACIES
-- ============================================

DROP POLICY IF EXISTS "Todos podem ver farmácias aprovadas" ON pharmacies;
CREATE POLICY "Todos podem ver farmácias aprovadas" ON pharmacies
    FOR SELECT USING (status = 'Aprovado' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Lojistas podem atualizar sua farmácia" ON pharmacies;
CREATE POLICY "Lojistas podem atualizar sua farmácia" ON pharmacies
    FOR UPDATE USING (owner_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS - PRODUCTS
-- ============================================

DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON products;
CREATE POLICY "Todos podem ver produtos ativos" ON products
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Lojistas podem gerenciar produtos" ON products;
CREATE POLICY "Lojistas podem gerenciar produtos" ON products
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- POLÍTICAS RLS - CART_ITEMS
-- ============================================

DROP POLICY IF EXISTS "Usuários podem ver seu próprio carrinho" ON cart_items;
CREATE POLICY "Usuários podem ver seu próprio carrinho" ON cart_items
    FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem adicionar ao carrinho" ON cart_items;
CREATE POLICY "Usuários podem adicionar ao carrinho" ON cart_items
    FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem atualizar seu carrinho" ON cart_items;
CREATE POLICY "Usuários podem atualizar seu carrinho" ON cart_items
    FOR UPDATE USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem deletar do carrinho" ON cart_items;
CREATE POLICY "Usuários podem deletar do carrinho" ON cart_items
    FOR DELETE USING (customer_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS - ORDERS
-- ============================================

DROP POLICY IF EXISTS "Clientes podem ver seus próprios pedidos" ON orders;
CREATE POLICY "Clientes podem ver seus próprios pedidos" ON orders
    FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON orders;
CREATE POLICY "Clientes podem criar pedidos" ON orders
    FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Farmácias podem ver pedidos da sua loja" ON orders;
CREATE POLICY "Farmácias podem ver pedidos da sua loja" ON orders
    FOR SELECT USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Farmácias podem atualizar pedidos da sua loja" ON orders;
CREATE POLICY "Farmácias podem atualizar pedidos da sua loja" ON orders
    FOR UPDATE USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Motoboys podem ver pedidos atribuídos" ON orders;
CREATE POLICY "Motoboys podem ver pedidos atribuídos" ON orders
    FOR SELECT USING (motoboy_id = auth.uid());

DROP POLICY IF EXISTS "Admins podem ver todos os pedidos" ON orders;
CREATE POLICY "Admins podem ver todos os pedidos" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- POLÍTICAS RLS - ORDER_ITEMS
-- ============================================

DROP POLICY IF EXISTS "Participantes podem ver itens do pedido" ON order_items;
CREATE POLICY "Participantes podem ver itens do pedido" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_items.order_id
            AND (customer_id = auth.uid() OR motoboy_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Lojistas podem ver itens" ON order_items;
CREATE POLICY "Lojistas podem ver itens" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN pharmacies p ON o.pharmacy_id = p.id
            WHERE o.id = order_items.order_id AND p.owner_id = auth.uid()
        )
    );

-- ============================================
-- POLÍTICAS RLS - ORDER_MESSAGES
-- ============================================

DROP POLICY IF EXISTS "Participantes podem ver mensagens" ON order_messages;
CREATE POLICY "Participantes podem ver mensagens" ON order_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_messages.order_id
            AND (customer_id = auth.uid() OR motoboy_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Participantes podem enviar mensagens" ON order_messages;
CREATE POLICY "Participantes podem enviar mensagens" ON order_messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS - PHARMACY_PAYMENT_SETTINGS
-- ============================================

DROP POLICY IF EXISTS "Todos podem ver configurações de pagamento" ON pharmacy_payment_settings;
CREATE POLICY "Todos podem ver configurações de pagamento" ON pharmacy_payment_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lojistas podem gerenciar configurações" ON pharmacy_payment_settings;
CREATE POLICY "Lojistas podem gerenciar configurações" ON pharmacy_payment_settings
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- POLÍTICAS RLS - DELIVERY_RATINGS
-- ============================================

DROP POLICY IF EXISTS "Clientes podem criar avaliações" ON delivery_ratings;
CREATE POLICY "Clientes podem criar avaliações" ON delivery_ratings
    FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Todos podem ver avaliações" ON delivery_ratings;
CREATE POLICY "Todos podem ver avaliações" ON delivery_ratings
    FOR SELECT USING (true);

-- ============================================
-- POLÍTICAS RLS - SYSTEM_ALERTS
-- ============================================

DROP POLICY IF EXISTS "Admins podem gerenciar alertas" ON system_alerts;
CREATE POLICY "Admins podem gerenciar alertas" ON system_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- POLÍTICAS RLS - DEVICE_TOKENS
-- ============================================

DROP POLICY IF EXISTS "Usuários podem registrar tokens" ON device_tokens;
CREATE POLICY "Usuários podem registrar tokens" ON device_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar tokens" ON device_tokens;
CREATE POLICY "Usuários podem atualizar tokens" ON device_tokens
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar tokens" ON device_tokens;
CREATE POLICY "Usuários podem deletar tokens" ON device_tokens
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Leitura de tokens" ON device_tokens;
CREATE POLICY "Leitura de tokens" ON device_tokens
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.jwt() ->> 'role' = 'service_role'
    );
