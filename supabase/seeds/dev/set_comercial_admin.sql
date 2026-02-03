-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE
-- Este script garante que o usuário 'comercialalfaum@gmail.com' tenha um perfil de administrador.

-- 1. Primeiro, vamos descobrir o ID do usuário no Supabase Auth
-- (O script faz isso automaticamente buscando pelo email na auth.users)

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Pegar o ID do usuário na tabela auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'comercialalfaum@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- Se o usuário existe, inserir ou atualizar o perfil
        INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at, is_active)
        VALUES (
            v_user_id,
            'comercialalfaum@gmail.com',
            'Vinicius Admin', -- Nome que aparecerá no perfil
            'admin',
            NOW(),
            NOW(),
            true
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            role = 'admin',
            is_active = true,
            updated_at = NOW();
            
        RAISE NOTICE 'Perfil de admin configurado com sucesso para comercialalfaum@gmail.com';
    ELSE
        RAISE NOTICE 'Usuário comercialalfaum@gmail.com não encontrado no Supabase Auth. Verifique o email.';
    END IF;
END $$;
