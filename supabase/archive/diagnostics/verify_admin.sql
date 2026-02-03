-- ============================================
-- VERIFICAÇÃO DE STATUS ADMIN
-- ============================================

DO $$
DECLARE
    v_email TEXT := 'viniciuscirne@gmail.com';
    v_auth_record RECORD;
    v_profile_record RECORD;
BEGIN
    RAISE NOTICE '--- INICIANDO VERIFICAÇÃO PARA % ---', v_email;

    -- 1. Verificar Auth.Users
    SELECT id, email, created_at INTO v_auth_record
    FROM auth.users 
    WHERE email = v_email;

    IF v_auth_record.id IS NULL THEN
        RAISE NOTICE '❌ Usuário NÃO encontrado em auth.users!';
    ELSE
        RAISE NOTICE '✅ Usuário encontrado em auth.users. ID: %', v_auth_record.id;

        -- 2. Verificar Public.Profiles
        SELECT id, role, full_name INTO v_profile_record
        FROM public.profiles
        WHERE id = v_auth_record.id;

        IF v_profile_record.id IS NULL THEN
            RAISE NOTICE '❌ Perfil NÃO encontrado em public.profiles para este ID!';
            RAISE NOTICE '💡 O script restore_admin.sql deve corrigir isso.';
        ELSE
            RAISE NOTICE '✅ Perfil encontrado.';
            RAISE NOTICE '   Role atual: %', v_profile_record.role;
            RAISE NOTICE '   Nome: %', v_profile_record.full_name;
            
            IF v_profile_record.role = 'admin' THEN
                RAISE NOTICE '✅ STATUS CORRETO: O usuário é ADMIN.';
            ELSE
                RAISE NOTICE '❌ STATUS INCORRETO: O papel (role) não é admin.';
            END IF;
        END IF;
    END IF;
END $$;
