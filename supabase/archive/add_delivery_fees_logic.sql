-- ===============================================================
-- IMPLEMENTAÇÃO DE TAXAS DE ENTREGA DINÂMICAS (v1.5)
-- Objetivo: Suporte a Taxa por KM, Taxa Fixa e Regras de Frete Grátis
-- ===============================================================

-- 1. ESTRUTURA BASE DE TAXAS
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS delivery_fee_type TEXT DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS delivery_fee_fixed DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee_per_km DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_free_min_km DECIMAL(10, 2) DEFAULT 0, -- Raio de frete grátis (ex: até 2km é grátis)
ADD COLUMN IF NOT EXISTS delivery_free_min_value DECIMAL(10, 2) DEFAULT 0, -- Valor mínimo de pedido p/ frete grátis
ADD COLUMN IF NOT EXISTS delivery_max_km DECIMAL(10, 2) DEFAULT 15; -- Raio máximo de operação da farmácia

-- Atualizar/Adicionar constraint para suportar 'range'
ALTER TABLE public.pharmacies DROP CONSTRAINT IF EXISTS pharmacies_delivery_fee_type_check;
ALTER TABLE public.pharmacies ADD CONSTRAINT pharmacies_delivery_fee_type_check 
CHECK (delivery_fee_type IN ('fixed', 'km', 'region', 'range'));

-- 2. ADICIONAR COLUNA DE AUDITORIA NA TABELA DE PEDIDOS
-- Isso garante que saibamos quanto foi cobrado de frete mesmo que a farmácia mude suas taxas depois.
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0;

-- 3. ADICIONAR SUPORTE A FAIXAS DE ENTREGA (ESTILO IFOOD)
ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS delivery_ranges JSONB DEFAULT '[]';
-- Comentário: Armazena faixas como [{max_km: 2, fee: 4.99}, {max_km: 5, fee: 9.99}]

-- 4. HORÁRIOS DETALHADOS (DIA A DIA)
ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '[]';
-- Estrutura: [{"day": 0, "open": "08:00", "close": "18:00", "closed": false}, ...]

-- Comentário de Sucesso
-- Estrutura para Horários Granulares e Taxas iFood Style concluída.
