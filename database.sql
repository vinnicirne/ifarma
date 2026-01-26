-- SCRIPT SQL PARA O SUPABASE SQL EDITOR --

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Farmácias
CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    logo_url TEXT,
    rating DECIMAL(2,1) DEFAULT 0,
    is_open BOOLEAN DEFAULT true,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Tabela de Motoboys
CREATE TABLE IF NOT EXISTS motoboys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'disponivel', -- disponivel, em_rota, bloqueado, banido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Tabela de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    address TEXT NOT NULL,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    motoboy_id UUID REFERENCES motoboys(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pendente', -- pendente, pronto_entrega, em_rota, entregue
    total_price DECIMAL(10,2),
    controlled_medication BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Tabela de Perfis (Admin/Clientes)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    role TEXT DEFAULT 'cliente', -- admin, lojista, cliente
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 6. Configurar Row Level Security (RLS)
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoboys ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Políticas Básicas
CREATE POLICY "Leitura pública de farmácias" ON pharmacies FOR SELECT USING (true);
CREATE POLICY "Leitura pública de motoboys" ON motoboys FOR SELECT USING (true);
CREATE POLICY "Leitura pública de pedidos" ON orders FOR SELECT USING (true);
CREATE POLICY "Perfis visíveis pelo próprio usuário" ON profiles FOR SELECT USING (auth.uid() = id);

-- 9. Tabela de Produtos (Geral)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 10. Relacionamento Farmácia <-> Produto (Preço e Estoque)
CREATE TABLE IF NOT EXISTS pharmacy_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(pharmacy_id, product_id)
);

-- 11. Habilitar RLS para novas tabelas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_products ENABLE ROW LEVEL SECURITY;

-- 12. Políticas para novas tabelas
CREATE POLICY "Leitura pública de produtos" ON products FOR SELECT USING (true);
CREATE POLICY "Leitura pública de ofertas" ON pharmacy_products FOR SELECT USING (true);

-- 13. Gatilho para Perfis Automáticos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS c:\Users\THINKPAD\Desktop\Ifarma
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'cliente')
  );
  RETURN new;
END;
c:\Users\THINKPAD\Desktop\Ifarma LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Inserir chave padrão do Google Maps (vazia)
INSERT INTO system_settings (key, value, description) 
VALUES ('google_maps_api_key', '', 'Chave da API do Google Maps para Geocodificação Reversa')
ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS para configurações
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de Configurações
CREATE POLICY "Leitura pública de configurações" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Escrita restrita a administradores" ON system_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Script para transformar um usuário em ADM (Substitua o email):
-- UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com');
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Gratuito';
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aprovado';

-- 14. Correção de RLS para Farmácias (Permitir Cadastro)
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

DO c:\Users\THINKPAD\Desktop\Ifarma 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacies' AND policyname = 'Leitura pública de farmácias') THEN
        CREATE POLICY "Leitura pública de farmácias" ON pharmacies FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacies' AND policyname = 'Gerenciamento total para autenticados') THEN
        CREATE POLICY "Gerenciamento total para autenticados" ON pharmacies FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END c:\Users\THINKPAD\Desktop\Ifarma;
test

-- Admin Highlights & Motoboy Expansion
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS cnh_url TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id);

