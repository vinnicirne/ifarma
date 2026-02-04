-- ===============================================================
-- CORREÇÃO FINAL DA FARMÁCIA
-- ===============================================================

-- 1. Cria a coluna que está faltando (e causando o erro do Trigger)
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Agora sim, força a aprovação (vai funcionar pois a coluna existe)
UPDATE pharmacies 
SET status = 'Aprovado'
WHERE id = '6e6d9b34-39a0-40cf-87ac-e1f68ba787c8'; 

-- (Verifique o Dashboard. Deve aparecer "Success" agora)
