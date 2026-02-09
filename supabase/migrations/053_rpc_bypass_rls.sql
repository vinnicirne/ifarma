-- Função RPC para salvar contrato ignorando RLS da tabela
-- Isso resolve o problema de 'permission denied' pois a função roda com privilégios de quem a definiu (postgres)
CREATE OR REPLACE FUNCTION public.upsert_courier_contract_admin(
    p_courier_id uuid,
    p_pharmacy_id uuid,
    p_delivery_fee numeric,
    p_fixed_salary numeric,
    p_daily_rate numeric,
    p_productivity_goal integer,
    p_productivity_bonus numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Permissão TOTAL (Bypass RLS)
SET search_path = public
AS $$
DECLARE
    result json;
    v_is_admin boolean;
BEGIN
    -- 1. Verificação de Segurança Manual (já que bypassamos o RLS)
    SELECT (role = 'admin') INTO v_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar contratos.';
    END IF;

    -- 2. Upsert (Insert ou Update)
    -- Verifica se já existe contrato para esse motoboy
    IF EXISTS (SELECT 1 FROM public.courier_contracts WHERE courier_id = p_courier_id) THEN
        UPDATE public.courier_contracts
        SET 
            pharmacy_id = p_pharmacy_id,
            delivery_fee = p_delivery_fee,
            fixed_salary = p_fixed_salary,
            daily_rate = p_daily_rate,
            productivity_goal = p_productivity_goal,
            productivity_bonus = p_productivity_bonus,
            updated_at = now()
        WHERE courier_id = p_courier_id;
    ELSE
        INSERT INTO public.courier_contracts (
            courier_id, pharmacy_id, delivery_fee, fixed_salary, daily_rate, productivity_goal, productivity_bonus
        ) VALUES (
            p_courier_id, p_pharmacy_id, p_delivery_fee, p_fixed_salary, p_daily_rate, p_productivity_goal, p_productivity_bonus
        );
    END IF;

    RETURN json_build_object('success', true);
END;
$$;
