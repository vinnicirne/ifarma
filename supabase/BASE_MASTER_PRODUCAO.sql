-- ====================================================================
-- IFARMA - MASTER SCHEMA (VERSÃO 2026 - FULL PRODUCTION)
-- Este arquivo reconstrói todo o banco de dados do zero se necessário.
-- Inclui: Perfis, Farmácias, Produtos, Pedidos, Rastreamento Premium,
-- Telemetria, Chat, Notificações, Financeiro e Segurança (RLS).
-- ====================================================================

-- 0. PREPARAÇÃO E EXTENSÕES
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELAS DE IDENTIDADE E PERFIS
CREATE TABLE IF NOT EXISTS public.profiles (
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
    
    -- Telemetria e Localização
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    battery_level INTEGER,
    is_charging BOOLEAN,
    last_location_update TIMESTAMP WITH TIME ZONE,
    current_order_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. ESTRUTURA DE NEGÓCIO (FARMÁCIAS)
CREATE TABLE IF NOT EXISTS public.pharmacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    legal_name TEXT,
    trade_name TEXT,
    cnpj TEXT,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovado', 'Rejeitado')),
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone TEXT,
    establishment_phone TEXT,
    email TEXT,
    opening_hours TEXT,
    specialty TEXT,
    plan TEXT DEFAULT 'Gratuito',
    is_open BOOLEAN DEFAULT true,
    delivery_enabled BOOLEAN DEFAULT false,
    
    -- Automação de Mensagens
    auto_message_accept_enabled BOOLEAN DEFAULT FALSE,
    auto_message_accept_text TEXT DEFAULT 'Olá! Recebemos seu pedido e já estamos preparando.',
    auto_message_cancel_enabled BOOLEAN DEFAULT FALSE,
    auto_message_cancel_text TEXT DEFAULT 'Infelizmente tivemos que cancelar seu pedido por um motivo de força maior. Entre em contato para mais detalhes.',
    
    -- Dados do Proprietário
    owner_name TEXT,
    owner_last_name TEXT,
    owner_cpf TEXT,
    owner_rg TEXT,
    owner_rg_issuer TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. CATÁLOGO DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
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

-- 4. TRANSAÇÕES E PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id),
    pharmacy_id UUID REFERENCES public.pharmacies(id),
    motoboy_id UUID REFERENCES public.profiles(id),
    customer_name TEXT,
    receiver_name TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    total_price DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pendente',
    payment_method TEXT,
    installments INTEGER DEFAULT 1,
    change_for DECIMAL(10, 2),
    notes TEXT,
    
    -- Rastreamento Premium (Cache de Rota)
    route_polyline TEXT,
    route_distance_text TEXT,
    route_duration_text TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

    CONSTRAINT orders_status_check CHECK (status IN (
        'pendente', 'preparando', 'aguardando_motoboy', 'aceito', 
        'pronto_entrega', 'aguardando_retirada', 'retirado', 
        'em_rota', 'entregue', 'cancelado'
    ))
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. COMUNICAÇÃO E RASTREAMENTO TIME-SERIES
CREATE TABLE IF NOT EXISTS public.order_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    sender_role TEXT,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.route_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    motoboy_id UUID REFERENCES public.profiles(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SUPORTE, NOTIFICAÇÕES E CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT CHECK (device_type IN ('web', 'ios', 'android')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.pharmacies(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. FINANCEIRO E REGRAS DE COBRANÇA
CREATE TABLE IF NOT EXISTS public.pharmacy_fees (
    pharmacy_id UUID PRIMARY KEY REFERENCES public.pharmacies(id),
    charge_per_order BOOLEAN DEFAULT false,
    fixed_fee DECIMAL(10,2) DEFAULT 0,
    charge_percentage BOOLEAN DEFAULT false,
    percentage_fee DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pharmacy_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES public.pharmacies(id),
    order_id UUID REFERENCES public.orders(id),
    order_value DECIMAL(10,2) DEFAULT 0,
    fee_amount DECIMAL(10,2) DEFAULT 0,
    type TEXT, -- 'free', 'fee', 'subscription'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pharmacy_payment_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE UNIQUE,
    accepts_pix BOOLEAN DEFAULT true,
    accepts_cash BOOLEAN DEFAULT true,
    accepts_credit BOOLEAN DEFAULT true,
    accepts_debit BOOLEAN DEFAULT true,
    pix_key TEXT,
    pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
    min_order_value DECIMAL(10,2) DEFAULT 0.00,
    min_installment_value DECIMAL(10,2) DEFAULT 10.00,
    max_installments INTEGER DEFAULT 3,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. LÓGICA DE NEGÓCIO (FUNÇÕES E TRIGGERS)

-- Função updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_pharmacy_payment_updated BEFORE UPDATE ON public.pharmacy_payment_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Handler de Novos Usuários (Auth -> Profiles)
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
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Webhook de Notificação (Edge Functions)
CREATE OR REPLACE FUNCTION public.handle_system_notification_webhook()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT;
    api_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbGR3Y2doeWd5ZWh1dm9oeGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODUyNTcsImV4cCI6MjA4NDk2MTI1N30.GQlBYKLBHbaGyuFfo-npL3qgsK381NT5mwV4T7LIU7Q';
BEGIN
    IF (TG_TABLE_NAME = 'orders') THEN
        IF (NEW.motoboy_id IS NOT NULL AND (OLD.motoboy_id IS NULL OR NEW.motoboy_id <> OLD.motoboy_id)) THEN
            project_url := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/motoboy-notifier';
        ELSE
            project_url := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/order-notifier';
        END IF;
    ELSIF (TG_TABLE_NAME = 'order_messages') THEN
        project_url := 'https://isldwcghygyehuvohxaq.supabase.co/functions/v1/order-notifier';
    END IF;

    IF (project_url IS NOT NULL) THEN
        PERFORM net.http_post(
            url := project_url,
            headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
            body := jsonb_build_object('type', TG_OP, 'table', TG_TABLE_NAME, 'record', row_to_json(NEW))
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_activity AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_system_notification_webhook();
CREATE TRIGGER on_message_activity AFTER INSERT ON public.order_messages FOR EACH ROW EXECUTE FUNCTION public.handle_system_notification_webhook();

-- 9. SEGURANÇA (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Exemplo de Política (Profiles)
CREATE POLICY "Profiles self access" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);

-- Exemplo de Política (Orders)
CREATE POLICY "Orders access" ON public.orders FOR SELECT USING (customer_id = auth.uid() OR motoboy_id = auth.uid() OR EXISTS (SELECT 1 FROM pharmacies WHERE id = orders.pharmacy_id AND owner_id = auth.uid()));

-- 10. REALTIME
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles, orders, order_messages, notifications, route_history;
    END IF;
END $$;

COMMIT;
