DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'comercialalfaum@gmail.com'; 
BEGIN
    -- 1. Busca o ID do usuário
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário % não encontrado!', target_email;
    END IF;

    -- 2. Insere com TODOS os campos obrigatórios, incluindo EMAIL
    INSERT INTO public.profiles (id, email, full_name, role, is_active, is_online)
    VALUES (
        target_user_id, 
        target_email, 
        'Motoboy Recuperado', 
        'motoboy', 
        true, 
        false
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'motoboy',
        is_active = true,
        email = target_email;

    RAISE NOTICE 'SUCESSO TOTAL: Perfil corrigido para %', target_email;
END $$;
