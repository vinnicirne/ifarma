-- ============================================================================
-- IFARMA - MASTER RESTAURAÇÃO DE SISTEMA (PÓS-AUDITORIA)
-- Descrição: Unifica todos os patches de restauração, schema e estabilidade.
-- Data: 2026-02-16
-- Versão: 1.0 (Master)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. HELPERS DE SEGURANÇA (Garantir que as funções básicas de Admin existem)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role IN ('admin', 'operator', 'support') FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2. SCHEMA: FARMÁCIAS (Correção de PGRST204 e Automação)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS establishment_phone TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS auto_open_status BOOLEAN DEFAULT false;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS opening_hours_start TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS opening_hours_end TEXT;

COMMENT ON COLUMN public.pharmacies.establishment_phone IS 'Telefone fixo da unidade';
COMMENT ON COLUMN public.pharmacies.auto_open_status IS 'Status de abertura automática via scheduler';

-- ----------------------------------------------------------------------------
-- 3. SCHEMA: PROFILES & LOGÍSTICA (Telemetria, Veículos e Motoboys)
-- ----------------------------------------------------------------------------
-- Colunas de Telemetria
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_charging BOOLEAN;

-- Colunas de Veículo
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnh_url TEXT;

-- Tabela de Contratos de Motoboys
CREATE TABLE IF NOT EXISTS public.courier_contracts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    courier_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    fixed_salary DECIMAL(10, 2) DEFAULT 0,
    daily_rate DECIMAL(10, 2) DEFAULT 0,
    productivity_goal INTEGER DEFAULT 0,
    productivity_bonus DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(courier_id, pharmacy_id)
);

ALTER TABLE public.courier_contracts ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4. SERVIÇO: MARKETING & ANÚNCIOS (Promotions, Ads, Collections)
-- ----------------------------------------------------------------------------
-- Promotions
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    banner_url TEXT,
    active BOOLEAN DEFAULT true,
    type TEXT DEFAULT 'banner', 
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    position INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Participantes de Promoções
CREATE TABLE IF NOT EXISTS public.promotion_participants (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(promotion_id, pharmacy_id)
);

-- Ads/Destaques
CREATE TABLE IF NOT EXISTS public.ads_campaigns (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    destination_type TEXT DEFAULT 'store',
    destination_id TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    region_id TEXT DEFAULT 'global',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ads_metrics (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    campaign_id UUID REFERENCES public.ads_campaigns(id) ON DELETE CASCADE UNIQUE,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Coleções (Health Engine)
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'symptom',
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. SERVIÇO: APP FEED & BANNERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_banners (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    image_url TEXT NOT NULL,
    action_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_feed_sections (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. FINANCEIRO: PADRONIZAÇÃO DE PHARMACY_CONTRACTS
-- ----------------------------------------------------------------------------
-- Renomear colunas override_ para nomes padrão se existirem
DO $$
BEGIN
    -- monthly_fee_cents
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_contracts' AND column_name = 'override_monthly_fee_cents') THEN
        ALTER TABLE pharmacy_contracts RENAME COLUMN override_monthly_fee_cents TO monthly_fee_cents;
    END IF;
    
    -- free_orders_per_period
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_contracts' AND column_name = 'override_free_orders') THEN
        ALTER TABLE pharmacy_contracts RENAME COLUMN override_free_orders TO free_orders_per_period;
    END IF;

    -- overage_percent_bp
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_contracts' AND column_name = 'override_overage_percent_bp') THEN
        ALTER TABLE pharmacy_contracts RENAME COLUMN override_overage_percent_bp TO overage_percent_bp;
    END IF;

    -- overage_fixed_fee_cents
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_contracts' AND column_name = 'override_overage_fixed_fee_cents') THEN
        ALTER TABLE pharmacy_contracts RENAME COLUMN override_overage_fixed_fee_cents TO overage_fixed_fee_cents;
    END IF;

    -- block_after_free_limit
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy_contracts' AND column_name = 'override_block_after_limit') THEN
        ALTER TABLE pharmacy_contracts RENAME COLUMN override_block_after_limit TO block_after_free_limit;
    END IF;
END $$;

-- Garantir colunas se a tabela for nova ou estiver vazia
ALTER TABLE public.pharmacy_contracts ADD COLUMN IF NOT EXISTS monthly_fee_cents INTEGER;
ALTER TABLE public.pharmacy_contracts ADD COLUMN IF NOT EXISTS free_orders_per_period INTEGER;
ALTER TABLE public.pharmacy_contracts ADD COLUMN IF NOT EXISTS overage_percent_bp INTEGER;
ALTER TABLE public.pharmacy_contracts ADD COLUMN IF NOT EXISTS overage_fixed_fee_cents INTEGER;
ALTER TABLE public.pharmacy_contracts ADD COLUMN IF NOT EXISTS block_after_free_limit BOOLEAN DEFAULT false;

-- Atualizar função get_pharmacy_billing_rules para contemplar os novos nomes
DROP FUNCTION IF EXISTS get_pharmacy_billing_rules(p_pharmacy_id UUID);
CREATE OR REPLACE FUNCTION get_pharmacy_billing_rules(p_pharmacy_id UUID)
RETURNS TABLE (
  monthly_fee_cents INTEGER,
  free_orders_per_period INTEGER,
  overage_percent_bp INTEGER,
  overage_fixed_fee_cents INTEGER,
  block_after_free_limit BOOLEAN
) AS $$
DECLARE
  v_contract RECORD;
  v_subscription RECORD;
  v_plan RECORD;
  v_global RECORD;
BEGIN
  -- 1. Buscar contrato ativo (usando nomes novos)
  SELECT * INTO v_contract
  FROM pharmacy_contracts
  WHERE pharmacy_id = p_pharmacy_id
    AND valid_from <= CURRENT_DATE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Buscar assinatura ativa
  SELECT * INTO v_subscription
  FROM pharmacy_subscriptions
  WHERE pharmacy_id = p_pharmacy_id
    AND status = 'active'
  LIMIT 1;

  -- 3. Buscar plano
  IF v_subscription IS NOT NULL THEN
    SELECT * INTO v_plan
    FROM billing_plans
    WHERE id = v_subscription.plan_id;
  END IF;

  -- 4. Buscar config global
  SELECT * INTO v_global
  FROM billing_global_config
  WHERE config_key = 'default_plan_settings'
  LIMIT 1;

  -- Retornar valores resolvidos
  RETURN QUERY SELECT
    COALESCE(v_contract.monthly_fee_cents, v_plan.monthly_fee_cents, v_global.monthly_fee_cents, 0),
    COALESCE(v_contract.free_orders_per_period, v_plan.free_orders_per_period, v_global.free_orders_per_period, 0),
    COALESCE(v_contract.overage_percent_bp, v_plan.overage_percent_bp, v_global.overage_percent_bp, 0),
    COALESCE(v_contract.overage_fixed_fee_cents, v_plan.overage_fixed_fee_cents, v_global.overage_fixed_fee_cents, 0),
    COALESCE(v_contract.block_after_free_limit, v_plan.block_after_free_limit, v_global.block_after_free_limit, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- 7. STORAGE: BUCKETS & POLÍTICAS
-- ----------------------------------------------------------------------------
-- app-assets
INSERT INTO storage.buckets (id, name, public) VALUES ('app-assets', 'app-assets', true) ON CONFLICT (id) DO NOTHING;
-- ads-banners
INSERT INTO storage.buckets (id, name, public) VALUES ('ads-banners', 'ads-banners', true) ON CONFLICT (id) DO NOTHING;

-- Políticas Unificadas
DO $$
DECLARE
    b text;
BEGIN
    FOR b IN SELECT unnest(ARRAY['app-assets', 'ads-banners'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Public select ' || b);
        EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L)', 'Public select ' || b, b);
        
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Staff manage ' || b);
        EXECUTE format('CREATE POLICY %I ON storage.objects FOR ALL TO authenticated USING (bucket_id = %L)', 'Staff manage ' || b, b);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 8. RLS & POLÍTICAS DE TABELAS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['promotion_participants', 'ads_campaigns', 'ads_metrics', 'collections', 'promotions', 'app_banners', 'app_feed_sections', 'courier_contracts'])
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Staff manage ' || t, t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_staff())', 'Staff manage ' || t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public read ' || t, t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', 'Public read ' || t, t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 9. AJUSTES FINAIS: STATUS DE FARMÁCIAS & VISIBILIDADE
-- ----------------------------------------------------------------------------
-- Normalizar status de farmácias para 'Aprovado' (Fix Case-Sensitive)
UPDATE pharmacies SET status = 'Aprovado' WHERE status = 'approved' OR status = 'aprovado';

-- Ajustar política de visibilidade pública das farmácias
DROP POLICY IF EXISTS "Todos podem ver farmácias aprovadas" ON pharmacies;
CREATE POLICY "Todos podem ver farmácias aprovadas" ON pharmacies
    FOR SELECT USING (status ILIKE 'aprovado' OR owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 10. RECARGA DE CACHE (PostgREST)
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;

-- VERIFICAÇÃO FINAL
SELECT 'Restauração Concluída' as Status;
