-- ============================================
-- CHECK: USUÁRIO JÁ EXISTE NO AUTH?
-- ============================================

DO $$
DECLARE
    -- Substitua pelo email que está tentando aprovar (conforme print ou teste)
    -- Vou buscar TODOS os emails de donos de farmácias pendentes para checar
    v_pharmacy RECORD;
    v_user_id UUID;
BEGIN
    FOR v_pharmacy IN SELECT id, name, owner_email FROM pharmacies WHERE status = 'Pendente' LOOP
        RAISE NOTICE 'Checando Farmácia: % (Email: %)', v_pharmacy.name, v_pharmacy.owner_email;
        
        SELECT id INTO v_user_id FROM auth.users WHERE email = v_pharmacy.owner_email;
        
        IF v_user_id IS NOT NULL THEN
            RAISE NOTICE '⚠️ ALERTA: Usuário JÁ EXISTE no Auth (ID: %)!', v_user_id;
            RAISE NOTICE '   Isso causa erro na Edge Function que tenta criar o usuário novamente.';
        ELSE
            RAISE NOTICE '✅ Email limpo. Edge Function deveria funcionar (se configurada corretamente).';
        END IF;
    END LOOP;
END $$;
