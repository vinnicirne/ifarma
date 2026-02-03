-- ==============================================================================
-- VINCULAR LOJISTA À FARMÁCIA
-- Data: 29/01/2026
-- ==============================================================================

-- ID do Usuário Logado (Pego do seu print)
-- 6b8410d9-495d-49a4-ab1b-f85b878ee66f

-- 1. Verifica quais farmácias existem
SELECT id, name, owner_id FROM pharmacies;

-- 2. ATUALIZE AQUI O ID DA FARMÁCIA QUE VOCÊ QUER VINCULAR
-- Vou pegar a primeira que encontrar só para garantir que funcione,
-- mas o ideal é você escolher o ID certo se tiver várias.

UPDATE pharmacies
SET owner_id = '6b8410d9-495d-49a4-ab1b-f85b878ee66f'
WHERE id = (SELECT id FROM pharmacies LIMIT 1); -- Pega a primeira farmácia.

-- Se quiser uma específica pelo nome, use:
-- UPDATE pharmacies SET owner_id = '...' WHERE name ILIKE '%Express%';

-- 3. Confirmação
SELECT 'Vínculo realizado com sucesso!' as status, name, owner_id 
FROM pharmacies 
WHERE owner_id = '6b8410d9-495d-49a4-ab1b-f85b878ee66f';
