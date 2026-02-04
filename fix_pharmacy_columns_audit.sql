-- ===============================================================
-- AUDITORIA E CORREÇÃO DE COLUNAS (VERSÃO LIMPA)
-- ===============================================================

ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 1) DEFAULT 5.0;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
