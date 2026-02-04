-- ===============================================================
-- ÚLTIMA CORREÇÃO: COLUNAS DE CONTROLE DE PEDIDOS
-- ===============================================================

-- Adicionar colunas faltantes na tabela de farmácias
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS free_orders_remaining INTEGER DEFAULT 0;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0;

-- (Agora o contador de pedidos grátis vai funcionar!)
