-- ============================================
-- MARCAR FARMÁCIAS COMO DESTAQUE (PATROCINADAS)
-- ============================================

-- Opção 1: Marcar TODAS as farmácias como destaque
UPDATE pharmacies 
SET is_featured = true 
WHERE status = 'Aprovado';

-- Opção 2: Marcar apenas as 3 primeiras como destaque (mais realista)
-- UPDATE pharmacies 
-- SET is_featured = true 
-- WHERE id IN (
--     SELECT id FROM pharmacies 
--     WHERE status = 'Aprovado' 
--     ORDER BY created_at ASC 
--     LIMIT 3
-- );

-- Verificar resultado
SELECT id, name, status, is_featured, plan FROM pharmacies WHERE status = 'Aprovado';
