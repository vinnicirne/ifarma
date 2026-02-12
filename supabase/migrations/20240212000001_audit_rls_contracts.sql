-- ============================================
-- AUDIT FIX: COURIER CONTRACTS & RLS
-- ============================================

-- 1. Tabela de Contratos (courier_contracts)
CREATE TABLE IF NOT EXISTS public.courier_contracts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    courier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    fixed_salary NUMERIC(10,2) DEFAULT 0,
    daily_rate NUMERIC(10,2) DEFAULT 0,
    productivity_goal INTEGER DEFAULT 0,
    productivity_bonus NUMERIC(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Um motoboy só pode ter um contrato com uma farmácia específica
    UNIQUE(courier_id, pharmacy_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.courier_contracts ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS
DROP POLICY IF EXISTS "Staff manage all contracts" ON public.courier_contracts;
CREATE POLICY "Staff manage all contracts" ON public.courier_contracts
    FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS "Pharmacy manage own courier contracts" ON public.courier_contracts;
CREATE POLICY "Pharmacy manage own courier contracts" ON public.courier_contracts
    FOR ALL USING (
        pharmacy_id IN (SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Courier view own contracts" ON public.courier_contracts;
CREATE POLICY "Courier view own contracts" ON public.courier_contracts
    FOR SELECT USING (courier_id = auth.uid());

-- 4. RPC para Upsert Admin (Garante que o Admin possa salvar contratos sem restrições)
CREATE OR REPLACE FUNCTION public.upsert_courier_contract_admin(
    p_courier_id UUID,
    p_pharmacy_id UUID,
    p_delivery_fee NUMERIC,
    p_fixed_salary NUMERIC,
    p_daily_rate NUMERIC,
    p_productivity_goal INTEGER,
    p_productivity_bonus NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com privilégios de quem criou a função (god mode)
SET search_path = public
AS $$
BEGIN
    -- Verifica se quem está chamando é Staff (Admin)
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem usar esta função.';
    END IF;

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
$$;

-- 5. Garantir que as tabelas bases tenham permissões para UPSERT do Admin
-- Profiles (Admin precisa atualizar pharmacy_id ao vincular motoboys)
DROP POLICY IF EXISTS "Admin full control profiles" ON public.profiles;
CREATE POLICY "Admin full control profiles" ON public.profiles
    FOR ALL USING (public.is_admin());

-- Pharmacies (Admin precisa aprovar e alterar status)
DROP POLICY IF EXISTS "Admin full control pharmacies" ON public.pharmacies;
CREATE POLICY "Admin full control pharmacies" ON public.pharmacies
    FOR ALL USING (public.is_admin());
