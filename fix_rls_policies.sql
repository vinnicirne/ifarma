-- ============================================
-- CORREÇÃO 1: Políticas RLS para Motoboys
-- ============================================

-- 1. Remover políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Merchants podem criar motoboys" ON profiles;
DROP POLICY IF EXISTS "Admins podem inserir perfis" ON profiles;

-- 2. Criar política para ADMINS inserirem qualquer perfil
CREATE POLICY "Admins podem inserir perfis" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 3. Criar política para MERCHANTS criarem motoboys
CREATE POLICY "Merchants podem criar motoboys" ON profiles
    FOR INSERT WITH CHECK (
        role = 'motoboy' AND
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('merchant', 'admin')
        )
    );

-- 4. Permitir que usuários atualizem seu próprio perfil
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar próprio perfil" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- 5. Permitir que admins atualizem qualquer perfil
DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil" ON profiles;
CREATE POLICY "Admins podem atualizar qualquer perfil" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 6. Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 7. Testar inserção de motoboy (simular merchant)
-- NOTA: Execute isso depois de fazer login como merchant
-- INSERT INTO profiles (id, email, full_name, role, pharmacy_id, is_active, is_online)
-- VALUES (
--     'UUID-DO-AUTH-USER',
--     'teste@exemplo.com',
--     'Motoboy Teste',
--     'motoboy',
--     'UUID-DA-FARMACIA',
--     true,
--     false
-- );
