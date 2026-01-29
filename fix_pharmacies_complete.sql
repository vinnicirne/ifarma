-- ============================================
-- CORREÇÃO COMPLETA: Adicionar TODAS as colunas faltantes em pharmacies
-- ============================================

-- 1. CNPJ
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- 2. Telefone do estabelecimento
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS establishment_phone VARCHAR(20);

-- 3. Nome do responsável/dono
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);

-- 4. Celular do responsável
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20);

-- 5. Número de vagas (motoboys)
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS slots INTEGER DEFAULT 0;

-- 6. Complemento do endereço
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS complement VARCHAR(255);

-- 7. Status da farmácia
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pendente';

-- Adicionar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_pharmacies_cnpj ON pharmacies(cnpj);
CREATE INDEX IF NOT EXISTS idx_pharmacies_phone ON pharmacies(establishment_phone);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies(status);

-- Verificar estrutura da tabela
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pharmacies'
ORDER BY ordinal_position;

-- ✅ Execute este script completo no Supabase SQL Editor
