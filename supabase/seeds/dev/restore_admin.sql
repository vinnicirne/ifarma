-- ============================================
-- RESTAURAR ACESSO ADMIN
-- USUÁRIO: viniciuscirne@gmail.com
-- ============================================

DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'viniciuscirne@gmail.com';
BEGIN
    -- 1. Buscar ID do usuário na tabela de autenticação
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NOT NULL THEN
        -- 2. Atualizar ou Criar perfil com role 'admin'
        INSERT INTO public.profiles (id, email, role, full_name, is_active)
        VALUES (v_user_id, v_email, 'admin', 'Vinicius Cirne', true)
        ON CONFLICT (id) DO UPDATE
        SET role = 'admin',
            is_active = true;
            
        RAISE NOTICE 'Perfil de administrador atualizado com sucesso para: %', v_email;
    ELSE
        RAISE NOTICE 'ERRO: Usuário % não encontrado no sistema de autenticação (auth.users).', v_email;
    END IF;
END $$;
