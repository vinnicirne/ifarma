-- ============================================================================
-- FIX: Create upsert_courier_contract_owner for merchant/manager use
-- 
-- The existing upsert_courier_contract_admin blocks non-staff with an exception.
-- The RLS on courier_contracts already allows merchants to manage contracts for
-- their own pharmacy (policy "Pharmacy manage own courier contracts").
-- 
-- This new function validates that the caller is a merchant/manager and that
-- the courier belongs to their pharmacy, then performs the upsert.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_courier_contract_owner(
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_pharmacy_id UUID;
    v_caller_role TEXT;
BEGIN
    -- Buscar farmácia e role de quem está chamando
    SELECT pharmacy_id, role
    INTO v_caller_pharmacy_id, v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Verificar se é merchant, manager ou admin
    IF v_caller_role NOT IN ('merchant', 'manager', 'admin') THEN
        RAISE EXCEPTION 'Acesso negado. Apenas gestores ou administradores podem configurar contratos.';
    END IF;

    -- Admin pode configurar qualquer contrato
    -- Merchant/manager só podem configurar contratos da própria farmácia
    IF v_caller_role != 'admin' AND v_caller_pharmacy_id != p_pharmacy_id THEN
        RAISE EXCEPTION 'Acesso negado. Você só pode configurar contratos da sua própria farmácia.';
    END IF;

    -- Verificar se o courier pertence à farmácia informada
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_courier_id
        AND pharmacy_id = p_pharmacy_id
        AND role = 'motoboy'
    ) THEN
        RAISE EXCEPTION 'Motoboy não encontrado ou não pertence a esta farmácia.';
    END IF;

    -- Upsert do contrato
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
        delivery_fee      = EXCLUDED.delivery_fee,
        fixed_salary      = EXCLUDED.fixed_salary,
        daily_rate        = EXCLUDED.daily_rate,
        productivity_goal = EXCLUDED.productivity_goal,
        productivity_bonus = EXCLUDED.productivity_bonus,
        updated_at        = now();
END;
$$;

-- Conceder permissão de execução a usuários autenticados
GRANT EXECUTE ON FUNCTION public.upsert_courier_contract_owner(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, INTEGER, NUMERIC) TO authenticated;

NOTIFY pgrst, 'reload schema';
