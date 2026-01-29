-- ============================================
-- ADICIONAR COLUNA PLAN
-- ============================================

-- Coluna de plano da farmácia
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'Gratuito (15 pedidos por mês)';

-- Índice para busca
CREATE INDEX IF NOT EXISTS idx_pharmacies_plan ON pharmacies(plan);
