-- ============================================
-- VERIFICAÇÃO: Políticas RLS para device_tokens
-- Execute este SQL para verificar quais políticas existem
-- ============================================

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'INSERT' THEN 'Permite INSERT'
        WHEN cmd = 'UPDATE' THEN 'Permite UPDATE'
        WHEN cmd = 'DELETE' THEN 'Permite DELETE'
        WHEN cmd = 'SELECT' THEN 'Permite SELECT'
        ELSE 'Outros'
    END as descricao
FROM pg_policies 
WHERE tablename = 'device_tokens'
ORDER BY cmd, policyname;

-- ============================================
-- RESULTADO ESPERADO: 4 políticas
-- ============================================
-- 1. "Usuários podem registrar tokens" (INSERT)
-- 2. "Usuários podem atualizar tokens" (UPDATE)
-- 3. "Usuários podem deletar tokens" (DELETE)
-- 4. "Leitura de tokens" (SELECT)
