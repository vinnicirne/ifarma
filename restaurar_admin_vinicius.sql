-- SCRIPT DEFINITIVO: RESTAURAR ACESSO ADMINISTRADOR (VINICIUS)
-- Execute este script no SQL Editor do Supabase

DO $$
DECLARE
    v_vinicius_id UUID;
    v_test_id UUID;
BEGIN
    -- 0. Garantir que a constraint de roles aceite 'cliente' (o frontend usa 'cliente')
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('cliente', 'customer', 'merchant', 'manager', 'staff', 'motoboy', 'admin'));

    -- 1. Buscar IDs dos usuários
    SELECT id INTO v_vinicius_id FROM auth.users WHERE email = 'viniciuscirne@gmail.com';
    SELECT id INTO v_test_id FROM auth.users WHERE email = 'comercialalfaum@gmail.com';

    -- 2. Restaurar VINICIUS como Administrador Global
    IF v_vinicius_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role, is_active, updated_at)
        VALUES (v_vinicius_id, 'viniciuscirne@gmail.com', 'Vinicius Cirne', 'admin', true, NOW())
        ON CONFLICT (id) DO UPDATE
        SET 
            role = 'admin',
            pharmacy_id = NULL, -- Remove qualquer vínculo acidental com uma farmácia específica
            is_active = true,
            updated_at = NOW();
        
        RAISE NOTICE '✅ Vinicius restaurado como ADMIN com sucesso.';
    ELSE
        RAISE NOTICE '❌ Usuário viniciuscirne@gmail.com não encontrado.';
    END IF;

    -- 3. Configurar conta de teste (Comercial) como GESTOR de farmácia (Merchant)
    IF v_test_id IS NOT NULL THEN
        -- Tenta vincular à primeira farmácia encontrada se não tiver uma
        UPDATE public.profiles
        SET 
            role = 'merchant',
            pharmacy_id = COALESCE(pharmacy_id, (SELECT id FROM public.pharmacies LIMIT 1)),
            is_active = true,
            updated_at = NOW()
        WHERE id = v_test_id;
        
        RAISE NOTICE '✅ Conta comercial configurada como GESTOR DE FARMÁCIA com sucesso.';
    END IF;

END $$;
