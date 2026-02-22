-- =============================================================================
-- MIGRATION: ADD MISSING COLUMNS TO PHARMACIES FOR PARTNER REGISTRATION
-- DESCRIPTION: Fixes "undefined_column" error in partner-register Edge Function
-- =============================================================================

BEGIN;

-- 1. ADICIONAR COLUNAS FALTANTES
ALTER TABLE public.pharmacies
    ADD COLUMN IF NOT EXISTS trade_name TEXT,
    ADD COLUMN IF NOT EXISTS legal_name TEXT,
    ADD COLUMN IF NOT EXISTS owner_last_name TEXT,
    ADD COLUMN IF NOT EXISTS owner_cpf TEXT,
    ADD COLUMN IF NOT EXISTS owner_rg TEXT,
    ADD COLUMN IF NOT EXISTS owner_rg_issuer TEXT,
    ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT 'Farmácia';

-- 2. RELAXAR CONSTRAINTS DE LOCALIZAÇÃO (IMPORTANTE)
-- O cadastro inicial pode não ter coordenadas lat/lng ainda.
-- Tornamos nullable para evitar erro de inserção se o geocoding falhar ou não for enviado.
ALTER TABLE public.pharmacies 
    ALTER COLUMN latitude DROP NOT NULL,
    ALTER COLUMN longitude DROP NOT NULL;

-- 3. GARANTIR QUE ZIP_CODE EXISTE (Algumas tabelas usam 'zip')
-- No schema principal já existe, mas por garantia:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pharmacies' AND column_name='zip_code') THEN
        ALTER TABLE public.pharmacies ADD COLUMN zip_code TEXT;
    END IF;
END $$;

-- 4. ADICIONAR COLUNAS DE CONFIGURAÇÃO DE WHATSAPP/MENSAGENS (NECESSÁRIO PARA GESTOR)
ALTER TABLE public.pharmacies
    ADD COLUMN IF NOT EXISTS auto_message_accept_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS auto_message_accept_text TEXT,
    ADD COLUMN IF NOT EXISTS auto_message_cancel_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS auto_message_cancel_text TEXT;

COMMIT;

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

SELECT '✅ COLUNAS DE REGISTRO E GESTÃO ADICIONADAS COM SUCESSO' as status;
