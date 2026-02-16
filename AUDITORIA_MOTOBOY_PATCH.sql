-- ============================================
-- IFARMA - PATCH AUDITORIA MOTOBOY
-- Descrição: Ajustes estruturais para gestão de motoboys e contratos
-- ============================================

-- 1. ADICIONAR COLUNAS DE VEÍCULO EM PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnh_url TEXT;

-- 2. CRIAR TABELA DE CONTRATOS DE MOTOBOYS
CREATE TABLE IF NOT EXISTS public.courier_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Habilitar RLS
ALTER TABLE public.courier_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para COURIER_CONTRACTS
DROP POLICY IF EXISTS "Admins podem tudo em contratos" ON public.courier_contracts;
CREATE POLICY "Admins podem tudo em contratos" ON public.courier_contracts
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Lojistas podem ver contratos da sua farmácia" ON public.courier_contracts;
CREATE POLICY "Lojistas podem ver contratos da sua farmácia" ON public.courier_contracts
    FOR SELECT USING (EXISTS (SELECT 1 FROM pharmacies WHERE id = courier_contracts.pharmacy_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Motoboys podem ver seus próprios contratos" ON public.courier_contracts;
CREATE POLICY "Motoboys podem ver seus próprios contratos" ON public.courier_contracts
    FOR SELECT USING (courier_id = auth.uid());

-- 3. RPC PARA UPSERT DE CONTRATO (ADMIN)
CREATE OR REPLACE FUNCTION public.upsert_courier_contract_admin(
    p_courier_id UUID,
    p_pharmacy_id UUID,
    p_delivery_fee DECIMAL,
    p_fixed_salary DECIMAL,
    p_daily_rate DECIMAL,
    p_productivity_goal INTEGER,
    p_productivity_bonus DECIMAL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.courier_contracts (
        courier_id, 
        pharmacy_id, 
        delivery_fee, 
        fixed_salary, 
        daily_rate, 
        productivity_goal, 
        productivity_bonus,
        updated_at
    )
    VALUES (
        p_courier_id, 
        p_pharmacy_id, 
        p_delivery_fee, 
        p_fixed_salary, 
        p_daily_rate, 
        p_productivity_goal, 
        p_productivity_bonus,
        now()
    )
    ON CONFLICT (courier_id, pharmacy_id) 
    DO UPDATE SET
        delivery_fee = EXCLUDED.delivery_fee,
        fixed_salary = EXCLUDED.fixed_salary,
        daily_rate = EXCLUDED.daily_rate,
        productivity_goal = EXCLUDED.productivity_goal,
        productivity_bonus = EXCLUDED.productivity_bonus,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários de Auditoria
COMMENT ON TABLE public.courier_contracts IS 'Armazena as taxas e acordos financeiros entre motoboys e farmácias.';
