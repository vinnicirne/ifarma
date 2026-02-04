DO $$
DECLARE
    v_email TEXT := 'comercialalfaum@gmail.com';
    v_user_id UUID;
    v_pharmacy_id UUID;
BEGIN
    -- 1. Pega o ID do seu Usuário
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário % não encontrado no sistema de login!', v_email;
    END IF;

    -- 2. Pega o ID da Farmácia por email
    SELECT id INTO v_pharmacy_id FROM public.pharmacies WHERE owner_email = v_email LIMIT 1;

    IF v_pharmacy_id IS NULL THEN
        SELECT id INTO v_pharmacy_id FROM public.pharmacies LIMIT 1;
    END IF;
    
    RAISE NOTICE 'Vinculando Usuário % à Farmácia %', v_user_id, v_pharmacy_id;

    -- 3. Atualiza o Perfil do Usuário (Vira GESTOR)
    -- Adicionando colunas que possam faltar no perfil de gestor também
    INSERT INTO public.profiles (id, email, role, is_active, pharmacy_id, full_name)
    VALUES (v_user_id, v_email, 'merchant', true, v_pharmacy_id, 'Gestor Alfaum')
    ON CONFLICT (id) DO UPDATE
    SET role = 'merchant',
        is_active = true,
        pharmacy_id = v_pharmacy_id;

    -- 4. Atualiza a Farmácia (Define o dono)
    UPDATE public.pharmacies
    SET owner_id = v_user_id,
        owner_email = v_email
    WHERE id = v_pharmacy_id;

    RAISE NOTICE 'SUCESSO! Acesso liberado para o Gestor. Atualize a página.';
END $$;
