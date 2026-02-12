-- ============================================
-- CORREÇÃO CRÍTICA: POLÍTICAS RLS PARA device_tokens
-- Data: 2026-02-12
-- Problema: RLS habilitado sem políticas bloqueia acesso aos tokens
-- Impacto: Notificações push não são enviadas (erro 403)
-- ============================================

-- REMOVER POLÍTICAS ANTIGAS (SE EXISTIREM)
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios tokens" ON device_tokens;
DROP POLICY IF EXISTS "Usuários podem registrar tokens" ON device_tokens;
DROP POLICY IF EXISTS "Usuários podem atualizar tokens" ON device_tokens;
DROP POLICY IF EXISTS "Usuários podem deletar tokens" ON device_tokens;
DROP POLICY IF EXISTS "Service role pode ler tokens" ON device_tokens;

-- ============================================
-- POLÍTICAS RLS - DEVICE_TOKENS
-- ============================================

-- 1. USUÁRIOS PODEM INSERIR SEUS PRÓPRIOS TOKENS
CREATE POLICY "Usuários podem registrar tokens" ON device_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. USUÁRIOS PODEM ATUALIZAR SEUS PRÓPRIOS TOKENS
CREATE POLICY "Usuários podem atualizar tokens" ON device_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. USUÁRIOS PODEM DELETAR SEUS PRÓPRIOS TOKENS
CREATE POLICY "Usuários podem deletar tokens" ON device_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- 4. LEITURA DE TOKENS
-- Permite:
-- - Usuários lerem seus próprios tokens
-- - Edge Functions (service_role) lerem todos os tokens para envio de push
CREATE POLICY "Leitura de tokens" ON device_tokens
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'device_tokens'
ORDER BY policyname;

-- Testar inserção (execute como usuário autenticado)
-- INSERT INTO device_tokens (user_id, token, device_type)
-- VALUES (auth.uid(), 'test_token_' || gen_random_uuid(), 'web');

-- Testar leitura (execute como usuário autenticado)
-- SELECT * FROM device_tokens WHERE user_id = auth.uid();
