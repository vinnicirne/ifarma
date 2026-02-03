-- ============================================
-- MANUAL: APROVAR FARMÁCIA E CRIAR USUÁRIO
-- ============================================

DO $$
DECLARE
    -- TENTA ENCONTRAR AUTOMATICAMENTE A ÚLTIMA FARMÁCIA PENDENTE
    v_pharmacy_id UUID;
    v_pharmacy_name TEXT;
    
    v_pharmacy RECORD;
    v_user_id UUID;
    v_email TEXT;
BEGIN
    -- 1. Tentar localizar farmácia pendente automaticamente
    SELECT id, name, owner_email, owner_name, owner_phone INTO v_pharmacy 
    FROM pharmacies 
    WHERE status = 'Pendente' 
    ORDER BY created_at DESC 
    LIMIT 1;

    IF v_pharmacy.id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma farmácia com status "Pendente" foi encontrada.';
    END IF;

    v_pharmacy_id := v_pharmacy.id;
    v_email := v_pharmacy.owner_email;

    RAISE NOTICE '🚀 Encontrada Farmácia Pendente: % (ID: %)', v_pharmacy.name, v_pharmacy_id;
    RAISE NOTICE '📧 Email do Dono: %', v_email;

    -- 2. Verificar se usuário já existe no Auth
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        -- 2.1 Criar usuário no Auth (Simulado via SQL é complexo, melhor usar a função se existir ou inserir direto se tiver permissão de admin db)
        -- NOTA: Inserir diretamente em auth.users requer permissão de superuser ou bypass RLS.
        -- TENTATIVA DE CRIAÇÃO VIA FUNÇÃO HELPER (se existir) OU INSERT DIRETO (arriscado sem hash).
        
        -- Como não podemos gerar o hash da senha facilmente via SQL puro sem extensão pgcrypto,
        -- Vamos usar uma abordagem de "Update Status Only" e instruir o usuário a criar a conta manualmente/recuperar senha.
        
        RAISE NOTICE '⚠️ Usuário não existe no Auth. O SQL não consegue criar senha segura sem extensões.';
        RAISE NOTICE '➡️ Ação: A farmácia será aprovada, mas o usuário precisará criar conta ou usar "Esqueci minha senha" se o email já estiver cadastrado.';
        
    ELSE
        RAISE NOTICE '✅ Usuário já existe no Auth (ID: %).', v_user_id;
    END IF;

    -- 3. Criar/Atualizar Perfil
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role, pharmacy_id, phone)
        VALUES (
            v_user_id, 
            v_email, 
            COALESCE(v_pharmacy.owner_name, v_pharmacy.name), 
            'merchant', 
            v_pharmacy.id,
            v_pharmacy.owner_phone
        )
        ON CONFLICT (id) DO UPDATE
        SET role = 'merchant',
            pharmacy_id = v_pharmacy.id;
            
        RAISE NOTICE '✅ Perfil de Merchant criado/vinculado.';
    END IF;

    -- 4. Atualizar Status da Farmácia
    UPDATE pharmacies 
    SET status = 'Aprovado' 
    WHERE id = v_pharmacy.id;

    RAISE NOTICE '✅ Farmácia % aprovada com sucesso!', v_pharmacy.name;

END $$;
