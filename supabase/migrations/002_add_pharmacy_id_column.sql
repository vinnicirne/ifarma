-- ============================================
-- FIX: ADICIONAR COLUNA PHARMACY_ID EM PROFILES
-- ============================================

DO $$
BEGIN
    -- Verifica se a coluna já existe para evitar erro
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pharmacy_id') THEN
        RAISE NOTICE 'Adicionando coluna pharmacy_id na tabela profiles...';
        
        ALTER TABLE profiles 
        ADD COLUMN pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Coluna adicionada com sucesso.';
    ELSE
        RAISE NOTICE 'ℹ️ A coluna pharmacy_id já existe.';
    END IF;
END $$;
