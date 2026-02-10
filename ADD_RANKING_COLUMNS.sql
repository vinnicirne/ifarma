-- ============================================
-- PREPARAR BANCO PARA RANQUEAMENTO INTELIGENTE (ALGORITMO IFOOD)
-- Adiciona colunas para SLA, Tempo de Entrega e Patrocínio
-- ============================================

ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS sla_score numeric default 100, -- Score de performance (0-100)
ADD COLUMN IF NOT EXISTS delivery_time_min integer default 30, -- Tempo mínimo estimado (min)
ADD COLUMN IF NOT EXISTS delivery_time_max integer default 60, -- Tempo máximo estimado (min)
ADD COLUMN IF NOT EXISTS is_sponsored boolean default false; -- Loja patrocinada (Ads)

-- Índices para ajudar em queries futuras
CREATE INDEX IF NOT EXISTS idx_pharmacies_sla ON public.pharmacies(sla_score);
CREATE INDEX IF NOT EXISTS idx_pharmacies_sponsored ON public.pharmacies(is_sponsored);
