-- ========================================================
-- AUDITORIA OPERACIONAL: PATCH DE RESTAURAÇÃO DE SERVIÇOS
-- Este script restaura tabelas e serviços que sumiram no reset
-- ========================================================

BEGIN;

-- 1. SERVIÇO: Configurações Global (Necessário para Google Maps)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Colunas faltantes em PROFILES (Telemetria)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_charging BOOLEAN;

-- Seed básico da chave de mapas
INSERT INTO public.system_settings (key, value, description)
VALUES ('google_maps_api_key', '', 'Chave de API do Google Maps')
ON CONFLICT (key) DO NOTHING;

-- 2. SERVIÇO: Marketing e Promoções (Painel de Saúde do Admin)
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    type TEXT DEFAULT 'banner', 
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SERVIÇO: Gestão de Banners e Feed (Essencial para o Cliente)
CREATE TABLE IF NOT EXISTS public.app_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    action_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_feed_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SERVIÇO:-- 4. LOGÍSTICA: Tabelas de Rastreamento Real-time
CREATE TABLE IF NOT EXISTS public.order_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    motoboy_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, ignored
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.motoboy_live_locations (
    motoboy_id UUID PRIMARY KEY REFERENCES public.profiles(id),
    order_id UUID REFERENCES public.orders(id),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    bearing DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    battery_level INTEGER,
    is_charging BOOLEAN,
    last_ping TIMESTAMPTZ DEFAULT now()
);

-- AJUSTE EM ORDERS: Coordenadas e Status
-- 1. Remover constraint antiga de status para permitir novos status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pendente', 'aceito', 'preparando', 'aguardando_motoboy', 'pronto_entrega', 'aguardando_retirada', 'retirado', 'em_rota', 'entregue', 'cancelado', 'finalizado'));

-- 2. Colunas de geofencing e timings
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS motoboy_arrived_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;

-- 5. SEGURANÇA: Ajuste na Tabela de Alertas (Sumiram colunas Region/Type)
ALTER TABLE public.system_alerts ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.system_alerts ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.system_alerts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.system_alerts ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 6. SEGURANÇA: Habilitar RLS nas novas tabelas
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoboy_live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas (Permissivas para não travar o Admin)
DROP POLICY IF EXISTS "Admins podem tudo em system_settings" ON system_settings;
CREATE POLICY "Admins podem tudo em system_settings" ON system_settings FOR ALL USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins podem tudo em promotions" ON promotions;
CREATE POLICY "Admins podem tudo em promotions" ON promotions FOR ALL USING (public.check_is_admin());

DROP POLICY IF EXISTS "Publico vê promoções" ON promotions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff vê alertas" ON system_alerts;
CREATE POLICY "Staff vê alertas" ON system_alerts FOR SELECT USING (public.check_is_admin());

COMMIT;

-- RESULTADO DA AUDITORIA
SELECT 'Tabelas Restauradas' as Status, count(*) as Qtd FROM (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    AND tablename IN ('system_settings', 'promotions', 'app_banners', 'order_assignments', 'motoboy_live_locations')
) as audit;
