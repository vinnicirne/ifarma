-- RPC para salvar contrato com permissões expandidas (Admin OU Dono da Farmácia)
CREATE OR REPLACE FUNCTION public.upsert_courier_contract_owner(
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
    v_caller_role text;
    v_caller_pharmacy_id uuid;
    v_target_courier_pharmacy_id uuid;
BEGIN
    -- 1. Identificar quem está chamando
    SELECT role, pharmacy_id INTO v_caller_role, v_caller_pharmacy_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- 2. Verificar se o motoboy alvo existe e pegar a farmácia dele
    SELECT pharmacy_id INTO v_target_courier_pharmacy_id
    FROM public.profiles
    WHERE id = p_courier_id;

    -- 3. Lógica de Permissão
    IF v_caller_role = 'admin' THEN
        -- Admin pode tudo
        NULL; -- Prossegue
    ELSIF v_caller_role = 'merchant' OR v_caller_role = 'manager' THEN
        -- Merchant/Manager só pode editar contrato de motoboy DA SUA farmácia
        IF v_caller_pharmacy_id IS NULL OR v_caller_pharmacy_id != p_pharmacy_id THEN
            RAISE EXCEPTION 'Acesso negado: Você só pode gerenciar contratos da sua própria farmácia.';
        END IF;
        
        -- Verifica se o motoboy realmente pertence a essa farmácia (segurança extra)
        IF v_target_courier_pharmacy_id != p_pharmacy_id THEN
             RAISE EXCEPTION 'Acesso negado: Este motoboy não pertence à sua farmácia.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acesso negado: Permissão insuficiente.';
    END IF;

    -- 4. Upsert (Insert ou Update)
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
