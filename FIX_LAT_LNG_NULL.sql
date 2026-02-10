-- ============================================
-- CORREÇÃO DE ERRO: Latitude/Longitude NULL
-- O formulário de parceiros não envia lat/lng, então precisamos permitir NULL.
-- ============================================

ALTER TABLE public.pharmacies 
ALTER COLUMN latitude DROP NOT NULL,
ALTER COLUMN longitude DROP NOT NULL;

-- Opcional: Definir valor padrão se necessário, mas NULL é melhor para identificar pendência.
-- Se houver triggers que dependam disso, eles devem tratar NULL.
