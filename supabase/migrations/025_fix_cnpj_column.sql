-- ============================================
-- CORREÇÃO: Adicionar colunas faltantes em pharmacies
-- ============================================

-- Adicionar coluna cnpj se não existir
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- Adicionar coluna establishment_phone se não existir
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS establishment_phone VARCHAR(20);

-- Adicionar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_pharmacies_cnpj ON pharmacies(cnpj);
CREATE INDEX IF NOT EXISTS idx_pharmacies_phone ON pharmacies(establishment_phone);

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pharmacies'
ORDER BY ordinal_position;
