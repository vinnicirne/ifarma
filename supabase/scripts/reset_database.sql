-- ============================================
-- IFARMA - RESET COMPLETO DO BANCO DE DADOS
-- ⚠️ ATENÇÃO: Este script APAGA TODOS OS DADOS!
-- Use apenas em desenvolvimento ou para reset completo
-- Data: 2026-01-27
-- Versão: 2.0
-- ============================================

-- ============================================
-- PARTE 1: DROPAR TUDO (ordem reversa de dependências)
-- ============================================

-- Dropar políticas RLS primeiro
DROP POLICY IF EXISTS "Admins podem gerenciar alertas" ON system_alerts;
DROP POLICY IF EXISTS "Todos podem ver avaliações" ON delivery_ratings;
DROP POLICY IF EXISTS "Clientes podem criar avaliações" ON delivery_ratings;
DROP POLICY IF EXISTS "Lojistas podem gerenciar configurações" ON pharmacy_payment_settings;
DROP POLICY IF EXISTS "Todos podem ver configurações de pagamento" ON pharmacy_payment_settings;
DROP POLICY IF EXISTS "Participantes podem enviar mensagens" ON order_messages;
DROP POLICY IF EXISTS "Participantes podem ver mensagens" ON order_messages;
DROP POLICY IF EXISTS "Lojistas podem ver itens" ON order_items;
DROP POLICY IF EXISTS "Participantes podem ver itens do pedido" ON order_items;
DROP POLICY IF EXISTS "Admins podem ver todos os pedidos" ON orders;
DROP POLICY IF EXISTS "Motoboys podem ver pedidos atribuídos" ON orders;
DROP POLICY IF EXISTS "Farmácias podem atualizar pedidos da sua loja" ON orders;
DROP POLICY IF EXISTS "Farmácias podem ver pedidos da sua loja" ON orders;
DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON orders;
DROP POLICY IF EXISTS "Clientes podem ver seus próprios pedidos" ON orders;
DROP POLICY IF EXISTS "Usuários podem deletar do carrinho" ON cart_items;
DROP POLICY IF EXISTS "Usuários podem atualizar seu carrinho" ON cart_items;
DROP POLICY IF EXISTS "Usuários podem adicionar ao carrinho" ON cart_items;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio carrinho" ON cart_items;
DROP POLICY IF EXISTS "Lojistas podem gerenciar produtos" ON products;
DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON products;
DROP POLICY IF EXISTS "Lojistas podem atualizar sua farmácia" ON pharmacies;
DROP POLICY IF EXISTS "Todos podem ver farmácias aprovadas" ON pharmacies;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;

-- Dropar tabelas (ordem reversa de dependências)
DROP TABLE IF EXISTS delivery_ratings CASCADE;
DROP TABLE IF EXISTS route_history CASCADE;
DROP TABLE IF EXISTS device_tokens CASCADE;
DROP TABLE IF EXISTS pharmacy_payment_settings CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS system_alerts CASCADE;
DROP TABLE IF EXISTS order_messages CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS pharmacies CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Dropar funções
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- PARTE 2: CRIAR TUDO DO ZERO
-- ============================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS (Usuários)
CREATE TABLE profiles (
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
CREATE TABLE pharmacies (
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
CREATE TABLE products (
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
CREATE TABLE orders (
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
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA DE MENSAGENS DO PEDIDO (Chat)
CREATE TABLE order_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. TABELA DE ALERTAS DO SISTEMA
CREATE TABLE system_alerts (
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
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES pharmacies(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(customer_id, product_id)
);

-- 9. TABELA DE CONFIGURAÇÕES DE PAGAMENTO DA FARMÁCIA
CREATE TABLE pharmacy_payment_settings (
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
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT CHECK (device_type IN ('web', 'ios', 'android')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. TABELA DE HISTÓRICO DE ROTA
CREATE TABLE route_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    motoboy_id UUID REFERENCES profiles(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. TABELA DE AVALIAÇÕES DE ENTREGA
CREATE TABLE delivery_ratings (
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

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_pharmacies_owner ON pharmacies(owner_id);
CREATE INDEX idx_pharmacies_status ON pharmacies(status);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_pharmacy ON orders(pharmacy_id);
CREATE INDEX idx_orders_motoboy ON orders(motoboy_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_products_pharmacy ON products(pharmacy_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_messages_order ON order_messages(order_id);
CREATE INDEX idx_system_alerts_read ON system_alerts(is_read);
CREATE INDEX idx_cart_items_customer ON cart_items(customer_id);
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_route_history_order ON route_history(order_id);
CREATE INDEX idx_delivery_ratings_order ON delivery_ratings(order_id);

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
-- HABILITAR ROW LEVEL SECURITY
-- ============================================

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

CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- POLÍTICAS RLS - PHARMACIES
-- ============================================

CREATE POLICY "Todos podem ver farmácias aprovadas" ON pharmacies
    FOR SELECT USING (status = 'Aprovado' OR owner_id = auth.uid());

CREATE POLICY "Lojistas podem atualizar sua farmácia" ON pharmacies
    FOR UPDATE USING (owner_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS - PRODUCTS
-- ============================================

CREATE POLICY "Todos podem ver produtos ativos" ON products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Lojistas podem gerenciar produtos" ON products
    FOR ALL USING (
        pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid())
    );

-- ============================================
-- POLÍTICAS RLS - CART_ITEMS
-- ============================================

CREATE POLICY "Usuários podem ver seu próprio carrinho" ON cart_items
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Usuários podem adicionar ao carrinho" ON cart_items
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seu carrinho" ON cart_items
    FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "Usuários podem deletar do carrinho" ON cart_items
    FOR DELETE USING (customer_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS - ORDERS
-- ============================================

CREATE POLICY "Clientes podem ver seus próprios pedidos" ON orders
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Clientes podem criar pedidos" ON orders
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Farmácias podem ver pedidos da sua loja" ON orders
    FOR SELECT USING (
        pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid())
    );

CREATE POLICY "Farmácias podem atualizar pedidos da sua loja" ON orders
    FOR UPDATE USING (
        pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid())
    );

CREATE POLICY "Motoboys podem ver pedidos atribuídos" ON orders
    FOR SELECT USING (motoboy_id = auth.uid());

CREATE POLICY "Admins podem ver todos os pedidos" ON orders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- POLÍTICAS RLS - ORDER_ITEMS
-- ============================================

CREATE POLICY "Participantes podem ver itens do pedido" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_items.order_id
            AND (customer_id = auth.uid() OR motoboy_id = auth.uid())
        )
    );

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

CREATE POLICY "Participantes podem ver mensagens" ON order_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_messages.order_id
            AND (customer_id = auth.uid() OR motoboy_id = auth.uid())
        )
    );

CREATE POLICY "Participantes podem enviar mensagens" ON order_messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS - PHARMACY_PAYMENT_SETTINGS
-- ============================================

CREATE POLICY "Todos podem ver configurações de pagamento" ON pharmacy_payment_settings
    FOR SELECT USING (true);

CREATE POLICY "Lojistas podem gerenciar configurações" ON pharmacy_payment_settings
    FOR ALL USING (
        pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid())
    );

-- ============================================
-- POLÍTICAS RLS - DELIVERY_RATINGS
-- ============================================

CREATE POLICY "Clientes podem criar avaliações" ON delivery_ratings
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Todos podem ver avaliações" ON delivery_ratings
    FOR SELECT USING (true);

-- ============================================
-- POLÍTICAS RLS - SYSTEM_ALERTS
-- ============================================

CREATE POLICY "Admins podem gerenciar alertas" ON system_alerts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- HABILITAR REALTIME (Supabase)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE system_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE cart_items;

-- ============================================
-- DADOS DE EXEMPLO (SEED) - OPCIONAL
-- ============================================

-- Inserir farmácias de exemplo
INSERT INTO pharmacies (name, status, address, latitude, longitude, phone, is_open) VALUES
('Farmácia Central', 'Aprovado', 'Av. Rio Branco, 156 - Centro, Rio de Janeiro', -22.9068, -43.1729, '(21) 3333-4444', true),
('Drogaria Popular', 'Aprovado', 'Rua da Assembleia, 10 - Centro, Rio de Janeiro', -22.9035, -43.1758, '(21) 3333-5555', true),
('Farmácia Saúde', 'Aprovado', 'Av. Presidente Vargas, 642 - Centro, Rio de Janeiro', -22.9028, -43.1825, '(21) 3333-6666', true);

-- Inserir configurações de pagamento padrão
INSERT INTO pharmacy_payment_settings (pharmacy_id, accepts_pix, accepts_cash, accepts_debit, accepts_credit, min_order_value, min_installment_value, max_installments)
SELECT id, true, true, true, true, 0, 50.00, 3 FROM pharmacies;
