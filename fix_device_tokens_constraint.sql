-- ============================================
-- CORREÇÃO: Constraint UNIQUE em device_tokens
-- Problema: UPSERT falha porque não existe UNIQUE (user_id, token)
-- Erro: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- ============================================

-- PASSO 1: Remover tokens duplicados (se existirem)
-- Manter apenas o registro mais recente de cada combinação (user_id, token)
DELETE FROM device_tokens a
USING device_tokens b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.token = b.token;

-- PASSO 2: Adicionar constraint UNIQUE para permitir UPSERT
ALTER TABLE device_tokens
ADD CONSTRAINT device_tokens_user_id_token_unique
UNIQUE (user_id, token);

-- PASSO 3: Verificar se a constraint foi criada
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'device_tokens'::regclass
  AND conname = 'device_tokens_user_id_token_unique';

-- PASSO 4: Testar se há tokens duplicados restantes
SELECT user_id, token, COUNT(*) as count
FROM device_tokens
GROUP BY user_id, token
HAVING COUNT(*) > 1;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Passo 1: Duplicatas removidas
-- Passo 2: Constraint criada com sucesso
-- Passo 3: Deve retornar 1 linha mostrando a constraint
-- Passo 4: Deve retornar 0 linhas (sem duplicatas)
--
-- Após executar este script:
-- ✅ UPSERT com on_conflict='user_id,token' funcionará
-- ✅ Não haverá mais erro 400 Bad Request
-- ✅ Tokens de notificação serão salvos corretamente
-- ============================================

