-- ===============================================================
-- MELHORIA NO ENDEREÇO (CAMPOS SEPARADOS)
-- ===============================================================

ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS state TEXT;

-- (Campos criados. Agora o sistema pode salvar o endereço detalhado!)
