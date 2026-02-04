-- ===============================================================
-- VINCULAR USUÁRIO À FARMÁCIA (CORRIGIDO)
-- ===============================================================

DO $$
DECLARE
    target_user_id UUID;
    target_pharmacy_id UUID;
BEGIN
    -- 1. Buscar ID do Usuário pelo E-mail
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'izabellefcirne@gmail.com';

    -- 2. Buscar ID da Farmácia (Trevo)
    SELECT id INTO target_pharmacy_id FROM pharmacies WHERE name ILIKE '%Trevo%' LIMIT 1;
    
    -- Fallback
    IF target_pharmacy_id IS NULL THEN
        SELECT id INTO target_pharmacy_id FROM pharmacies LIMIT 1;
    END IF;

    -- 3. Executar o Vínculo (ORDEM CORRETA: PERFIL -> FARMÁCIA)
    IF target_user_id IS NOT NULL AND target_pharmacy_id IS NOT NULL THEN
        
        -- 1º: Criar/Atualizar Perfil (Obrigatório existir antes de vincular na farmácia)
        INSERT INTO public.profiles (id, email, role, pharmacy_id)
        VALUES (target_user_id, 'izabellefcirne@gmail.com', 'merchant', target_pharmacy_id)
        ON CONFLICT (id) DO UPDATE 
        SET role = 'merchant', pharmacy_id = target_pharmacy_id;

        -- 2º: Definir o usuário como Dono da Farmácia
        UPDATE pharmacies 
        SET owner_id = target_user_id 
        WHERE id = target_pharmacy_id;
        
        RAISE NOTICE 'Sucesso! Usuário vinculado à farmácia.';
    ELSE
        RAISE WARNING 'Não foi possível encontrar usuário ou farmácia.';
    END IF;
END $$;
